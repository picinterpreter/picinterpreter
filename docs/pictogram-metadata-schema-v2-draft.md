# Pictogram Metadata Schema v2 Draft

This document defines a practical v2 metadata schema draft for Tuyujia's pictogram library.

It is designed to be implementation-oriented rather than purely conceptual.

The draft is based on:

- structured library needs from issue `#11`
- import and board-structure needs from issue `#30`
- ambiguity-control needs such as `开心 -> 开心果`
- patient-specific preferred picture mapping needs partially covered by issue `#10`
- commercial AAC structure patterns observed in:
  - TD Snap Core First
  - TD Snap Aphasia
  - Proloquo2Go / Crescendo
  - WordPower
  - Communication Journey Aphasia
  - LAMP Words for Life
  - Unity / Minspeak
  - Super Core
  - Voco Chat
  - Project Core

Related docs:

- [Pictogram metadata field checklist](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/pictogram-metadata-field-checklist.md)
- [Commercial AAC core library / architecture matrix](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/commercial-aac-core-library-architecture-matrix.md)
- [Tuyujia V1 board layout draft](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/tuyujia-v1-board-layout-draft.md)

---

## Goals

This schema should support all of the following:

1. a structured seed library
2. multiple symbol sources
3. board-based organization
4. ambiguity control
5. patient-specific preferred image mapping
6. printable board generation
7. future import/export compatibility

This means the schema should not be only one flat `pictogram` table.

It should separate:

- concept layer
- symbol/image layer
- board layer
- board membership layer
- patient override layer

---

## Recommended Entity Model

### Core entities

| Entity | What it represents |
|---|---|
| `Concept` | A meaning or communicative unit, such as `开心`, `喝水`, `医生`, `不是这个` |
| `SymbolAsset` | A concrete image/symbol/photo candidate that can represent a concept |
| `Board` | A patient- or caregiver-facing board, such as `quick-talk`, `body-health`, `food-drink` |
| `BoardItem` | The placement of a concept on a board |
| `PatientConceptPreference` | A patient-specific override mapping a concept to a preferred symbol/image |

### Why this split matters

If we do not separate `Concept` from `SymbolAsset`, we cannot handle:

- one concept with multiple candidate images
- one patient preferring a different image for the same concept
- ambiguity rules attached to meaning instead of image file

If we do not separate `Board` from `Concept`, we cannot handle:

- one concept appearing on multiple boards
- stable core plus topic boards
- printable board generation

---

## Schema Summary

### Entity list

1. `Concept`
2. `ConceptAlias`
3. `ConceptExclusion`
4. `ConceptContextRule`
5. `SymbolAsset`
6. `ConceptSymbolLink`
7. `Board`
8. `BoardItem`
9. `PatientProfile`
10. `PatientConceptPreference`

This may look like a lot, but it is much safer than forcing all behavior into one huge JSON blob.

---

## 1. Concept

This is the most important table.

A `Concept` is the canonical meaning unit in Tuyujia.

Examples:

- `开心`
- `喝水`
- `疼痛`
- `不是这个`
- `请叫护士`

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `concept:happy` | Stable canonical identifier |
| `canonicalLabel` | string | yes | `开心` | Main Chinese label |
| `canonicalLabelEn` | string | no | `happy` | Optional English gloss |
| `language` | string | yes | `zh-CN` | Canonical label language |
| `conceptType` | enum | yes | `word` | `word`, `phrase`, `quick_phrase`, `repair_phrase` |
| `semanticDomain` | enum | yes | `emotion` | See semantic-domain list below |
| `category` | string | yes | `feelings` | Human-friendly grouping |
| `subcategory` | string | no | `positive-emotion` | Optional secondary grouping |
| `isCore` | boolean | yes | `true` | Whether it belongs to stable core vocabulary |
| `isFringe` | boolean | yes | `false` | Whether it is scene/topic specific |
| `adultRelevance` | enum | no | `high` | `low`, `medium`, `high` |
| `aphasiaRelevance` | enum | no | `high` | `low`, `medium`, `high` |
| `medicalRelevance` | enum | no | `low` | `low`, `medium`, `high` |
| `repairRelevance` | enum | no | `low` | `low`, `medium`, `high` |
| `printablePriority` | enum | no | `high` | `low`, `medium`, `high` |
| `visibilityLevel` | enum | no | `always` | `always`, `expanded`, `hidden` |
| `defaultSymbolAssetId` | string | no | `asset:arasaac:smile-face-1234` | Default chosen image |
| `notes` | string | no | `Protect from 开心果 false match` | Editorial note |
| `reviewStatus` | enum | yes | `approved` | `draft`, `reviewed`, `approved`, `deprecated` |
| `createdAt` | string (ISO datetime) | yes | `2026-05-06T12:00:00Z` | Audit |
| `updatedAt` | string (ISO datetime) | yes | `2026-05-06T12:00:00Z` | Audit |

