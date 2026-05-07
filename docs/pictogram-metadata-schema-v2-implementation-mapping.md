# Pictogram Metadata Schema v2 Implementation Mapping

This document maps the v2 metadata schema draft to actual implementation phases and storage layers.

It answers the practical questions:

- which fields are needed in V1
- which fields can wait for Phase 2
- which fields belong in Dexie
- which fields belong in Prisma / server sync
- which fields are better maintained as source JSON / CSV first
- which fields should stay local-only

Related documents:

- [Pictogram metadata schema v2 draft](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/pictogram-metadata-schema-v2-draft.md)
- [Pictogram metadata field checklist](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/pictogram-metadata-field-checklist.md)
- [Decision index](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/decision-index.md)
- [Implementation task index](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/implementation-task-index.md)
- [ADR-001 receiver data model](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/ADR-001-receiver-data-model.md)

---

## Reading Guide

Use these storage labels:

- `Dexie` = local browser database
- `Prisma` = server-side relational persistence
- `Source file` = maintained in CSV/JSON and imported/generated
- `Derived` = computed at build/import/runtime, not hand-authored per record
- `Local-only` = intentionally not synced in MVP

Use these priority labels:

- `V1` = needed for the current product direction
- `P2` = useful later, not required to unlock V1
- `Later` = keep in mind, but do not spend implementation time now

---

## Core Recommendation

For V1, Tuyujia should **not** try to fully materialize every documented field into every storage layer.

The safest split is:

### Authoritative source layer

Maintain the curated library in source files first:

- `Concept`
- `ConceptAlias`
- `ConceptExclusion`
- `SymbolAsset`
- `ConceptSymbolLink`
- `Board`
- `BoardItem`

### Local runtime layer

Load these into `Dexie` for app use:

- curated concept library
- curated board structure
- local user-uploaded assets
- local patient-specific overrides

### Server layer

Do **not** sync the whole curated image library schema to Prisma in MVP unless there is a real multi-user editing requirement.

In MVP, Prisma should stay focused on:

- confirmed expression records
- conversation/session data
- authenticated account state

The library can remain primarily local/imported for now.

This matches current decisions much better than prematurely building a full remote CMS.

---

## Entity-Level Mapping

| Entity | V1 priority | Main storage | Sync scope | Recommendation |
|---|---|---|---|---|
| `Concept` | V1 | Source file + Dexie | Local in MVP | Must implement |
| `ConceptAlias` | V1 | Source file + Dexie | Local in MVP | Must implement |
| `ConceptExclusion` | V1 | Source file + Dexie | Local in MVP | Must implement |
| `ConceptContextRule` | P2-lite | Source file + Dexie | Local in MVP | Implement minimal version only if needed for ambiguity cases |
| `SymbolAsset` | V1 | Source file + Dexie | Local in MVP; custom assets private | Must implement |
| `ConceptSymbolLink` | V1 | Source file + Dexie | Local in MVP | Must implement |
| `Board` | V1 | Source file + Dexie | Local in MVP | Must implement |
| `BoardItem` | V1 | Source file + Dexie | Local in MVP | Must implement |
| `PatientProfile` | V1-lite | Dexie | Local-only in MVP | Minimal local implementation |
| `PatientConceptPreference` | V1 | Dexie | Local-only in MVP | Must implement locally |

---

## Field-Level Mapping

## 1. Concept Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1 | Source file + Dexie | Yes | Stable identity for all joins |
| `canonicalLabel` | V1 | Source file + Dexie | Yes | Main patient/caregiver label |
| `canonicalLabelEn` | P2 | Source file | No | Useful for bilingual documentation, not runtime-critical |
| `language` | V1 | Source file + Dexie | Yes | Required for localization sanity |
| `conceptType` | V1 | Source file + Dexie | Yes | Needed to distinguish word vs phrase vs repair phrase |
| `semanticDomain` | V1 | Source file + Dexie | Yes | Needed for ambiguity control and category logic |
| `category` | V1 | Source file + Dexie | Yes | Needed for organization |
| `subcategory` | P2 | Source file | No | Nice for curation, not required to ship |
| `isCore` | V1 | Source file + Dexie | Yes | Core/fringe is central to UI structure |
| `isFringe` | V1 | Source file + Dexie | Yes | Scene vocabulary handling |
| `adultRelevance` | P2 | Source file | No | Useful for curation but not runtime-critical in V1 |
| `aphasiaRelevance` | P2 | Source file | No | Useful, but can be implicit in board design at first |
| `medicalRelevance` | P2-lite | Source file + Dexie optional | Maybe | Helpful if receiver ranking needs medical boost |
| `repairRelevance` | P2-lite | Source file + Dexie optional | Maybe | Can initially be implied by repair board membership |
| `printablePriority` | P2 | Source file | No | Printable set can be curated by board first |
| `visibilityLevel` | P2 | Source file + Dexie | No | Needed when progressive reveal ships |
| `defaultSymbolAssetId` | V1 | Source file + Dexie | Yes | Core relation from concept to default image |
| `notes` | Later | Source file | No | Editorial only |
| `reviewStatus` | V1-lite | Source file | Yes | Needed for curation workflow more than runtime |
| `createdAt` / `updatedAt` | Later | Source file or generated | No | Nice audit data, not essential in MVP |

