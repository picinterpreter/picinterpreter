import { db } from '@/db'
import { enqueueOutboxItem, syncService } from '@/services/sync-service'
import type { SavedPhrase } from '@/types'

interface SavedPhraseDraft {
  id?: string
  sentence: string
  pictogramIds: string[]
  usageCount?: number
  lastUsedAt?: number
}

export async function addSavedPhrase(draft: SavedPhraseDraft): Promise<SavedPhrase> {
  const now = Date.now()
  const record: SavedPhrase = {
    id: draft.id ?? crypto.randomUUID(),
    sentence: draft.sentence,
    pictogramIds: draft.pictogramIds,
    usageCount: draft.usageCount ?? 0,
    createdAt: now,
    lastUsedAt: draft.lastUsedAt ?? now,
    updatedAt: now,
    deletedAt: null,
    serverVersion: 0,
    lastModifiedByDeviceId: null,
  }

  await db.transaction('rw', db.savedPhrases, db.syncOutbox, async () => {
    await db.savedPhrases.add(record)
    await enqueueOutboxItem({
      entityType: 'saved_phrase',
      operation: 'upsert',
      recordId: record.id,
      baseVersion: record.serverVersion ?? 0,
      payload: record,
    })
  })

  void syncService.scheduleSync()
  return record
}

export async function addSavedPhraseIfMissing(
  sentence: string,
  pictogramIds: string[],
): Promise<boolean> {
  const exists = await db.savedPhrases.filter((phrase) => phrase.sentence === sentence).first()
  if (exists) return false
  await addSavedPhrase({ sentence, pictogramIds })
  return true
}

export async function updateSavedPhrase(
  id: string,
  changes: Partial<Pick<SavedPhrase, 'sentence' | 'pictogramIds' | 'usageCount' | 'lastUsedAt'>>,
): Promise<void> {
  const existing = await db.savedPhrases.get(id)
  if (!existing) return

  const nextRecord: SavedPhrase = {
    ...existing,
    ...changes,
    updatedAt: Date.now(),
  }

  await db.transaction('rw', db.savedPhrases, db.syncOutbox, async () => {
    await db.savedPhrases.put(nextRecord)
    await enqueueOutboxItem({
      entityType: 'saved_phrase',
      operation: 'upsert',
      recordId: nextRecord.id,
      baseVersion: existing.serverVersion ?? 0,
      payload: nextRecord,
    })
  })

  void syncService.scheduleSync()
}

export async function deleteSavedPhrase(id: string): Promise<void> {
  const existing = await db.savedPhrases.get(id)
  if (!existing) return

  await db.transaction('rw', db.savedPhrases, db.syncOutbox, async () => {
    await db.savedPhrases.delete(id)
    await enqueueOutboxItem({
      entityType: 'saved_phrase',
      operation: 'delete',
      recordId: id,
      baseVersion: existing.serverVersion ?? 0,
      payload: null,
    })
  })

  void syncService.scheduleSync()
}

export async function importSavedPhrases(phrases: SavedPhrase[]): Promise<void> {
  const records = phrases.map<SavedPhrase>((phrase) => ({
    ...phrase,
    createdAt: phrase.createdAt ?? phrase.lastUsedAt,
    updatedAt: phrase.updatedAt ?? Date.now(),
    deletedAt: null,
    serverVersion: phrase.serverVersion ?? 0,
    lastModifiedByDeviceId: phrase.lastModifiedByDeviceId ?? null,
  }))

  await db.transaction('rw', db.savedPhrases, db.syncOutbox, async () => {
    await db.savedPhrases.bulkAdd(records)
    for (const record of records) {
      await enqueueOutboxItem({
        entityType: 'saved_phrase',
        operation: 'upsert',
        recordId: record.id,
        baseVersion: record.serverVersion ?? 0,
        payload: record,
      })
    }
  })

  void syncService.scheduleSync()
}
