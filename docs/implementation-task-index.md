# Implementation Task Index

This file is a practical task map for contributors. It links confirmed product / architecture decisions to smaller implementation issues.

Last updated: 2026-04-30

---

## How to read this file

This file answers: **what can be implemented next, in what order, and what decision does it depend on?**

- **Decision source** points to the issue or ADR that explains why the work exists.
- **Tasks** are smaller implementation issues intended to keep PRs reviewable.
- **Suggested order** is a dependency guide, not a strict project management rule.
- **Parent issues** remain useful for product context and discussion history.

The issue body is still the source of truth for each task. If a task scope changes, update the issue first, then update this index.

---

## P0: Receiver Persistence

**Decision source**

- [#26 Receiver flow should create an initial voice record and overwrite it after sequence correction](https://github.com/picinterpreter/picinterpreter/issues/26)
- [ADR-001: Receiver Data Model](ADR-001-receiver-data-model.md)

**Intent**

Receiver mode should preserve both the final picture sequence shown to the patient and the caregiver correction process that produced it.

**Tasks**

| Order | Issue | Purpose | Depends on |
|-------|-------|---------|------------|
| 1 | [#57 Dexie v5 receiver persistence schema](https://github.com/picinterpreter/picinterpreter/issues/57) | Add local schema fields/tables needed by receiver records, corrections, missing tokens, and privacy scope | #35 |
| 2 | [#59 Prisma ExpressionRecord receiver fields](https://github.com/picinterpreter/picinterpreter/issues/59) | Add server-side fields for synced confirmed expression records | #35 |
| 3 | [#60 Receiver active draft and confirm flow](https://github.com/picinterpreter/picinterpreter/issues/60) | Create one active receiver draft per session and confirm it after fullscreen display | #57, #59 |
| 4 | [#64 ReceiverCorrection event logging](https://github.com/picinterpreter/picinterpreter/issues/64) | Log caregiver edits such as replace/remove/reorder/merge/rewrite | #57, #60 |
| 5 | [#63 Include receive turns in conversation context](https://github.com/picinterpreter/picinterpreter/issues/63) | Include confirmed receive turns in history and LLM context | #57, #59, #60 |

**Notes**

- User-facing history shows confirmed records only.
- Drafts, correction events, and missing-token events are maintenance / learning logs.
- "Shown to user" and "synced to server" are separate decisions.

---

## P0: Database Migration Safety

**Decision source**

- [#35 Define IndexedDB migration strategy before adding receiver correction data](https://github.com/picinterpreter/picinterpreter/issues/35)

**Intent**

Schema migration must be safe before receiver persistence starts writing new records. IndexedDB migrations are hard to repair after users have installed the PWA.

**Tasks**

| Order | Issue | Purpose | Depends on |
|-------|-------|---------|------------|
| 1 | [#57 Dexie v5 receiver persistence schema](https://github.com/picinterpreter/picinterpreter/issues/57) | Implement Dexie v5 schema changes | #35 |
| 2 | [#58 Dexie v4 to v5 migration safety tests](https://github.com/picinterpreter/picinterpreter/issues/58) | Verify fresh install, v4 upgrade, and data preservation | #57 |
| 3 | [#59 Prisma ExpressionRecord receiver fields](https://github.com/picinterpreter/picinterpreter/issues/59) | Keep synced server data compatible with local receiver fields | #35 |

**Notes**

- #57 and #59 can be developed in parallel after the schema is agreed.
- #58 should land before relying on the migration in larger feature PRs.

---

## P0: Missing Pictogram Workflow

**Decision source**

- [#19 Track missing pictograms and provide a caregiver maintenance workflow](https://github.com/picinterpreter/picinterpreter/issues/19)
- [#8 Use an agent to improve text-to-picture matching accuracy](https://github.com/picinterpreter/picinterpreter/issues/8)

**Intent**

When the system cannot match a token to a picture, the gap should become a maintainable item instead of disappearing into a failed interaction.

**Tasks**

| Order | Issue | Purpose | Depends on |
|-------|-------|---------|------------|
| 1 | [#62 Record missing pictogram tokens from receiver pipeline](https://github.com/picinterpreter/picinterpreter/issues/62) | Write unresolved receiver tokens into `MissingTokenRecord` | #57 |
| 2 | [#61 Caregiver missing pictogram maintenance queue](https://github.com/picinterpreter/picinterpreter/issues/61) | Let caregivers review, ignore, or resolve missing tokens | #62 |

**Notes**

- Missing-token recording should not block the receiver flow.
- Patient-facing UI should not expose technical matching failures.

---

## P1: Offline MVP Behavior

**Decision source**

- [#32 Validate offline-first PWA behavior for core MVP flows](https://github.com/picinterpreter/picinterpreter/issues/32)
- [#6 Apply icon-first patient controls across the patient-facing UI](https://github.com/picinterpreter/picinterpreter/issues/6)

**Intent**

Core bidirectional communication must still work after the app has loaded successfully at least once. Network-dependent features can degrade, but the caregiver should understand what changed.

**Tasks**

| Order | Issue | Purpose | Depends on |
|-------|-------|---------|------------|
| 1 | [#66 Offline degradation status for caregiver side](https://github.com/picinterpreter/picinterpreter/issues/66) | Show caregiver-side offline / degraded feature status | #32 |
| 2 | [#65 Offline MVP behavior validation](https://github.com/picinterpreter/picinterpreter/issues/65) | Validate app shell, local library, expression flow, receiver manual input, and local history offline | #32 |

**Notes**

- Online image search, AI, sync, and login may be unavailable offline.
- Patient-facing UI should stay calm and non-technical.

---

## P1: MVP Verification

**Decision source**

- [#33 Add Playwright E2E coverage and a real-device MVP acceptance checklist](https://github.com/picinterpreter/picinterpreter/issues/33)

**Intent**

The MVP needs both automated regression checks and real-device acceptance checks. AAC usability depends on browser behavior, touch, audio, orientation, and offline state.

**Tasks**

| Order | Issue | Purpose | Depends on |
|-------|-------|---------|------------|
| 1 | [#68 Playwright MVP expression and receiver flows](https://github.com/picinterpreter/picinterpreter/issues/68) | Automate core expression and receiver flows without real AI/network/microphone dependencies | Stable MVP selectors |
| 2 | [#67 Real-device MVP acceptance checklist](https://github.com/picinterpreter/picinterpreter/issues/67) | Document manual phone/tablet checks for touch, TTS, fullscreen, orientation, offline, and errors | None |

**Notes**

- Playwright catches routine regressions.
- Real-device testing catches what desktop automation misses.

---

## P1: Pictogram Metadata and Board Library

**Decision source**

- [#11 Build a structured pictogram database from AAC image sources](https://github.com/picinterpreter/picinterpreter/issues/11)
- [#10 Support user-uploaded custom pictures](https://github.com/picinterpreter/picinterpreter/issues/10)
- [#15 Map negated and compound phrases to semantic pictogram equivalents](https://github.com/picinterpreter/picinterpreter/issues/15)
- [#30 Support importing exported picture libraries from CBoard and other AAC tools](https://github.com/picinterpreter/picinterpreter/issues/30)
- [Pictogram metadata implementation task package](pictogram-metadata-implementation-task-package.md) — rationale and task overview
- [Pictogram metadata dev checklist](pictogram-metadata-dev-checklist.md) — **executable: exact tables, fields, issue titles, done criteria**

**Intent**

The AAC library should evolve from a flat picture collection into a structured local library with:

- stable concepts
- symbol provenance
- fixed boards
- ambiguity guardrails
- patient-specific preferred symbols

**Planned task split**

These are the recommended next implementation tasks to open or track:

| Order | Planned task | Purpose | Depends on |
|-------|--------------|---------|------------|
| 1 | Define source-file schema and validation for curated pictogram metadata | Create stable curated records for concepts, symbols, boards, and exclusions | #11 |
| 2 | Add Dexie tables for concept, symbol, board, and exclusion metadata | Materialize the curated library in local runtime storage | #11, #35 |
| 3 | Load structured boards from curated metadata instead of flat category data | Move patient UI toward stable AAC boards | #11, #30 |
| 4 | Use concept exclusions to block known ambiguity mismatches | Fix known failures such as `开心 -> 开心果` structurally | #15 |
| 5 | Store patient-specific preferred symbol overrides locally | Support personal default images without mutating the base library | #10, #11 |

**Notes**

- This work should stay mostly local-first in MVP.
- Do not force the full curated library schema into Prisma unless server-side editing becomes a real requirement.
- Patient-specific symbol preferences should remain local-only in MVP.

---

## Current Contributor Entry Points

These are smaller or well-bounded tasks that contributors can pick up after reading the linked issue:

| Issue | Why it is a good entry point |
|-------|-----------------------------|
| [#16 Voice waveform visualisation during speech input](https://github.com/picinterpreter/picinterpreter/issues/16) | UI-focused and already labeled `good first issue` |
| [#36 Auto-play generated expression candidates after inactivity](https://github.com/picinterpreter/picinterpreter/issues/36) | Clear interaction change with limited scope |
| [#67 Real-device MVP acceptance checklist](https://github.com/picinterpreter/picinterpreter/issues/67) | Documentation-first task, useful for non-code contributors |
| [#66 Offline degradation status for caregiver side](https://github.com/picinterpreter/picinterpreter/issues/66) | Focused UI task tied to a confirmed product rule |

---

## Parent Issue Map

| Parent issue | Split task issues |
|--------------|------------------|
| [#35 Dexie migration strategy](https://github.com/picinterpreter/picinterpreter/issues/35) | #57, #58, #59 |
| [#26 Receiver record lifecycle](https://github.com/picinterpreter/picinterpreter/issues/26) | #60, #63, #64 |
| [#19 Missing pictogram workflow](https://github.com/picinterpreter/picinterpreter/issues/19) | #61, #62 |
| [#33 E2E and real-device verification](https://github.com/picinterpreter/picinterpreter/issues/33) | #67, #68 |
| [#32 Offline-first MVP validation](https://github.com/picinterpreter/picinterpreter/issues/32) | #65, #66 |