### V1 keep

- `id`
- `canonicalLabel`
- `language`
- `conceptType`
- `semanticDomain`
- `category`
- `isCore`
- `isFringe`
- `defaultSymbolAssetId`
- `reviewStatus`

### V1 optional if it helps matching soon

- `medicalRelevance`
- `repairRelevance`

---

## 2. ConceptAlias Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1 | Source file + Dexie | Yes | Stable joinable record |
| `conceptId` | V1 | Source file + Dexie | Yes | Core relation |
| `alias` | V1 | Source file + Dexie | Yes | Matching/search essential |
| `language` | V1 | Source file + Dexie | Yes | Important for multilingual support |
| `aliasType` | V1-lite | Source file | Yes | Helps separate synonym vs search hint |
| `priority` | P2 | Source file | No | Can be added later |
| `notes` | Later | Source file | No | Editorial |

### Recommendation

Implement fully enough for V1. Alias support is already needed by current matching goals.

---

## 3. ConceptExclusion Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1 | Source file + Dexie | Yes | Stable rule record |
| `conceptId` | V1 | Source file + Dexie | Yes | Rule target |
| `excludedText` | V1 | Source file + Dexie | Yes | Directly solves known ambiguity cases |
| `exclusionType` | V1 | Source file + Dexie | Yes | Need at least hard-block vs soft-penalty |
| `reason` | V1-lite | Source file | No | Useful for review but not runtime-critical |
| `notes` | Later | Source file | No | Editorial only |

### Recommendation

This is a true V1 feature, not a nice-to-have.

Without it, known Chinese ambiguity issues remain structurally unsolved.

---

## 4. ConceptContextRule Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | P2-lite | Source file + Dexie | Not initially | Can be added selectively |
| `conceptId` | P2-lite | Source file + Dexie | Not initially | Only needed if context ranking grows |
| `contextType` | P2-lite | Source file + Dexie | Not initially | Scene-based hints may matter soon |
| `contextValue` | P2-lite | Source file + Dexie | Not initially | Example: `food-drink` |
| `effect` | P2-lite | Source file + Dexie | Not initially | `prefer`, `boost`, `penalize`, `block` |
| `strength` | P2 | Source file | No | Ranking refinement |
| `notes` | Later | Source file | No | Editorial |

### Recommendation

Do **not** fully implement this before V1 unless:

- ambiguity keeps failing even after aliases and exclusions
- receiver-side scene weighting is being actively built

For MVP, a minimal form can be deferred.

---

## 5. SymbolAsset Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1 | Source file + Dexie | Yes | Stable image identity |
| `sourceProvider` | V1 | Source file + Dexie | Yes | Required for provenance and license handling |
| `sourceAssetId` | V1-lite | Source file + Dexie | Yes when available | Needed for traceability |
| `sourceUrl` | V1-lite | Source file + Dexie | Yes when available | Useful for audit and refresh |
| `assetPath` | V1 | Dexie / local file metadata | Yes for local runtime | Runtime fetch/local cache path |
| `imageType` | V1 | Source file + Dexie | Yes | Distinguish symbol/photo/custom |
| `license` | V1 | Source file + Dexie | Yes | Mandatory due licensing |
| `attributionText` | V1 | Source file + Dexie | Yes when required | Attribution display |
| `width` / `height` | Later | Dexie or derived | No | Nice for rendering optimizations |
| `dominantStyle` | P2 | Source file | No | Could help adult/photo/high-contrast choices later |
| `isDownloaded` | V1-lite | Dexie | Yes locally | Needed if backfill/cache exists |
| `reviewStatus` | V1-lite | Source file | Yes | Useful for curation |
| `createdAt` / `updatedAt` | Later | Source file or Dexie | No | Not critical in V1 |

