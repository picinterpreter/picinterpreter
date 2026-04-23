'use client'

import { db } from '@/db'
import type {
  BootstrapRequest,
  BootstrapResponse,
  Expression,
  SavedPhrase,
  SyncMutation,
  SyncOutboxItem,
  SyncPullChange,
  SyncPullResponse,
  SyncPushResponse,
  SyncState,
} from '@/types'

const SYNC_STATE_ID = 'main'
const INSTALL_ID_STORAGE_KEY = 'tuyujia_install_id'
const OUTBOX_BATCH_SIZE = 50

class SyncService {
  private bootstrapPromise: Promise<SyncState | null> | null = null
  private syncPromise: Promise<void> | null = null
  private started = false

  start(): void {
    if (this.started || typeof window === 'undefined') return
    this.started = true

    window.addEventListener('online', this.handleOnline)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    void this.scheduleSync()
  }

  stop(): void {
    if (!this.started || typeof window === 'undefined') return
    this.started = false
    window.removeEventListener('online', this.handleOnline)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  scheduleSync(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve()
    if (this.syncPromise) return this.syncPromise

    this.syncPromise = this.runSync()
      .catch((error) => {
        void this.setSyncError(error instanceof Error ? error.message : 'Sync failed')
      })
      .finally(() => {
        this.syncPromise = null
      })

    return this.syncPromise
  }

  private async runSync(): Promise<void> {
    const state = await this.ensureBootstrapped()
    if (!state?.deviceId) return

    await this.pushPendingMutations()
    await this.pullRemoteChanges()
    await this.writeSyncState({
      ...state,
      lastSyncAt: Date.now(),
      lastError: null,
    })
  }

  private readonly handleOnline = () => {
    void this.scheduleSync()
  }

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void this.scheduleSync()
    }
  }

  private async ensureBootstrapped(): Promise<SyncState | null> {
    if (this.bootstrapPromise) return this.bootstrapPromise

    this.bootstrapPromise = (async () => {
      const installId = getOrCreateInstallId()
      const payload: BootstrapRequest = {
        installId,
        platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
        appVersion: 'web',
      }

      try {
        const response = await fetch('/api/client/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin',
        })

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Bootstrap failed'))
        }

        const result = (await response.json()) as BootstrapResponse
        const state: SyncState = {
          id: SYNC_STATE_ID,
          installId,
          deviceId: result.deviceId,
          userId: result.userId,
          lastPulledChangeId: (await getSyncState())?.lastPulledChangeId ?? result.lastPulledChangeId,
          lastBootstrapAt: Date.now(),
          lastError: null,
        }

        await writeSyncState(state)
        return state
      } catch (error) {
        await this.setSyncError(error instanceof Error ? error.message : 'Bootstrap failed')
        return (await getSyncState()) ?? null
      }
    })()

    try {
      return await this.bootstrapPromise
    } finally {
      this.bootstrapPromise = null
    }
  }

  private async pushPendingMutations(): Promise<void> {
    while (true) {
      const batch = await db.syncOutbox.orderBy('createdAt').limit(OUTBOX_BATCH_SIZE).toArray()
      if (batch.length === 0) return

      const request = {
        mutations: batch.map<SyncMutation>((item) => ({
          mutationId: item.id,
          entityType: item.entityType,
          operation: item.operation,
          recordId: item.recordId,
          baseVersion: item.baseVersion,
          payload: item.payload,
        })),
      }

      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Sync push failed'))
      }

      const result = (await response.json()) as SyncPushResponse
      await db.transaction('rw', db.expressions, db.savedPhrases, db.syncOutbox, async () => {
        for (const entry of result.results) {
          if (entry.record) {
            if (entry.entityType === 'expression') {
              await db.expressions.put(entry.record as Expression)
            } else {
              await db.savedPhrases.put(entry.record as SavedPhrase)
            }
          } else if (entry.deleted) {
            if (entry.entityType === 'expression') {
              await db.expressions.delete(entry.recordId)
            } else {
              await db.savedPhrases.delete(entry.recordId)
            }
          }
          await db.syncOutbox.delete(entry.mutationId)
        }
      })
    }
  }

  private async pullRemoteChanges(): Promise<void> {
    while (true) {
      const state = await getSyncState()
      const response = await fetch(`/api/sync/pull?afterChangeId=${state?.lastPulledChangeId ?? 0}`, {
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Sync pull failed'))
      }

      const result = (await response.json()) as SyncPullResponse
      if (result.changes.length === 0) {
        if (state) {
          await writeSyncState({
            ...state,
            lastPulledChangeId: result.nextChangeId,
          })
        }
        return
      }

      await applyPulledChanges(result.changes, result.nextChangeId)

      if (!result.hasMore) return
    }
  }

  private async setSyncError(message: string): Promise<void> {
    const current = await getSyncState()
    await writeSyncState({
      id: SYNC_STATE_ID,
      installId: current?.installId ?? getOrCreateInstallId(),
      deviceId: current?.deviceId ?? null,
      userId: current?.userId ?? null,
      lastPulledChangeId: current?.lastPulledChangeId ?? 0,
      lastBootstrapAt: current?.lastBootstrapAt,
      lastSyncAt: current?.lastSyncAt,
      lastError: message,
    })
  }

  private async writeSyncState(state: SyncState): Promise<void> {
    await writeSyncState(state)
  }
}

async function applyPulledChanges(changes: SyncPullChange[], nextChangeId: number): Promise<void> {
  const pending = await db.syncOutbox.toArray()
  const pendingKeys = new Set(pending.map((item) => `${item.entityType}:${item.recordId}`))
  const state = await getSyncState()

  await db.transaction('rw', db.expressions, db.savedPhrases, db.syncState, async () => {
    for (const change of changes) {
      const entityKey = `${change.entityType}:${change.recordId}`
      if (pendingKeys.has(entityKey)) continue

      if (change.entityType === 'expression') {
        if (change.operation === 'delete' || !change.record) {
          await db.expressions.delete(change.recordId)
        } else {
          await db.expressions.put(change.record as Expression)
        }
      } else if (change.operation === 'delete' || !change.record) {
        await db.savedPhrases.delete(change.recordId)
      } else {
        await db.savedPhrases.put(change.record as SavedPhrase)
      }
    }

    await db.syncState.put({
      id: SYNC_STATE_ID,
      installId: state?.installId ?? getOrCreateInstallId(),
      deviceId: state?.deviceId ?? null,
      userId: state?.userId ?? null,
      lastPulledChangeId: nextChangeId,
      lastBootstrapAt: state?.lastBootstrapAt,
      lastSyncAt: Date.now(),
      lastError: null,
    })
  })
}

async function writeSyncState(state: SyncState): Promise<void> {
  await db.syncState.put(state)
}

async function getSyncState(): Promise<SyncState | undefined> {
  return db.syncState.get(SYNC_STATE_ID)
}

export async function enqueueOutboxItem(item: Omit<SyncOutboxItem, 'id' | 'createdAt'>): Promise<void> {
  await db.syncOutbox.add({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...item,
  })
}

function getOrCreateInstallId(): string {
  const existing = localStorage.getItem(INSTALL_ID_STORAGE_KEY)
  if (existing) return existing
  const installId = crypto.randomUUID()
  localStorage.setItem(INSTALL_ID_STORAGE_KEY, installId)
  return installId
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: { message?: string } }
    return body.error?.message ?? fallback
  } catch {
    return fallback
  }
}

export const syncService = new SyncService()
