import { createHash } from 'node:crypto'
import {
  Prisma,
  SyncEntityType as PrismaSyncEntityType,
  SyncOperation as PrismaSyncOperation,
  type ExpressionRecord,
  type SavedPhraseRecord,
} from '@prisma/client'
import { ensureDatabaseSchema, getPrismaClient } from '@/server/db/prisma'
import type {
  BootstrapRequest,
  BootstrapResponse,
  Expression,
  SavedPhrase,
  SyncEntityType,
  SyncMutation,
  SyncPullChange,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  SyncPushResult,
} from '@/types'

export const DEVICE_COOKIE_NAME = 'picinterpreter_device'

const PULL_LIMIT = 200

interface DeviceContext {
  deviceId: string
  userId: string
}

export function hashInstallId(installId: string): string {
  return createHash('sha256').update(installId).digest('hex')
}

export async function bootstrapClientIdentity(
  input: BootstrapRequest,
  cookieDeviceId?: string,
): Promise<BootstrapResponse> {
  await ensureDatabaseSchema()
  const prisma = getPrismaClient()
  const installIdHash = hashInstallId(input.installId)

  const existingByCookie = cookieDeviceId
    ? await prisma.device.findUnique({
        where: { id: cookieDeviceId },
        include: { user: true },
      })
    : null

  const existing = existingByCookie
    ?? await prisma.device.findUnique({
      where: { installIdHash },
      include: { user: true },
    })

  if (existing) {
    const updated = await prisma.device.update({
      where: { id: existing.id },
      data: {
        platform: input.platform,
        appVersion: input.appVersion,
        lastSeenAt: new Date(),
      },
      include: { user: true },
    })

    return {
      deviceId: updated.id,
      userId: updated.userId,
      isAnonymous: updated.user.isAnonymous,
      lastPulledChangeId: 0,
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        isAnonymous: true,
      },
    })

    const device = await tx.device.create({
      data: {
        userId: user.id,
        installIdHash,
        platform: input.platform,
        appVersion: input.appVersion,
        lastSeenAt: new Date(),
      },
    })

    return { user, device }
  })

  return {
    deviceId: created.device.id,
    userId: created.user.id,
    isAnonymous: created.user.isAnonymous,
    lastPulledChangeId: 0,
  }
}

export async function pushClientMutations(
  deviceId: string,
  request: SyncPushRequest,
): Promise<SyncPushResponse> {
  await ensureDatabaseSchema()
  const prisma = getPrismaClient()
  const context = await requireDeviceContext(deviceId)

  const results = await prisma.$transaction(async (tx) => {
    const applied: SyncPushResult[] = []

    for (const mutation of request.mutations) {
      applied.push(await applyMutation(tx, context, mutation))
    }

    return applied
  })

  return { results }
}

export async function pullClientChanges(
  deviceId: string,
  afterChangeId: number,
): Promise<SyncPullResponse> {
  await ensureDatabaseSchema()
  const prisma = getPrismaClient()
  const context = await requireDeviceContext(deviceId)

  const rawChanges = await prisma.syncChange.findMany({
    where: {
      userId: context.userId,
      id: { gt: afterChangeId },
    },
    orderBy: { id: 'asc' },
    take: PULL_LIMIT,
  })

  if (rawChanges.length === 0) {
    return {
      changes: [],
      nextChangeId: afterChangeId,
      hasMore: false,
    }
  }

  const latestByRecord = new Map<string, typeof rawChanges[number]>()
  for (const change of rawChanges) {
    latestByRecord.set(`${change.entityType}:${change.recordId}`, change)
  }

  const compacted = [...latestByRecord.values()].sort((a, b) => a.id - b.id)

  const expressionIds = compacted
    .filter((change) => change.entityType === PrismaSyncEntityType.EXPRESSION)
    .map((change) => change.recordId)
  const savedPhraseIds = compacted
    .filter((change) => change.entityType === PrismaSyncEntityType.SAVED_PHRASE)
    .map((change) => change.recordId)

  const [expressions, savedPhrases] = await Promise.all([
    expressionIds.length > 0
      ? prisma.expressionRecord.findMany({
          where: { id: { in: expressionIds }, userId: context.userId },
        })
      : Promise.resolve([] as ExpressionRecord[]),
    savedPhraseIds.length > 0
      ? prisma.savedPhraseRecord.findMany({
          where: { id: { in: savedPhraseIds }, userId: context.userId },
        })
      : Promise.resolve([] as SavedPhraseRecord[]),
  ])

  const expressionMap = new Map(expressions.map((record) => [record.id, record]))
  const savedPhraseMap = new Map(savedPhrases.map((record) => [record.id, record]))

  const changes: SyncPullChange[] = compacted.map((change) => {
    const entityType = mapEntityTypeFromPrisma(change.entityType)
    if (change.entityType === PrismaSyncEntityType.EXPRESSION) {
      return {
        changeId: change.id,
        entityType,
        operation: mapOperationFromPrisma(change.operation),
        recordId: change.recordId,
        recordVersion: change.recordVersion,
        record: serializeExpressionRecord(expressionMap.get(change.recordId) ?? null),
      }
    }

    return {
      changeId: change.id,
      entityType,
      operation: mapOperationFromPrisma(change.operation),
      recordId: change.recordId,
      recordVersion: change.recordVersion,
      record: serializeSavedPhraseRecord(savedPhraseMap.get(change.recordId) ?? null),
    }
  })

  return {
    changes,
    nextChangeId: rawChanges[rawChanges.length - 1]?.id ?? afterChangeId,
    hasMore: rawChanges.length === PULL_LIMIT,
  }
}