### Recommended semantic domains

Use a controlled list:

- `person`
- `reference`
- `action`
- `request`
- `repair`
- `emotion`
- `body`
- `symptom`
- `medical`
- `food`
- `drink`
- `toilet`
- `hygiene`
- `place`
- `time`
- `object`
- `relationship`
- `activity`
- `comfort`
- `transport`
- `quick-talk`

---

## 2. ConceptAlias

This stores alternate labels for the same concept.

Examples:

- `高兴` -> concept `开心`
- `不舒服` may map to its own concept or to semantic-equivalent handling depending on strategy

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `alias:happy:gaoxing` | Stable alias id |
| `conceptId` | string | yes | `concept:happy` | Target concept |
| `alias` | string | yes | `高兴` | Alternate label |
| `language` | string | yes | `zh-CN` | Alias language |
| `aliasType` | enum | yes | `synonym` | `synonym`, `variant`, `spoken`, `search`, `llm_hint` |
| `priority` | number | no | `10` | Useful if multiple aliases exist |
| `notes` | string | no | `Common synonym in daily speech` | Editorial note |

---

## 3. ConceptExclusion

This stores meanings that should **not** be matched to a concept.

This is the first-class home for problems like:

- `开心` should not match `开心果`
- `苹果` should not prefer Apple Inc. / iPhone in a food context

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `exclude:happy:pistachio` | Stable exclusion id |
| `conceptId` | string | yes | `concept:happy` | Protected concept |
| `excludedText` | string | yes | `开心果` | Exact or near text to avoid |
| `exclusionType` | enum | yes | `hard-block` | `hard-block`, `soft-penalty` |
| `reason` | string | no | `Nut, not emotion` | Human explanation |
| `notes` | string | no | `Observed real failure` | Editorial note |

### Why separate this from aliases

`aliases` say what the concept **can** mean.

`exclusions` say what it **must not** mean.

Both are needed.

---

## 4. ConceptContextRule

This stores context-sensitive preference rules.

Examples:

- `苹果` should prefer fruit in `food` scene
- `药` should be higher priority in `medical` scene
- `开心` should be stronger in `feelings` scene than in generic search

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `ctx:apple:food` | Stable context-rule id |
| `conceptId` | string | yes | `concept:apple-fruit` | Protected concept |
| `contextType` | enum | yes | `scene` | `scene`, `board`, `partner`, `medical`, `time` |
| `contextValue` | string | yes | `food-drink` | Context tag/board/etc. |
| `effect` | enum | yes | `prefer` | `prefer`, `boost`, `penalize`, `block` |
| `strength` | number | no | `10` | Ranking weight if needed |
| `notes` | string | no | `Prefer fruit meaning on food board` | Editorial note |

---

## 5. SymbolAsset

This is the concrete image/symbol/photo table.

Examples:

- one ARASAAC symbol
- one Mulberry symbol
- one user-uploaded family photo

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `asset:arasaac:1234` | Stable asset id |
| `sourceProvider` | enum | yes | `arasaac` | `arasaac`, `mulberry`, `sclera`, `opensymbols`, `custom-upload`, etc. |
| `sourceAssetId` | string | no | `1234` | Upstream asset id |
| `sourceUrl` | string | no | `https://api.arasaac.org/v1/pictograms/1234` | Source url |
| `assetPath` | string | no | `/assets/pictograms/1234.png` | Local path if stored locally |
| `imageType` | enum | yes | `symbol` | `symbol`, `illustration`, `photo`, `custom` |
| `license` | string | no | `CC BY-NC-SA 4.0` | Asset license |
| `attributionText` | string | no | `ARASAAC` | Attribution if needed |
| `width` | number | no | `500` | Optional |
| `height` | number | no | `500` | Optional |
| `dominantStyle` | enum | no | `cartoon` | `cartoon`, `line-art`, `photo`, `high-contrast` |
| `isDownloaded` | boolean | yes | `true` | Whether locally cached |
| `reviewStatus` | enum | yes | `approved` | Same review lifecycle |
| `createdAt` | string | yes | ISO datetime | Audit |
| `updatedAt` | string | yes | ISO datetime | Audit |

---

## 6. ConceptSymbolLink

This links concepts to candidate images.

One concept can have multiple candidate images.

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `link:happy:arasaac1234` | Stable link id |
| `conceptId` | string | yes | `concept:happy` | Target concept |
| `symbolAssetId` | string | yes | `asset:arasaac:1234` | Candidate asset |
| `role` | enum | yes | `default` | `default`, `alternate`, `patient-candidate`, `deprecated` |
| `rank` | number | no | `1` | Candidate ordering |
| `fitScore` | number | no | `0.95` | Editorial / model-estimated fit score |
| `sceneTags` | string[] | no | `["feelings"]` | Optional scene fit tags |
| `notes` | string | no | `Best generic smiling face` | Editorial note |

