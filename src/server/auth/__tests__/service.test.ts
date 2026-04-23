import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoginRequest, RegisterRequest } from '@/types'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/server/db/prisma', () => ({
  ensureDatabaseSchema: vi.fn(async () => undefined),
  getPrismaClient: vi.fn(),
}))

vi.mock('@/server/sync/service', () => ({
  DEVICE_COOKIE_NAME: 'picinterpreter_device',
}))

const {
  AuthError,
  hashPassword,
  hashSessionToken,
  maskPhone,
  validateLoginInput,
  validateRegisterInput,
  verifyPassword,
} = await import('../service')

describe('auth validation helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes valid register input', () => {
    const input: RegisterRequest = {
      username: 'Test_User',
      password: 'password123',
      phone: '138 0013 8000',
    }

    expect(validateRegisterInput(input)).toEqual({
      username: 'Test_User',
      normalizedUsername: 'test_user',
      password: 'password123',
      phone: '13800138000',
      normalizedPhone: '13800138000',
      localDataAction: 'merge',
    })
  })

  it('rejects invalid register username', () => {
    const input: RegisterRequest = {
      username: 'ab',
      password: 'password123',
      phone: '13800138000',
    }

    expect(() => validateRegisterInput(input)).toThrowError(AuthError)
  })

  it('rejects invalid mainland phone numbers', () => {
    const input: RegisterRequest = {
      username: 'valid_user',
      password: 'password123',
      phone: '2800138000',
    }

    expect(() => validateRegisterInput(input)).toThrow('中国大陆')
  })

  it('rejects invalid login local data action', () => {
    const input = {
      username: 'valid_user',
      password: 'password123',
      localDataAction: 'noop',
    } as unknown as LoginRequest

    expect(() => validateLoginInput(input)).toThrow('localDataAction')
  })
})

describe('auth crypto helpers', () => {
  it('hashes and verifies passwords', async () => {
    const hashed = await hashPassword('super-secret')
    expect(hashed).not.toContain('super-secret')
    await expect(verifyPassword('super-secret', hashed)).resolves.toBe(true)
    await expect(verifyPassword('wrong-password', hashed)).resolves.toBe(false)
  })

  it('hashes session tokens deterministically', () => {
    expect(hashSessionToken('abc')).toBe(hashSessionToken('abc'))
    expect(hashSessionToken('abc')).not.toBe(hashSessionToken('def'))
  })

  it('masks phone numbers with middle digits hidden', () => {
    expect(maskPhone('13800138000')).toBe('138****8000')
  })
})