async function requireDeviceContext(deviceId: string): Promise<DeviceContext> {
  await ensureDatabaseSchema()
  const prisma = getPrismaClient()
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { id: true, userId: true },
  })

  if (!device) {
    throw new Error('Device is not registered')
  }

  return { deviceId: device.id, userId: device.userId }
}

async function applyMutation(
  tx: Prisma.TransactionClient,
  context: DeviceContext,
  mutation: SyncMutation,
): Promise<SyncPushResult> {
  if (mutation.entityType === 'expression') {
    return applyExpressionMutation(tx, context, mutation)
  }

  return applySavedPhraseMutation(tx, context, mutation)
}

async function applyExpressionMutation(
  tx: Prisma.TransactionClient,
  context: DeviceContext,
  mutation: SyncMutation,
): Promise<SyncPushResult> {
  const existing = await tx.expressionRecord.findUnique({
    where: { id: mutation.recordId },
  })
  const conflicted = existing != null
    && mutation.baseVersion != null
    && mutation.baseVersion !== existing.version

  if (mutation.operation === 'delete') {
    if (!existing) {
      return buildNoopDeleteResult(mutation, conflicted)
    }

    const updated = await tx.expressionRecord.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
        version: existing.version + 1,
        lastModifiedByDeviceId: context.deviceId,
      },
    })

    const change = await tx.syncChange.create({
      data: {
        userId: context.userId,
        entityType: PrismaSyncEntityType.EXPRESSION,
        recordId: updated.id,
        operation: PrismaSyncOperation.DELETE,
        recordVersion: updated.version,
        deviceId: context.deviceId,
      },
    })

    return {
      mutationId: mutation.mutationId,
      entityType: mutation.entityType,
      recordId: mutation.recordId,
      accepted: true,
      conflicted,
      deleted: true,
      serverVersion: updated.version,
      changeId: change.id,
      record: null,
    }
  }

  const payload = assertExpressionPayload(mutation.payload)
  const nextVersion = existing ? existing.version + 1 : 1
  const now = new Date()

  const record = await tx.expressionRecord.upsert({
    where: { id: mutation.recordId },
    create: {
      id: payload.id,
      userId: context.userId,
      sessionId: payload.sessionId,
      direction: payload.direction,
      pictogramIds: payload.pictogramIds,
      pictogramLabels: payload.pictogramLabels,
      candidateSentences: payload.candidateSentences,
      selectedSentence: payload.selectedSentence,
      inputText: payload.inputText ?? null,
      isFavorite: payload.isFavorite,
      createdAt: new Date(payload.createdAt),
      updatedAt: now,
      deletedAt: null,
      version: nextVersion,
      lastModifiedByDeviceId: context.deviceId,
    },
    update: {
      userId: context.userId,
      sessionId: payload.sessionId,
      direction: payload.direction,
      pictogramIds: payload.pictogramIds,
      pictogramLabels: payload.pictogramLabels,
      candidateSentences: payload.candidateSentences,
      selectedSentence: payload.selectedSentence,
      inputText: payload.inputText ?? null,
      isFavorite: payload.isFavorite,
      updatedAt: now,
      deletedAt: null,
      version: nextVersion,
      lastModifiedByDeviceId: context.deviceId,
    },
  })

  const change = await tx.syncChange.create({
    data: {
      userId: context.userId,
      entityType: PrismaSyncEntityType.EXPRESSION,
      recordId: record.id,
      operation: PrismaSyncOperation.UPSERT,
      recordVersion: record.version,
      deviceId: context.deviceId,
    },
  })

  return {
    mutationId: mutation.mutationId,
    entityType: mutation.entityType,
    recordId: mutation.recordId,
    accepted: true,
    conflicted,
    deleted: false,
    serverVersion: record.version,
    changeId: change.id,
    record: serializeExpressionRecord(record),
  }
}