---

## 7. Board

This defines a board itself.

Examples:

- `home`
- `quick-talk`
- `repair`
- `body-health`
- `food-drink`

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `board:quick-talk` | Stable board id |
| `slug` | string | yes | `quick-talk` | URL / key-friendly identifier |
| `label` | string | yes | `快速表达` | Display name |
| `labelEn` | string | no | `Quick Talk` | Optional gloss |
| `boardType` | enum | yes | `patient` | `patient`, `caregiver`, `printable`, `topic`, `system` |
| `layerType` | enum | yes | `quick-talk` | `core`, `quick-talk`, `repair`, `topic`, `body-health`, `caregiver` |
| `description` | string | no | `One-tap whole-message expressions` | Short explanation |
| `parentBoardId` | string | no | `board:home` | If nested under a hub |
| `gridColumns` | number | no | `6` | Optional layout hint |
| `gridRows` | number | no | `4` | Optional layout hint |
| `isPrintable` | boolean | yes | `true` | Whether board has printable export |
| `printablePriority` | enum | no | `high` | `low`, `medium`, `high` |
| `manualOrder` | number | no | `1` | Top-level board order if needed |
| `reviewStatus` | enum | yes | `approved` | Lifecycle |

---

## 8. BoardItem

This is the placement of one concept on one board.

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `boarditem:quick-talk:help` | Stable board-item id |
| `boardId` | string | yes | `board:quick-talk` | Target board |
| `conceptId` | string | yes | `concept:help` | Concept placed on board |
| `positionIndex` | number | yes | `3` | Stable manual order on board |
| `row` | number | no | `1` | Optional fixed-grid placement |
| `column` | number | no | `2` | Optional fixed-grid placement |
| `visibilityLevel` | enum | no | `always` | Override if board-specific |
| `isPinned` | boolean | no | `true` | Useful for top-priority items |
| `isHiddenByDefault` | boolean | no | `false` | For progressive reveal |
| `boardSpecificLabel` | string | no | `帮帮我` | If board phrasing differs slightly |
| `boardSpecificSymbolAssetId` | string | no | `asset:arasaac:999` | If board uses a specific asset override |
| `notes` | string | no | `Keep on top row` | Editorial note |

### Why BoardItem needs its own table

Because one concept may:

- appear on multiple boards
- have different positions on different boards
- use slightly different board-specific rendering choices

---

## 9. PatientProfile

This is only a minimal identity layer for personalization.

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `patient:huangbincan` | Stable patient/profile id |
| `displayName` | string | yes | `Bincan` | Profile label |
| `locale` | string | no | `zh-CN` | Preferred language |
| `notes` | string | no | `Post-stroke aphasia` | Optional clinical/editorial note |
| `createdAt` | string | yes | ISO datetime | Audit |
| `updatedAt` | string | yes | ISO datetime | Audit |

This can stay simple in V1.

---

## 10. PatientConceptPreference

This is the key personalization table.

It stores:

`patient/profile + concept -> preferred image`

### Fields

| Field | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `id` | string | yes | `pref:huangbincan:mother` | Stable preference id |
| `patientProfileId` | string | yes | `patient:huangbincan` | Target patient |
| `conceptId` | string | yes | `concept:mother` | Target concept |
| `preferredSymbolAssetId` | string | yes | `asset:custom:mother-photo-1` | Chosen asset |
| `sourceType` | enum | yes | `custom-upload` | `custom-upload`, `built-in-alternate`, `generated`, `photo-scene` |
| `fallbackSymbolAssetId` | string | no | `asset:arasaac:mother-default` | Safe fallback |
| `scope` | enum | yes | `patient-only` | `patient-only`, `family-shared`, `device-local` |
| `isActive` | boolean | yes | `true` | Allows temporary disable |
| `notes` | string | no | `Real mother photo easier to recognize` | Important for care context |
| `createdAt` | string | yes | ISO datetime | Audit |
| `updatedAt` | string | yes | ISO datetime | Audit |

### Why this table is essential

Without this table, personalization becomes destructive:

- you overwrite the base library
- you cannot safely revert
- different patients cannot share one base concept system with different preferred images

---

## Recommended JSON Shape

For exchange or maintenance, a generated JSON representation can look like this:

