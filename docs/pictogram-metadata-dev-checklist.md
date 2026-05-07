# Pictogram Metadata — V1 Development Checklist

This is the executable implementation sequence derived from:

- [`pictogram-metadata-schema-v2-implementation-mapping.md`](pictogram-metadata-schema-v2-implementation-mapping.md)
- [`pictogram-metadata-implementation-task-package.md`](pictogram-metadata-implementation-task-package.md)

Each step lists exactly what to create, which fields to include, which issue to reference, and what "done" looks like.  
Phase 2 and deferred fields are intentionally excluded.

---

## Step 1 — Source-File Schema and Seed Data

**Depends on:** nothing  
**Issue:** child of [#11](https://github.com/picinterpreter/picinterpreter/issues/11)  
**Suggested new issue title:** `Define CSV source schema and validation script for curated concept library`

### Files to create

```
data/
  concepts.csv
  concept_aliases.csv
  concept_exclusions.csv
  symbol_assets.csv
  concept_symbol_links.csv
  boards.csv
  board_items.csv
scripts/
  validate-library.js   (or .ts)
```

### `concepts.csv` — required columns

| Column | Type | Notes |
|---|---|---|
| `id` | string | Stable slug, e.g. `cn-eat` |
| `canonicalLabel` | string | Chinese display label |
| `language` | `zh-CN` \| `zh-TW` | |
| `conceptType` | `word` \| `phrase` \| `repair` | |
| `semanticDomain` | string | e.g. `food-drink`, `body`, `emotion` |
| `category` | string | e.g. `动作`, `需求`, `身体部位` |
| `isCore` | boolean | |
| `isFringe` | boolean | |
| `defaultSymbolAssetId` | string | FK → `symbol_assets.id` |
| `reviewStatus` | `draft` \| `approved` \| `deprecated` | |

### `concept_aliases.csv` — required columns

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `conceptId` | string | FK → `concepts.id` |
| `alias` | string | Match text, e.g. `饿`, `肚子饿` |
| `language` | string | |
| `aliasType` | `synonym` \| `search-hint` \| `colloquial` | |

### `concept_exclusions.csv` — required columns

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `conceptId` | string | FK → `concepts.id` |
| `excludedText` | string | Text that must NOT resolve to this concept, e.g. `开心果` for concept `cn-happy` |
| `exclusionType` | `hard-block` \| `soft-penalty` | |

### `symbol_assets.csv` — required columns

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `sourceProvider` | `arasaac` \| `mulberry` \| `custom` \| `uploaded` | |
| `sourceAssetId` | string | Provider's own ID |
| `sourceUrl` | string | Canonical provider URL |
| `assetPath` | string | Local or CDN path for runtime fetch |
| `imageType` | `symbol` \| `photo` \| `custom` | |
| `license` | string | e.g. `CC BY-NC-SA 4.0` |
| `attributionText` | string | Display credit line |
| `isDownloaded` | boolean | Whether cached locally |
| `reviewStatus` | `draft` \| `approved` \| `deprecated` | |

### `concept_symbol_links.csv` — required columns

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `conceptId` | string | FK → `concepts.id` |
| `symbolAssetId` | string | FK → `symbol_assets.id` |
| `role` | `default` \| `alternate` | |
| `rank` | integer | Candidate order; lower = higher preference |

### `boards.csv` — required columns

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `slug` | string | Stable URL key, e.g. `core-words` |
| `label` | string | Chinese board name |
| `boardType` | `patient` \| `caregiver` \| `topic` \| `printable` | |
| `layerType` | `core` \| `quick-talk` \| `repair` \| `topic` | |
| `isPrintable` | boolean | |
| `manualOrder` | integer | Top-level board sort position |
| `reviewStatus` | `draft` \| `approved` | |

### `board_items.csv` — required columns

| Column | Type | Notes |
|---|---|---|
| `id` | string | |
| `boardId` | string | FK → `boards.id` |
| `conceptId` | string | FK → `concepts.id` |
| `positionIndex` | integer | Slot order within board |

### Validation script checks

- All `defaultSymbolAssetId` references exist in `symbol_assets.csv`
- All `conceptId` and `symbolAssetId` in link tables resolve
- `positionIndex` values within a board are unique
- No duplicate `id` values within any file
- All `reviewStatus` values are in the allowed enum

### Done criteria

- [ ] All 7 CSV files exist with correct column headers
- [ ] Seed data covers at least the 5 planned V1 boards (see Step 3)
- [ ] Validation script runs without errors on seed data
- [ ] README or inline comment explains how to re-run validation

---

## Step 2 — Dexie Library Tables

**Depends on:** Step 1 (seed CSVs must be importable)  
**Issue:** child of [#11](https://github.com/picinterpreter/picinterpreter/issues/11) and [#35](https://github.com/picinterpreter/picinterpreter/issues/35)  
**Suggested new issue title:** `Add Dexie library tables for concept, symbol, board, and exclusion metadata`

### Dexie version bump

Current receiver schema is Dexie v5 ([#57](https://github.com/picinterpreter/picinterpreter/issues/57)).  
This step adds a **v6 upgrade** (or next available version) with library tables.

### Tables to add

```
concepts          — indexed: id, language, category, isCore, semanticDomain
conceptAliases    — indexed: id, conceptId
conceptExclusions — indexed: id, conceptId
symbolAssets      — indexed: id, sourceProvider
conceptSymbolLinks— indexed: id, conceptId, role
boards            — indexed: id, slug, layerType
boardItems        — indexed: id, boardId, conceptId
```

### Importer

Write a one-time or re-runnable import function:

```
importLibraryFromCSV(csvDir) → writes all 7 tables into Dexie
```

Requirements:
- idempotent: re-running does not create duplicates
- validates FK integrity before writing
- reports import errors without corrupting existing data

### What NOT to add at this step

- Do not mirror these tables into Prisma
- Do not add Phase 2 fields (`subcategory`, `adultRelevance`, `visibilityLevel`, `printablePriority`, etc.)
- Do not add `ConceptContextRule` table

### Done criteria

- [ ] Dexie schema version bumped; upgrade function runs on fresh install and v5 upgrade
- [ ] All 7 tables exist and are queryable
- [ ] Import function loads all seed CSV data without errors
- [ ] A concept can be resolved by ID to its default symbol asset
- [ ] A board can be loaded with its ordered board items

---

## Step 3 — Board Rendering from Structured Data

**Depends on:** Step 2  
**Issue:** child of [#11](https://github.com/picinterpreter/picinterpreter/issues/11) and [#30](https://github.com/picinterpreter/picinterpreter/issues/30)  
**Suggested new issue title:** `Load and render patient boards from Dexie board/boardItem tables`

### Initial V1 board set

| slug | label | layerType | isPrintable |
|---|---|---|---|
| `core-words` | 核心词 | `core` | true |
| `quick-talk` | 快速表达 | `quick-talk` | true |
| `repair-clarify` | 修正 / 澄清 | `repair` | true |
| `body-health` | 身体 / 健康 | `topic` | true |
| `home` | 主页 | `core` | false |

### What to implement

- Load `boards` list from Dexie for patient navigation
- Load `boardItems` ordered by `positionIndex` for a given `boardId`
- Resolve each `boardItem.conceptId` → `concept` → `defaultSymbolAssetId` → `symbolAsset.assetPath`
- Render board in fixed slot order
- Allow same concept to appear in multiple boards (it is a join, not a 1:1 relation)

### What NOT to implement yet

- Dynamic grid-size adjustment (`row` / `column` absolute placement) — P2
- Progressive visibility (`visibilityLevel`) — P2
- Board-specific symbol overrides (`boardSpecificSymbolAssetId`) — P2

### Done criteria

- [ ] Patient-facing board list shows the 5 initial boards
- [ ] Selecting a board shows pictograms in stable `positionIndex` order
- [ ] Order survives app reload (comes from Dexie, not runtime sort)
- [ ] A concept that appears in two boards shows correctly in both

---

## Step 4 — Ambiguity Guardrails in Matching

**Depends on:** Step 2  
**Issue:** [#15](https://github.com/picinterpreter/picinterpreter/issues/15)  
**Suggested new issue title:** `Use ConceptAlias and ConceptExclusion in receiver matching pipeline`

### What to implement

**Alias lookup:** when scoring candidates for a token `t`:
1. Query `conceptAliases` where `alias` contains/matches `t`
2. Add matched concepts as candidates alongside existing label-based matches
3. Score: `+90` for alias match (below `+100` for canonical label, above `+80` for keyword)

**Exclusion enforcement:** after producing a candidate list:
1. Query `conceptExclusions` for each candidate concept
2. If `exclusionType === 'hard-block'` and `excludedText` matches input token → remove candidate entirely
3. If `exclusionType === 'soft-penalty'` → reduce candidate score by penalty constant (suggest `-40`)

**Seed the exclusion list** from known documented failures:

| conceptId | excludedText | exclusionType |
|---|---|---|
| `cn-happy` | 开心果 | `hard-block` |
| `cn-apple` | 苹果手机 | `hard-block` |
| `cn-apple` | iPhone | `hard-block` |

_(Extend from `symbol-matching-research.md` disambiguation cases)_

### Done criteria

- [ ] `开心` resolves to 开心/快乐 concept, never to 开心果
- [ ] Alias matching is covered by an automated test
- [ ] Exclusion blocking is covered by an automated test
- [ ] Guardrails run offline without any network access

---

## Step 5 — Patient-Specific Preferred Symbol Overrides

**Depends on:** Step 2  
**Issue:** [#10](https://github.com/picinterpreter/picinterpreter/issues/10)  
**Suggested new issue title:** `Add PatientProfile and PatientConceptPreference tables for local symbol personalization`

### Tables to add (Dexie only, never sync to Prisma in MVP)

**`patientProfiles`**

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `displayName` | string | Human-readable name for profile selector |

**`patientConceptPreferences`**

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `patientProfileId` | string | FK → `patientProfiles.id` |
| `conceptId` | string | FK → `concepts.id` in Dexie |
| `preferredSymbolAssetId` | string | The overriding image |
| `sourceType` | `custom-upload` \| `built-in-alternate` | |
| `fallbackSymbolAssetId` | string | Reverts to this if preferred is unavailable |
| `isActive` | boolean | Allows soft-disable without deletion |

### Symbol resolution order (runtime)

```
1. patientConceptPreferences where patientProfileId = active patient AND conceptId = X AND isActive = true
   → use preferredSymbolAssetId

2. concepts.defaultSymbolAssetId

3. fallbackSymbolAssetId from preference row (if set and preferred is unavailable)
```

### What NOT to do

- Do not add a `scope` field yet — single-user local in V1
- Do not sync preferences to Prisma — local-only in MVP
- Do not merge private/custom uploaded images into `symbolAssets` base library

### Done criteria

- [ ] Two patient profiles can prefer different images for `cn-happy`
- [ ] Switching active profile updates pictogram display immediately
- [ ] Custom uploaded image for patient A does not appear for patient B
- [ ] Resetting/reimporting the base library does not delete patient preferences

---

## Step 6 — Phase 2: Context Rules (deferred)

**Do not implement before Steps 1–5 are complete.**

When the time comes, open a new issue under [#15](https://github.com/picinterpreter/picinterpreter/issues/15) titled:  
`Implement ConceptContextRule for scene-aware candidate ranking`

Fields: `id`, `conceptId`, `contextType`, `contextValue`, `effect` (`prefer` / `boost` / `penalize` / `block`).  
First useful contexts: `food-drink`, `body-health`, `repair`, `emotion`.

---

## Issue Map

| Step | New issue title (to open) | References existing |
|---|---|---|
| 1 | `Define CSV source schema and validation script for curated concept library` | #11 |
| 2 | `Add Dexie library tables for concept, symbol, board, and exclusion metadata` | #11, #35, #57 |
| 3 | `Load and render patient boards from Dexie board/boardItem tables` | #11, #30 |
| 4 | `Use ConceptAlias and ConceptExclusion in receiver matching pipeline` | #15, #8 |
| 5 | `Add PatientProfile and PatientConceptPreference tables for local symbol personalization` | #10, #11 |
| 6 (P2) | `Implement ConceptContextRule for scene-aware candidate ranking` | #15, #8 |

---

## Fields Intentionally Excluded from V1

The following fields from the v2 schema are confirmed deferred. Do not implement them:

| Field | Entity | Reason deferred |
|---|---|---|
| `canonicalLabelEn` | Concept | Bilingual docs only |
| `subcategory` | Concept | Curation nice-to-have |
| `adultRelevance`, `aphasiaRelevance` | Concept | Implicit in board design for now |
| `printablePriority` | Concept, Board | Board curation handles this |
| `visibilityLevel` | Concept, BoardItem | Progressive reveal is Phase 2 |
| `fitScore` | ConceptSymbolLink | Derived scoring, P2 |
| `sceneTags` | ConceptSymbolLink | Context-aware candidates, P2 |
| `row` / `column` | BoardItem | Absolute grid placement, P2 |
| `boardSpecificLabel` | BoardItem | Per-board phrase variant, P2 |
| `boardSpecificSymbolAssetId` | BoardItem | Per-board asset override, P2 |
| `scope` | PatientConceptPreference | Multi-user scope not needed in V1 |
| `gridColumns` / `gridRows` | Board | Layout config, P2 |
| Any Prisma sync | All library entities | Offline-first; library stays local in MVP |

---

*Last updated: 2026-05-07*  
*Source documents: pictogram-metadata-schema-v2-implementation-mapping.md, pictogram-metadata-implementation-task-package.md*  
*Related issues: #8 #10 #11 #15 #30 #35 #57*
