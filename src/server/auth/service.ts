import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import {
  Prisma,
  SyncEntityType as PrismaSyncEntityType,
  SyncOperation as PrismaSyncOperation,
  UserStatus,
  type User,
} from '@prisma/client'
import { cookies } from 'next/headers'
import type {
  AuthenticatedUserSummary,
  LocalDataAction,
  LoginRequest,
  RegisterRequest,
} from '@/types'
import { ensureDatabaseSchema, getPrismaClient } from '@/server/db/prisma'
import { DEVICE_COOKIE_NAME } from '@/server/sync/service'

const scrypt = promisify(scryptCallback)

export const SESSION_COOKIE_NAME = 'picinterpreter_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/
const PHONE_PATTERN = /^1\d{10}$/
const PASSWORD_MIN_LENGTH = 8
const SESSION_TOKEN_BYTES = 32
const SCRYPT_KEYLEN = 64

interface SessionUser {
  id: string
  status: UserStatus
  passwordCredential: {
    username: string
    normalizedPhone: string
  } | null
}

interface SessionRecord {
  id: string
  userId: string
  expiresAt: Date
  revokedAt: Date | null
  user: SessionUser
}

interface RegisterInput {
  username: string
  normalizedUsername: string
  phone: string
  normalizedPhone: string
  password: string
  localDataAction: LocalDataAction
}

interface LoginInput {
  username: string
  normalizedUsername: string
  password: string
  localDataAction: LocalDataAction
}

interface AuthResult {
  token: string
  user: AuthenticatedUserSummary
}

interface CurrentDevice {
  id: string
  userId: string
  user: User
}

interface MutableCookieResponse {
  cookies: {
    set: (name: string, value: string, options: {
      httpOnly: boolean
      sameSite: 'lax'
      secure: boolean
      path: string
      maxAge: number
    }) => void
  }
}

export class AuthError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export function validateRegisterInput(input: RegisterRequest): RegisterInput {
  const username = input.username?.trim() ?? ''
  const normalizedUsername = normalizeUsername(username)
  if (!USERNAME_PATTERN.test(username)) {
    throw new AuthError('用户名需为 3-20 位字母、数字或下划线', 400)
  }

  const password = input.password ?? ''
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AuthError('密码至少需要 8 位', 400)
  }

  const normalizedPhone = normalizePhone(input.phone ?? '')
  if (!PHONE_PATTERN.test(normalizedPhone)) {
    throw new AuthError('请输入有效的中国大陆 11 位手机号', 400)
  }

  return {
    username,
    normalizedUsername,
    phone: normalizedPhone,
    normalizedPhone,
    password,
    localDataAction: input.localDataAction === 'discard' ? 'discard' : 'merge',
  }
}