```json
{
  "concepts": [
    {
      "id": "concept:happy",
      "canonicalLabel": "开心",
      "canonicalLabelEn": "happy",
      "language": "zh-CN",
      "conceptType": "word",
      "semanticDomain": "emotion",
      "category": "feelings",
      "isCore": true,
      "isFringe": false,
      "adultRelevance": "high",
      "aphasiaRelevance": "high",
      "defaultSymbolAssetId": "asset:arasaac:happy-face-1234",
      "reviewStatus": "approved"
    }
  ],
  "conceptAliases": [
    {
      "id": "alias:happy:gaoxing",
      "conceptId": "concept:happy",
      "alias": "高兴",
      "language": "zh-CN",
      "aliasType": "synonym"
    }
  ],
  "conceptExclusions": [
    {
      "id": "exclude:happy:pistachio",
      "conceptId": "concept:happy",
      "excludedText": "开心果",
      "exclusionType": "hard-block",
      "reason": "Nut, not emotion"
    }
  ],
  "symbolAssets": [
    {
      "id": "asset:arasaac:happy-face-1234",
      "sourceProvider": "arasaac",
      "sourceAssetId": "1234",
      "imageType": "symbol",
      "license": "CC BY-NC-SA 4.0",
      "sourceUrl": "https://api.arasaac.org/v1/pictograms/1234",
      "reviewStatus": "approved"
    }
  ],
  "boards": [
    {
      "id": "board:quick-talk",
      "slug": "quick-talk",
      "label": "快速表达",
      "boardType": "patient",
      "layerType": "quick-talk",
      "isPrintable": true,
      "reviewStatus": "approved"
    }
  ],
  "boardItems": [
    {
      "id": "boarditem:quick-talk:help",
      "boardId": "board:quick-talk",
      "conceptId": "concept:help",
      "positionIndex": 1,
      "isPinned": true
    }
  ],
  "patientConceptPreferences": [
    {
      "id": "pref:huangbincan:mother",
      "patientProfileId": "patient:huangbincan",
      "conceptId": "concept:mother",
      "preferredSymbolAssetId": "asset:custom:mother-photo-1",
      "sourceType": "custom-upload",
      "fallbackSymbolAssetId": "asset:arasaac:mother-default",
      "scope": "patient-only",
      "isActive": true
    }
  ]
}
```

---

## Recommended CSV Maintenance Strategy

For maintainability, the best practical setup is likely:

### Human-edited source tables

- `concepts.csv`
- `concept_aliases.csv`
- `concept_exclusions.csv`
- `symbol_assets.csv`
- `boards.csv`
- `board_items.csv`

### Generated machine artifacts

- `concept-library.json`
- `board-library.json`
- validation reports

This is easier to maintain than editing one giant JSON file by hand.

---

## V1 Minimum Required Tables

If the team wants a true minimum implementation, start with:

1. `Concept`
2. `ConceptAlias`
3. `ConceptExclusion`
4. `SymbolAsset`
5. `ConceptSymbolLink`
6. `Board`
7. `BoardItem`
8. `PatientConceptPreference`

That is enough to support:

- structured library
- core/fringe/board layout
- ambiguity exclusion
- alternate images
- patient-specific preferred picture mapping

---

## Phase 2 Tables / Fields

These can be delayed if implementation needs to stay lean:

- `ConceptContextRule`
- richer audit fields
- detailed clinical relevance fields if not needed at runtime
- advanced scope/privacy controls
- ranking/usage stats as dedicated behavioral tables

Specifically, these are better treated as **behavioral data**, not seed-library metadata:

- popularity count
- tap count
- last used
- manually reordered board state

Those belong to app-state / analytics / personalization data, not the canonical seed library.

---

## Mapping To Existing Issues

### Issue #11

Strongly covered by this schema:

- canonical pictogram database structure
- source / license metadata
- multilingual names
- category and semantic organization

### Issue #30

Supported by this schema because:

- board structure is explicit
- board membership is explicit
- concept/image split is explicit

### Issue #15

Strongly supported by:

- `ConceptExclusion`
- `ConceptAlias`
- `ConceptContextRule`

This is where lexical ambiguity and semantic-equivalent handling can coexist cleanly.

### Issue #10

Supported by:

- `SymbolAsset`
- `PatientConceptPreference`

This is the cleanest way to support custom uploads without corrupting the base concept library.

---

## Bottom Line

If Tuyujia wants a metadata system that can survive:

- real ambiguity problems
- multiple symbol sources
- board-based AAC structure
- patient-specific preferred pictures
- printable exports

then a flat pictogram record is not enough.

The safest v2 direction is:

- `Concept` for meaning
- `SymbolAsset` for image
- `Board` + `BoardItem` for structure
- `PatientConceptPreference` for personalization
- `ConceptExclusion` for ambiguity control

That is the first schema shape that fully matches what the commercial AAC research is telling us.

---

*Last updated: 2026-05-06*
