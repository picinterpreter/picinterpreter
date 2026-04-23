import { db } from '@/db'
import { enqueueOutboxItem, syncService } from '@/services/sync-service'
import type { Expression } from '@/types'

export interface RecordExpressionInput {
  sessionId: string
  direction: 'express' | 'receive'
  pictogramIds: string[]
  pictogramLabels: string[]
  candidateSentences: string[]
  selectedSentence: string | null
  inputText?: string
}

export async function createExpression(input: RecordExpressionInput): Promise<Expression> {
  const now = Date.now()
  const record: Expression = {
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    direction: input.direction,
    pictogramIds: input.pictogramIds,
    pictogramLabels: input.pictogramLabels,
    candidateSentences: input.candidateSentences,
    selectedSentence: input.selectedSentence,
    inputText: input.inputText,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    serverVersion: 0,
    lastModifiedByDeviceId: null,
    isFavorite: false,
  }

  await db.transaction('rw', db.expressions, db.syncOutbox, async () => {
    await db.expressions.add(record)
    await enqueueOutboxItem({
      entityType: 'expression',
      operation: 'upsert',
      recordId: record.id,
      baseVersion: record.serverVersion ?? 0,
      payload: record,
    })
  })

  void syncService.scheduleSync()
  return record
}

export async function updateExpressionFavorite(id: string, isFavorite: boolean): Promise<void> {
  const existing = await db.expressions.get(id)
  if (!existing) return

  const nextRecord: Expression = {
    ...existing,
    isFavorite,
    updatedAt: Date.now(),
  }

  await db.transaction('rw', db.expressions, db.syncOutbox, async () => {
    await db.expressions.put(nextRecord)
    await enqueueOutboxItem({
      entityType: 'expression',
      operation: 'upsert',
      recordId: nextRecord.id,
      baseVersion: existing.serverVersion ?? 0,
      payload: nextRecord,
    })
  })

  void syncService.scheduleSync()
}

export async function deleteExpression(id: string): Promise<void> {
  const existing = await db.expressions.get(id)
  if (!existing) return

  await db.transaction('rw', db.expressions, db.syncOutbox, async () => {
    await db.expressions.delete(id)
    await enqueueOutboxItem({
      entityType: 'expression',
      operation: 'delete',
      recordId: id,
      baseVersion: existing.serverVersion ?? 0,
      payload: null,
    })
  })

  void syncService.scheduleSync()
}

export async function clearExpressions(): Promise<void> {
  const all = await db.expressions.toArray()

  await db.transaction('rw', db.expressions, db.syncOutbox, async () => {
    await db.expressions.clear()
    for (const expr of all) {
      await enqueueOutboxItem({
        entityType: 'expression',
        operation: 'delete',
        recordId: expr.id,
        baseVersion: expr.serverVersion ?? 0,
        payload: null,
      })
    }
  })

  void syncService.scheduleSync()
}