async function applySavedPhraseMutation(
  tx: Prisma.TransactionClient,
  context: DeviceContext,
  mutation: SyncMutation,
): Promise<SyncPushResult> {
  const existing = await tx.savedPhraseRecord.findUnique({
    where: { id: mutation.recordId },
  })
  const conflicted = existing != null
    && mutation.baseVersion != null
    && mutation.baseVersion !== existing.version

  if (mutation.operation === 'delete') {
    if (!existing) {
      return buildNoopDeleteResult(mutation, conflicted)
    }

    const updated = await tx.savedPhraseRecord.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
        version: existing.version + 1,
        lastModifiedByDeviceId: context.deviceId,
      },
    })

    const change = await tx.syncChange.create({
      data: {
        userId: context.userId,
        entityType: PrismaSyncEntityType.SAVED_PHRASE,
        recordId: updated.id,
        operation: PrismaSyncOperation.DELETE,
        recordVersion: updated.version,
        deviceId: context.deviceId,
      },
    })

    return {
      mutationId: mutation.mutationId,
      entityType: mutation.entityType,
      recordId: mutation.recordId,
      accepted: true,
      conflicted,
      deleted: true,
      serverVersion: updated.version,
      changeId: change.id,
      record: null,
    }
  }

  const payload = assertSavedPhrasePayload(mutation.payload)
  const nextVersion = existing ? existing.version + 1 : 1
  const now = new Date()
  const record = await tx.savedPhraseRecord.upsert({
    where: { id: payload.id },
    create: {
      id: payload.id,
      userId: context.userId,
      sentence: payload.sentence,
      pictogramIds: payload.pictogramIds,
      usageCount: payload.usageCount,
      lastUsedAt: new Date(payload.lastUsedAt),
      createdAt: new Date(payload.createdAt ?? payload.lastUsedAt),
      updatedAt: now,
      deletedAt: null,
      version: nextVersion,
      lastModifiedByDeviceId: context.deviceId,
    },
    update: {
      userId: context.userId,
      sentence: payload.sentence,
      pictogramIds: payload.pictogramIds,
      usageCount: payload.usageCount,
      lastUsedAt: new Date(payload.lastUsedAt),
      updatedAt: now,
      deletedAt: null,
      version: nextVersion,
      lastModifiedByDeviceId: context.deviceId,
    },
  })

  const change = await tx.syncChange.create({
    data: {
      userId: context.userId,
      entityType: PrismaSyncEntityType.SAVED_PHRASE,
      recordId: record.id,
      operation: PrismaSyncOperation.UPSERT,
      recordVersion: record.version,
      deviceId: context.deviceId,
    },
  })

  return {
    mutationId: mutation.mutationId,
    entityType: mutation.entityType,
    recordId: mutation.recordId,
    accepted: true,
    conflicted,
    deleted: false,
    serverVersion: record.version,
    changeId: change.id,
    record: serializeSavedPhraseRecord(record),
  }
}

function buildNoopDeleteResult(
  mutation: SyncMutation,
  conflicted: boolean,
): SyncPushResult {
  return {
    mutationId: mutation.mutationId,
    entityType: mutation.entityType,
    recordId: mutation.recordId,
    accepted: true,
    conflicted,
    deleted: true,
    serverVersion: null,
    changeId: null,
    record: null,
  }
}

function assertExpressionPayload(payload: SyncMutation['payload']): Expression {
  if (!payload || typeof payload !== 'object' || !('sessionId' in payload)) {
    throw new Error('Invalid expression payload')
  }

  return payload as Expression
}

function assertSavedPhrasePayload(payload: SyncMutation['payload']): SavedPhrase {
  if (!payload || typeof payload !== 'object' || !('sentence' in payload)) {
    throw new Error('Invalid saved phrase payload')
  }

  return payload as SavedPhrase
}

function serializeExpressionRecord(record: ExpressionRecord | null): Expression | null {
  if (!record || record.deletedAt) return null

  return {
    id: record.id,
    sessionId: record.sessionId,
    direction: record.direction as Expression['direction'],
    pictogramIds: readStringArray(record.pictogramIds),
    pictogramLabels: readStringArray(record.pictogramLabels),
    candidateSentences: readStringArray(record.candidateSentences),
    selectedSentence: record.selectedSentence,
    inputText: record.inputText ?? undefined,
    createdAt: record.createdAt.getTime(),
    updatedAt: record.updatedAt.getTime(),
    deletedAt: null,
    serverVersion: record.version,
    lastModifiedByDeviceId: record.lastModifiedByDeviceId,
    isFavorite: record.isFavorite,
  }
}

function serializeSavedPhraseRecord(record: SavedPhraseRecord | null): SavedPhrase | null {
  if (!record || record.deletedAt) return null

  return {
    id: record.id,
    sentence: record.sentence,
    pictogramIds: readStringArray(record.pictogramIds),
    usageCount: record.usageCount,
    createdAt: record.createdAt.getTime(),
    lastUsedAt: record.lastUsedAt.getTime(),
    updatedAt: record.updatedAt.getTime(),
    deletedAt: null,
    serverVersion: record.version,
    lastModifiedByDeviceId: record.lastModifiedByDeviceId,
  }
}

function readStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function mapEntityTypeFromPrisma(value: PrismaSyncEntityType): SyncEntityType {
  return value === PrismaSyncEntityType.EXPRESSION ? 'expression' : 'saved_phrase'
}

function mapOperationFromPrisma(value: PrismaSyncOperation): 'upsert' | 'delete' {
  return value === PrismaSyncOperation.UPSERT ? 'upsert' : 'delete'
}