### Recommendation

`SymbolAsset` is definitely V1 because the app already deals with:

- multiple sources
- fetched vs local assets
- uploaded images
- licensing

---

## 6. ConceptSymbolLink Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1 | Source file + Dexie | Yes | Stable link row |
| `conceptId` | V1 | Source file + Dexie | Yes | Core relation |
| `symbolAssetId` | V1 | Source file + Dexie | Yes | Core relation |
| `role` | V1 | Source file + Dexie | Yes | Need `default` vs `alternate` |
| `rank` | V1-lite | Source file + Dexie | Yes | Candidate order is useful immediately |
| `fitScore` | P2 | Source file or derived | No | Can be added later |
| `sceneTags` | P2-lite | Source file | No | Useful later for context-aware candidate choice |
| `notes` | Later | Source file | No | Editorial |

### Recommendation

Implement now because alternate images and default images are already part of the desired design.

---

## 7. Board Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1 | Source file + Dexie | Yes | Board identity |
| `slug` | V1 | Source file + Dexie | Yes | Stable key |
| `label` | V1 | Source file + Dexie | Yes | Visible board name |
| `labelEn` | P2 | Source file | No | Optional |
| `boardType` | V1 | Source file + Dexie | Yes | Patient/caregiver/topic/printable distinction |
| `layerType` | V1 | Source file + Dexie | Yes | `core`, `quick-talk`, `repair`, etc. |
| `description` | Later | Source file | No | Editorial |
| `parentBoardId` | V1-lite | Source file + Dexie | Maybe | Needed if topic hubs are used |
| `gridColumns` / `gridRows` | P2-lite | Source file + Dexie | Maybe | Useful if layout becomes more deterministic |
| `isPrintable` | V1 | Source file + Dexie | Yes | Printable support is a declared product requirement |
| `printablePriority` | P2 | Source file | No | Nice ordering field |
| `manualOrder` | V1-lite | Source file + Dexie | Yes if top-level board ordering is fixed | Can stay simple |
| `reviewStatus` | V1-lite | Source file | Yes | Curation workflow |

### Recommendation

Board structure is not optional anymore because `#30` and the board-layout docs already commit the product to a non-flat model.

---

## 8. BoardItem Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1 | Source file + Dexie | Yes | Stable row |
| `boardId` | V1 | Source file + Dexie | Yes | Core relation |
| `conceptId` | V1 | Source file + Dexie | Yes | Core relation |
| `positionIndex` | V1 | Source file + Dexie | Yes | Needed for stable manual order |
| `row` / `column` | P2-lite | Source file + Dexie | No initially | Needed only if absolute grid placement is implemented |
| `visibilityLevel` | P2 | Source file + Dexie | No | Progressive reveal later |
| `isPinned` | V1-lite | Source file + Dexie | Maybe | Useful for top-priority items |
| `isHiddenByDefault` | P2 | Source file + Dexie | No | Later vocabulary reveal |
| `boardSpecificLabel` | P2-lite | Source file + Dexie | No initially | Nice if phrase wording differs by board |
| `boardSpecificSymbolAssetId` | P2-lite | Source file + Dexie | No initially | Only if board-specific asset overrides are needed |
| `notes` | Later | Source file | No | Editorial |

### Recommendation

For V1, keep `BoardItem` lean:

- `boardId`
- `conceptId`
- `positionIndex`
- maybe `isPinned`

That is enough to support stable ordering and board membership.

---

## 9. PatientProfile Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1-lite | Dexie | Yes | Needed for patient-specific preference mapping |
| `displayName` | V1-lite | Dexie | Yes | Human-friendly profile selection |
| `locale` | P2 | Dexie | No | Nice later |
| `notes` | Later | Dexie | No | Optional |
| `createdAt` / `updatedAt` | Later | Dexie | No | Not needed immediately |

### Recommendation

Keep this extremely small in V1.

This is not the area to overbuild.

---

## 10. PatientConceptPreference Fields