export function validateLoginInput(input: LoginRequest): LoginInput {
  const username = input.username?.trim() ?? ''
  const normalizedUsername = normalizeUsername(username)
  if (!USERNAME_PATTERN.test(username)) {
    throw new AuthError('请输入有效的用户名', 400)
  }

  const password = input.password ?? ''
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AuthError('请输入有效的密码', 400)
  }

  if (input.localDataAction !== 'merge' && input.localDataAction !== 'discard') {
    throw new AuthError('localDataAction 必须为 merge 或 discard', 400)
  }

  return {
    username,
    normalizedUsername,
    password,
    localDataAction: input.localDataAction,
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN) as Buffer
  return `scrypt:${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, digest] = storedHash.split(':')
  if (algorithm !== 'scrypt' || !salt || !digest) return false

  const derived = await scrypt(password, salt, Buffer.from(digest, 'hex').length) as Buffer
  const actual = Buffer.from(digest, 'hex')
  if (derived.length !== actual.length) return false
  return timingSafeEqual(derived, actual)
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export function buildAuthenticatedUserSummary(input: SessionUser): AuthenticatedUserSummary {
  return {
    id: input.id,
    username: input.passwordCredential?.username ?? '未命名用户',
    phoneMasked: maskPhone(input.passwordCredential?.normalizedPhone ?? ''),
  }
}

export async function getCurrentDevice(): Promise<CurrentDevice | null> {
  await ensureDatabaseSchema()
  const cookieStore = await cookies()
  const deviceId = cookieStore.get(DEVICE_COOKIE_NAME)?.value
  if (!deviceId) return null

  const prisma = getPrismaClient()
  return prisma.device.findUnique({
    where: { id: deviceId },
    include: { user: true },
  })
}

export async function registerUser(input: RegisterRequest): Promise<AuthResult> {
  await ensureDatabaseSchema()
  const prisma = getPrismaClient()
  const valid = validateRegisterInput(input)
  const passwordHash = await hashPassword(valid.password)
  const currentDevice = await getCurrentDevice()

  return prisma.$transaction(async (tx) => {
    await ensureCredentialUniqueness(tx, valid.normalizedUsername, valid.normalizedPhone)

    if (currentDevice && (!currentDevice.user.isAnonymous || currentDevice.user.status !== UserStatus.ACTIVE)) {
      throw new AuthError('当前设备已绑定正式账号，无法再次注册', 409)
    }

    const user = await tx.user.create({
      data: {
        isAnonymous: false,
        passwordCredential: {
          create: {
            username: valid.username,
            normalizedUsername: valid.normalizedUsername,
            phone: valid.phone,
            normalizedPhone: valid.normalizedPhone,
            passwordHash,
          },
        },
      },
      include: {
        passwordCredential: true,
      },
    })

    if (valid.localDataAction === 'merge' && currentDevice?.user.isAnonymous) {
      await mergeAnonymousUserIntoUserTx(tx, currentDevice.userId, user.id, currentDevice.id)
    } else if (currentDevice && currentDevice.userId !== user.id) {
      await tx.device.update({
        where: { id: currentDevice.id },
        data: { userId: user.id, lastSeenAt: new Date() },
      })
    }

    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const session = await createUserSessionTx(tx, user.id, currentDevice?.id ?? null)

    return {
      token: session.token,
      user: buildAuthenticatedUserSummary(user),
    }
  })
}

export async function loginUser(input: LoginRequest): Promise<AuthResult> {
  await ensureDatabaseSchema()
  const prisma = getPrismaClient()
  const valid = validateLoginInput(input)
  const currentDevice = await getCurrentDevice()

  const credential = await prisma.passwordCredential.findUnique({
    where: { normalizedUsername: valid.normalizedUsername },
    include: { user: true },
  })

  if (!credential) {
    throw new AuthError('用户名或密码错误', 401)
  }

  const passwordOk = await verifyPassword(valid.password, credential.passwordHash)
  if (!passwordOk) {
    throw new AuthError('用户名或密码错误', 401)
  }

  if (credential.user.status !== UserStatus.ACTIVE) {
    throw new AuthError('当前账号不可登录', 403)
  }

  return prisma.$transaction(async (tx) => {
    if (currentDevice) {
      if (valid.localDataAction === 'merge' && currentDevice.user.isAnonymous) {
        await mergeAnonymousUserIntoUserTx(tx, currentDevice.userId, credential.userId, currentDevice.id)
      } else if (currentDevice.userId !== credential.userId) {
        await tx.device.update({
          where: { id: currentDevice.id },
          data: { userId: credential.userId, lastSeenAt: new Date() },
        })
      }
    }

    await tx.user.update({
      where: { id: credential.userId },
      data: { lastLoginAt: new Date() },
    })

    const session = await createUserSessionTx(tx, credential.userId, currentDevice?.id ?? null)
    return {
      token: session.token,
      user: buildAuthenticatedUserSummary({
        id: credential.user.id,
        status: credential.user.status,
        passwordCredential: {
          username: credential.username,
          normalizedPhone: credential.normalizedPhone,
        },
      }),
    }
  })
}

export async function logoutCurrentSession(): Promise<void> {
  await ensureDatabaseSchema()
  const session = await getOptionalAuthSession()
  if (!session) return

  const prisma = getPrismaClient()
  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  })
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUserSummary | null> {
  const session = await getOptionalAuthSession()
  if (!session) return null
  return buildAuthenticatedUserSummary(session.user)
}

export async function requireAuthSession(): Promise<{ sessionId: string; user: AuthenticatedUserSummary; userId: string }> {
  const session = await getOptionalAuthSession()
  if (!session) {
    throw new AuthError('未登录', 401)
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    user: buildAuthenticatedUserSummary(session.user),
  }
}

export async function getOptionalAuthSession(): Promise<SessionRecord | null> {
  await ensureDatabaseSchema()
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const prisma = getPrismaClient()
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          status: true,
          passwordCredential: {
            select: {
              username: true,
              normalizedPhone: true,
            },
          },
        },
      },
    },
  })

  if (!session) return null
  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null
  }
  if (session.user.status !== UserStatus.ACTIVE) {
    return null
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  })

  return session
}

export function applySessionCookie(response: MutableCookieResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(response: MutableCookieResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

async function ensureCredentialUniqueness(
  tx: Prisma.TransactionClient,
  normalizedUsername: string,
  normalizedPhone: string,
): Promise<void> {
  const existing = await tx.passwordCredential.findFirst({
    where: {
      OR: [
        { normalizedUsername },
        { normalizedPhone },
      ],
    },
    select: {
      normalizedUsername: true,
      normalizedPhone: true,
    },
  })

  if (!existing) return
  if (existing.normalizedUsername === normalizedUsername) {
    throw new AuthError('用户名已被占用', 409)
  }
  throw new AuthError('手机号已被占用', 409)
}

async function createUserSessionTx(
  tx: Prisma.TransactionClient,
  userId: string,
  deviceId: string | null,
): Promise<{ id: string; token: string }> {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString('hex')
  const session = await tx.userSession.create({
    data: {
      userId,
      deviceId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
    select: { id: true },
  })

  return { id: session.id, token }
}

async function mergeAnonymousUserIntoUserTx(
  tx: Prisma.TransactionClient,
  anonymousUserId: string,
  targetUserId: string,
  deviceId: string,
): Promise<void> {
  if (anonymousUserId === targetUserId) {
    await tx.device.update({
      where: { id: deviceId },
      data: { userId: targetUserId, lastSeenAt: new Date() },
    })
    return
  }

  const anonymousUser = await tx.user.findUnique({
    where: { id: anonymousUserId },
    select: {
      id: true,
      isAnonymous: true,
      status: true,
    },
  })

  if (!anonymousUser || !anonymousUser.isAnonymous || anonymousUser.status !== UserStatus.ACTIVE) {
    throw new AuthError('当前匿名数据不可合并', 409)
  }

  const [expressions, savedPhrases] = await Promise.all([
    tx.expressionRecord.findMany({
      where: { userId: anonymousUserId },
      select: { id: true, deletedAt: true, version: true },
    }),
    tx.savedPhraseRecord.findMany({
      where: { userId: anonymousUserId },
      select: { id: true, deletedAt: true, version: true },
    }),
  ])

  if (expressions.length > 0) {
    await tx.expressionRecord.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: targetUserId },
    })
    await tx.syncChange.createMany({
      data: expressions.map((record) => ({
        userId: targetUserId,
        entityType: PrismaSyncEntityType.EXPRESSION,
        recordId: record.id,
        operation: record.deletedAt ? PrismaSyncOperation.DELETE : PrismaSyncOperation.UPSERT,
        recordVersion: record.version,
        deviceId,
      })),
    })
  }

  if (savedPhrases.length > 0) {
    await tx.savedPhraseRecord.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: targetUserId },
    })
    await tx.syncChange.createMany({
      data: savedPhrases.map((record) => ({
        userId: targetUserId,
        entityType: PrismaSyncEntityType.SAVED_PHRASE,
        recordId: record.id,
        operation: record.deletedAt ? PrismaSyncOperation.DELETE : PrismaSyncOperation.UPSERT,
        recordVersion: record.version,
        deviceId,
      })),
    })
  }

  await tx.device.update({
    where: { id: deviceId },
    data: { userId: targetUserId, lastSeenAt: new Date() },
  })

  await tx.user.update({
    where: { id: anonymousUserId },
    data: {
      status: UserStatus.MERGED,
      mergedIntoUserId: targetUserId,
    },
  })
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D+/g, '')
}
