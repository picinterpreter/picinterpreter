# ADR-001: Receiver Mode Data Model

**Status:** Accepted  
**Date:** 2026-04-30  
**Issue:** [#26 — Receiver persistence](https://github.com/lightcoloror/PicInterpreter/issues/26)

---

## Context

Receiver mode converts caregiver-entered text into a pictogram sequence the patient can read. We need to decide:

1. How receiver sessions are persisted alongside express sessions
2. What correction events to record for future learning
3. Whether corrections sync to the server

---

## Decision

### 1. Expression record reuse

Receiver mode reuses the existing `Expression` record with `direction: 'receive'`. Two new fields are added:

- `pictogramSequence: PictogramSequenceItem[] | null` — structured match result, stored alongside the existing flat `pictogramIds[]` for backwards compatibility
- `patientId: string` — UUID of the patient profile on this device (bootstrapped at first open, not the anonymous deviceId)

### 2. Two-phase write

| Phase | When | What's written |
|-------|------|---------------|
| Draft | Immediately after text → pictogram match | Expression with `pictogramSequence`, `status: 'draft'` |
| Confirmed | After caregiver taps "show to patient" / fullscreen displayed | Draft overwritten with `status: 'confirmed'` |

**Only confirmed records enter syncOutbox.** Draft records are local-only and may be discarded if the user abandons the flow. The draft → confirmed overwrite is the one valid mutation on an existing record before sync; all other post-sync updates use the normal upsert path.

### 3. ReceiverCorrection table

Each user edit in receiver mode generates a `ReceiverCorrection` record. This table is **Dexie-only** (never synced to MySQL in MVP).

```typescript
export type ReceiverCorrectionAction =
  | 'replace_pictogram'
  | 'insert_pictogram'
  | 'delete_pictogram'
  | 'reorder'
  | 'resegment'

export interface ReceiverCorrection {
  id: string
  expressionId: string
  sessionId: string
  patientId: string
  workspaceId: string
  userId?: string | null            // set when user is logged in

  action: ReceiverCorrectionAction

  // Token context (present for token-level corrections)
  originalToken?: string | null
  normalizedToken?: string | null
  sequenceIndex?: number | null

  // Position context (present for reorder / insert / delete)
  sequenceIndexBefore?: number | null
  sequenceIndexAfter?: number | null

  // Pictogram context (singular — before/after for replace)
  pictogramIdBefore?: string | null
  pictogramIdAfter?: string | null

  // Pictogram context (plural — for multi-pictogram resegment result)
  pictogramIdsBefore?: string[] | null
  pictogramIdsAfter?: string[] | null

  isUsedForLearning: boolean        // false until caregiver review promotes it
  createdAt: number
}
```

### 4. PictogramSequenceItem

```typescript
export type MatchType = 'exact' | 'synonym' | 'fuzzy' | 'ai' | 'manual' | 'missing'

export interface PictogramSequenceItem {
  pictogramId: string | null        // null = unresolved token
  label: string                     // display label shown under the pictogram
  source: 'local_dict' | 'arasaac' | 'opensymbols' | 'ai' | 'user'
  matchType: MatchType
  confidence: number                // 0–1
  originalToken: string             // the raw text segment that produced this item
  role?: string | null              // grammatical role hint (noun, verb, …)
  groupId?: string | null           // groups items that came from one phrase-protected chunk
}
```

### 5. MissingTokenRecord table

Unresolved tokens (where no pictogram was found) are also tracked:

```typescript
export type MissingTokenStatus = 'new' | 'suggested' | 'resolved' | 'ignored'

export interface MissingTokenRecord {
  id: string
  normalizedToken: string
  status: MissingTokenStatus
  occurrenceCount: number
  scenes: string[]                  // context labels collected at occurrence time
  rawTextSamples: string[]          // up to 5 raw input snippets for caregiver context
  suggestedPictogramId?: string | null
  source?: string | null            // which pipeline layer made the suggestion
  resolvedPictogramId?: string | null
  reviewedByCaregiver?: boolean
  createdAt: number
  updatedAt: number
}
```

---

## Sync behaviour

| Table | Synced? | Reason |
|-------|---------|--------|
| `expressions` (confirmed, direction=receive) | Yes | Same path as express-mode expressions |
| `expressions` (draft) | No | Never enter syncOutbox until confirmed |
| `receiverCorrections` | No (MVP) | Workspace-local learning data; privacy-sensitive; deferred to post-MVP |
| `missingTokens` | No (MVP) | Caregiver-device-specific gap tracking |

---

## Consequences

- `Expression` type gains `pictogramSequence` and `patientId` fields (backwards-compatible; both nullable).
- `Dexie` schema needs `version(5)` to add `receiverCorrections` and `missingTokens` tables, and indexes on `Expression`.
- No server-side schema changes required for MVP receiver mode.
- Correction data accumulates locally and can feed a future cross-device learning feature once privacy design is finalised.

---

## Future considerations

- Server-side aggregation of correction data (requires explicit user consent and anonymisation design).
- Family-level promotion: when ≥3 users in the same workspace make the same correction, write it back as a local dict entry. Threshold is configurable.
- `userId` on ReceiverCorrection enables attribution once formal login is in place.