| Field | V1/P2 | Storage | Required now? | Why |
|---|---|---|---|---|
| `id` | V1 | Dexie | Yes | Stable preference row |
| `patientProfileId` | V1 | Dexie | Yes | Required relation |
| `conceptId` | V1 | Dexie | Yes | Required relation |
| `preferredSymbolAssetId` | V1 | Dexie | Yes | Core personalization field |
| `sourceType` | V1-lite | Dexie | Yes | Distinguish custom upload vs built-in alternate |
| `fallbackSymbolAssetId` | V1 | Dexie | Yes | Safe revert path |
| `scope` | P2-lite | Dexie | No initially | If only local single-user behavior exists at first, this can wait |
| `isActive` | V1 | Dexie | Yes | Allows disable without delete |
| `notes` | Later | Dexie | No | Optional |
| `createdAt` / `updatedAt` | Later | Dexie | No | Optional for V1 |

### Recommendation

This is a true V1 requirement if personalization is real.

Without this table, user-uploaded custom images remain incomplete because there is no clean way to say:

for this patient, this image is the default for this concept.

---

## What Should Not Go Into Prisma In MVP

These should remain out of Prisma / server sync in MVP unless a clear multi-user editing need appears:

- full `Concept` library
- full `SymbolAsset` library
- `Board` and `BoardItem`
- `PatientConceptPreference`
- ambiguity rules like `ConceptExclusion`

### Why

Current decisions emphasize:

- offline-first
- curated local seed subset
- private pictograms never synced
- patient/caregiver use on one device or within one care context first

So server-syncing the whole library now would add complexity before product need is proven.

---

## What Should Be Local-Only In MVP

These are especially appropriate to keep local-only:

- `PatientConceptPreference`
- custom uploaded family/private images
- profile-specific image overrides
- draft or experimental alternate symbol choices

This matches the privacy direction in:

- `#10`
- `#24`
- `#27`
- ADR-001 local-only learning/correction posture

---

## Suggested Source File Layout

### V1 source-of-truth files

- `concepts.csv`
- `concept_aliases.csv`
- `concept_exclusions.csv`
- `symbol_assets.csv`
- `concept_symbol_links.csv`
- `boards.csv`
- `board_items.csv`

### Generated artifacts

- `concept-library.json`
- `board-library.json`
- `validation-report.json`

### Dexie-loaded datasets

- imported/generated concept library
- imported/generated board library
- local custom assets
- patient concept preferences

---

## Minimal V1 Implementation Set

If the team needs the smallest serious cut, build this:

### Must implement now

- `Concept.id`
- `Concept.canonicalLabel`
- `Concept.language`
- `Concept.conceptType`
- `Concept.semanticDomain`
- `Concept.category`
- `Concept.isCore`
- `Concept.isFringe`
- `Concept.defaultSymbolAssetId`

- `ConceptAlias`
- `ConceptExclusion`

- `SymbolAsset.id`
- `SymbolAsset.sourceProvider`
- `SymbolAsset.assetPath`
- `SymbolAsset.imageType`
- `SymbolAsset.license`

- `ConceptSymbolLink`

- `Board.id`
- `Board.slug`
- `Board.label`
- `Board.boardType`
- `Board.layerType`
- `Board.isPrintable`

- `BoardItem.boardId`
- `BoardItem.conceptId`
- `BoardItem.positionIndex`

- `PatientProfile.id`
- `PatientProfile.displayName`

- `PatientConceptPreference.patientProfileId`
- `PatientConceptPreference.conceptId`
- `PatientConceptPreference.preferredSymbolAssetId`
- `PatientConceptPreference.fallbackSymbolAssetId`
- `PatientConceptPreference.isActive`

### Can wait

- rich relevance fields
- full context-rule engine
- absolute grid coordinates
- editorial notes
- sync-level scope metadata
- timestamps on every library row

---

## Is The Schema Too Big?

No, but only if implemented in layers.

If the team tried to:

- create every field
- create every table
- sync everything to Prisma
- support full context-rule ranking immediately

then yes, it would be too much.

But if the team:

- keeps the source-of-truth library in CSV/JSON
- loads a lean runtime subset into Dexie
- keeps personalization local-only
- leaves Prisma focused on conversation records

then the schema is appropriately sized and aligned with current decisions.

---

## Bottom Line

The current metadata schema v2 draft is **sufficient** for the product direction.

It is not obviously missing any critical field family.

The real implementation guidance is:

1. implement the concept/image/board/preference split
2. implement ambiguity exclusions early
3. keep personalization local-only in MVP
4. do not force the entire library model into Prisma yet
5. defer advanced context and curation fields until Phase 2

That gives Tuyujia enough structure to support:

- curated core library
- board-based AAC UX
- ambiguity control
- custom images
- patient-specific preferred pictures

without overbuilding the first release.

---

*Last updated: 2026-05-06*
