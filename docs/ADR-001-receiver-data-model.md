# ADR-001: Receiver Mode Data Model

**Status:** Accepted  
**Date:** 2026-04-30  
**Issue:** [#26 — Receiver persistence](https://github.com/picinterpreter/picinterpreter/issues/26)

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

**MVP identity fields — `patientId` and `workspaceId`:**

| Field | MVP value | Notes |
|-------|-----------|-------|
| `patientId` | Stable UUID generated at bootstrap, stored in `localStorage` | Separate from `deviceId`; represents the person being communicated with |
| `workspaceId` | Stable UUID generated at bootstrap, stored in `localStorage` | **Not equal to `userId`.** A workspace is a care context (individual or family unit). One workspace will eventually hold multiple users. Generate a default UUID on first open; do not reuse `userId`. |

This separation matters for the family-promotion model: when ≥3 *users* in the same *workspace* make the same correction, it can be promoted — which requires workspace ≠ user.

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

The unified `PictogramMatchType` enum covers all pipeline stages. It extends the runtime `MatchedToken.matchType` vocabulary with AI, manual, and online-backfill values:

```typescript
export type PictogramMatchType =
  | 'exact'          // exact label match in local library
  | 'synonym'        // matched via pictogram.synonyms
  | 'lexicon'        // matched via lexicon synonym → primary label  (was 'lexicon-synonym')
  | 'partial'        // token contains a label substring (was 'partial')
  | 'online'         // found via ARASAAC / GlobalSymbols backfill
  | 'ai'             // match produced after LLM resegment
  | 'manual'         // caregiver manually swapped the pictogram
  | 'missing'        // no pictogram found (was 'none')
```

**Mapping from `MatchedToken.matchType` → `PictogramMatchType`:**

| `MatchedToken.matchType` | `PictogramMatchType` |
|--------------------------|----------------------|
| `'exact'` | `'exact'` |
| `'synonym'` | `'synonym'` |
| `'lexicon-synonym'` | `'lexicon'` |
| `'partial'` | `'partial'` |
| `'none'` | `'missing'` |

**`matchTextToImages()` returns only the five base types** (`exact`, `synonym`, `lexicon`, `partial`, `missing`). The pipeline layer is responsible for promoting match types after each stage:

- Tokens resolved by `searchAndStoreMissingPictograms` → re-match → annotated `'online'` by the pipeline
- Tokens resolved after `aiResegment` → re-match → annotated `'ai'` by the pipeline
- Tokens replaced by caregiver → annotated `'manual'` at write time

```typescript
export interface PictogramSequenceItem {
  pictogramId: string | null        // null = unresolved token
  label: string                     // display label shown under the pictogram
  source: 'local_dict' | 'arasaac' | 'opensymbols' | 'ai' | 'user'
  matchType: PictogramMatchType
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

- `Expression` type gains `pictogramSequence`, `patientId`, and `recordStatus` fields (backwards-compatible; all nullable).
- `Dexie` schema needs `version(5)` to add `receiverCorrections` and `missingTokens` tables, new Expression fields, and `scope` on `PictogramEntry`.
- **Server-side schema is also required** for confirmed receiver expressions. Because confirmed receive records enter `syncOutbox` and sync to MySQL, `ExpressionRecord` in Prisma must also receive the new columns (`pictogramSequence`, `patientId`, `recordStatus`). `serializeExpressionRecord()` must be updated to include them. Without this, the new fields are present in Dexie but silently stripped during sync, breaking multi-device history.
  - `receiverCorrections` and `missingTokens` are Dexie-only and do **not** need Prisma changes.
- Correction data accumulates locally and can feed a future cross-device learning feature once privacy design is finalised.

---

## Future considerations

- Server-side aggregation of correction data (requires explicit user consent and anonymisation design).
- Family-level promotion: when ≥3 users in the same workspace make the same correction, write it back as a local dict entry. Threshold is configurable.
- `userId` on ReceiverCorrection enables attribution once formal login is in place.
