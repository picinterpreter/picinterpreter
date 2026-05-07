# Pictogram Metadata Implementation Task Package

This document turns the metadata research and schema work into an execution-oriented task package.

It is meant to answer:

- what should be built first
- what should stay local in MVP
- what should not be forced into Prisma yet
- which parts are already covered by existing issues
- which implementation tasks should be split next

Related documents:

- [Pictogram metadata field checklist](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/pictogram-metadata-field-checklist.md)
- [Pictogram metadata schema v2 draft](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/pictogram-metadata-schema-v2-draft.md)
- [Pictogram metadata schema v2 implementation mapping](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/pictogram-metadata-schema-v2-implementation-mapping.md)
- [Tuyujia v1 core library architecture proposal](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/tuyujia-v1-core-library-architecture-proposal.md)
- [Tuyujia v1 initial concept list](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/tuyujia-v1-initial-concept-list.md)
- [Implementation task index](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/implementation-task-index.md)

---

## Executive Summary

The current metadata design is sufficient for Tuyujia V1.

The main implementation rule should be:

1. curate the library in source files first
2. import it into Dexie for local runtime use
3. keep patient-specific overrides local-only in MVP
4. avoid pushing the full pictogram library schema into Prisma too early

That means V1 should focus on five implementation blocks:

- curated concept library
- curated symbol asset library
- board structure
- ambiguity guardrails
- patient-specific preferred symbol overrides

---

## What Already Has a Home

Some of the metadata work is already partially covered by existing issues.

| Topic | Existing issue | Coverage status |
|---|---|---|
| Structured pictogram database | [#11](https://github.com/picinterpreter/picinterpreter/issues/11) | Parent issue exists, but needs schema-v2-based implementation split |
| Custom uploaded pictures | [#10](https://github.com/picinterpreter/picinterpreter/issues/10) | Partially covers private assets and personal images |
| Semantic mapping and mismatch correction | [#15](https://github.com/picinterpreter/picinterpreter/issues/15) | Partially covers ambiguity handling, but not full exclusion modeling |
| Board / library import structure | [#30](https://github.com/picinterpreter/picinterpreter/issues/30) | Relevant to board and picture-set structure |
| Receiver local persistence | [#57](https://github.com/picinterpreter/picinterpreter/issues/57) and related | Adjacent, but not a substitute for the curated metadata layer |

The gap is that none of these issues alone define a clean implementation sequence for:

- `Concept`
- `SymbolAsset`
- `Board`
- `ConceptExclusion`
- `PatientConceptPreference`

This document fills that gap.

---

## V1 Build Order

Recommended implementation order:

| Order | Block | Why first |
|---|---|---|
| 1 | Curated source-file schema and importer | Everything else depends on stable IDs and loadable records |
| 2 | Dexie library tables for concepts, assets, boards, exclusions | Makes the local AAC library real in runtime |
| 3 | Board rendering based on structured board items | Converts research structure into product UI |
| 4 | Matching guardrails using aliases and exclusions | Directly addresses `开心 -> 开心果` class failures |
| 5 | Patient-specific preferred symbol overrides | Unlocks personalized AAC without destabilizing the base library |
| 6 | Phase 2 context rules and progressive visibility | Valuable later, but not required to ship the first useful version |

---

## Task Package

## Task 1: Curated Metadata Source Format

**Goal**

Define a source-of-truth format for the curated AAC library that can be maintained by humans and imported by the app.

**Scope**

- decide file format: JSON, CSV, or hybrid
- define required V1 records:
  - `Concept`
  - `ConceptAlias`
  - `ConceptExclusion`
  - `SymbolAsset`
  - `ConceptSymbolLink`
  - `Board`
  - `BoardItem`
- define stable IDs and naming conventions
- define validation rules for required fields

**Why it matters**

Without this, the team will keep writing one-off library data that is hard to maintain, compare, or import safely.

**Recommended storage**

- source files in repo
- imported/generated into Dexie

**Related issues**

- `#11`
- `#30`

**Suggested acceptance checks**

- a small seed library can be loaded from source files without manual database editing
- concept IDs, symbol IDs, and board IDs are stable across imports
- broken references are caught during validation

---

## Task 2: Dexie Library Schema for Curated Metadata

**Goal**

Materialize the curated library in the local runtime database.

**Scope**

Add or extend Dexie tables for:

- `Concept`
- `ConceptAlias`
- `ConceptExclusion`
- `SymbolAsset`
- `ConceptSymbolLink`
- `Board`
- `BoardItem`

**Why it matters**

This is the layer that turns the research library into something the patient and caregiver interfaces can actually use offline.

**Recommended storage**

- Dexie

**What not to do yet**

- do not mirror the full library schema into Prisma
- do not add Phase 2 curation fields unless needed by runtime

**Related issues**

- `#11`
- `#35`
- `#57`

**Suggested acceptance checks**

- the app can query a concept by ID and resolve its default symbol
- a board can be loaded with ordered board items
- exclusions can be looked up locally during matching

---

## Task 3: Board Structure and Ordered Rendering

**Goal**

Move from flat category browsing to structured, stable boards.

**Scope**

- implement `Board` and `BoardItem` loading
- support ordered rendering from `positionIndex`
- support fixed board membership rather than only tag/category filtering
- support the first V1 boards:
  - home
  - quick talk
  - core words
  - repair / clarify
  - body / health

**Why it matters**

Commercial AAC references show that a usable system is not just a picture library; it is a stable board system.

**Recommended storage**

- source files + Dexie

**Related issues**

- `#11`
- `#30`
- `#83`

**Suggested acceptance checks**

- a board renders in fixed order by default
- the same concept can appear on multiple boards
- the board order survives app reload

---

## Task 4: Ambiguity Guardrails in Matching

**Goal**

Prevent known high-risk mismatches such as `开心 -> 开心果`.

**Scope**

- use `ConceptAlias` during candidate lookup
- use `ConceptExclusion` to hard-block or penalize bad matches
- add a minimal runtime rule layer for known Chinese ambiguity cases
- seed the first ambiguity watchlist from current research docs

**Why it matters**

This is one of the clearest product-quality failures the project has already observed in real use.

**Recommended storage**

- source files + Dexie

**Related issues**

- `#15`
- `#8`

**Suggested acceptance checks**

- `开心` no longer resolves to `开心果`
- exclusion lookup runs locally and does not require network access
- known ambiguity fixtures can be regression-tested

---

## Task 5: Patient-Specific Preferred Symbol Overrides

**Goal**

Allow different patients to prefer different default images for the same concept without mutating the base library.

**Scope**

- implement a minimal `PatientProfile`
- implement `PatientConceptPreference`
- support:
  - built-in alternate symbol selection
  - custom uploaded image selection
- resolve final display symbol in this order:
  1. patient override
  2. concept default symbol
  3. fallback symbol if needed

**Why it matters**

Commercial AAC practice and aphasia usage both show that personal meaning often depends on the individual, not just the global library.

**Recommended storage**

- Dexie
- local-only in MVP

**What not to do yet**

- do not sync personal image preferences to Prisma by default
- do not require multi-user shared editing in the first pass

**Related issues**

- `#10`
- `#11`

**Suggested acceptance checks**

- patient A and patient B can prefer different images for the same concept
- resetting the base library does not destroy the curated default mapping
- private custom pictures do not leak into the global library

---

## Task 6: Optional Phase 2 Context Rules

**Goal**

Improve matching/ranking using scene or communication context, but only after the V1 guardrails are in place.

**Scope**

- implement minimal `ConceptContextRule`
- support context effects such as:
  - `prefer`
  - `boost`
  - `penalize`
  - `block`
- first contexts likely to matter:
  - `food-drink`
  - `body-health`
  - `repair`
  - `emotion`

**Why it matters**

Useful for ranking refinement, but not the first thing that should be built.

**Recommended storage**

- source files + Dexie

**Related issues**

- `#15`
- `#8`

**Suggested acceptance checks**

- context rules improve ranking in known cases
- disabling context rules still leaves the system functional

---

## Minimal V1 Deliverable

If the team wants the smallest credible implementation slice, V1 only needs:

- source-file definitions for:
  - `Concept`
  - `ConceptAlias`
  - `ConceptExclusion`
  - `SymbolAsset`
  - `ConceptSymbolLink`
  - `Board`
  - `BoardItem`
- Dexie support for those records
- one patient-local override table:
  - `PatientConceptPreference`
- one usable initial board set:
  - home
  - quick talk
  - core words
  - repair / clarify
  - body / health
- a seeded ambiguity fixture list

This is enough to unlock:

- fixed curated boards
- basic personalized symbol choice
- local offline library behavior
- structural prevention of the known mismatch class

---

## Explicit Non-Goals for MVP

To keep scope controlled, V1 should **not** require:

- full Prisma synchronization of the curated library
- a full remote admin CMS
- progressive vocabulary reveal
- sophisticated ranking scores for every symbol candidate
- universal context modeling
- complete multilingual authoring support

Those can come later after the V1 library is stable.

---

## Recommended Next Issue Split

If the team wants to split this into smaller implementation issues, the next clean task breakdown is:

1. `Define source-file schema and validation for curated pictogram metadata`
2. `Add Dexie tables for concept, symbol, board, and exclusion metadata`
3. `Load structured boards from curated metadata instead of flat category data`
4. `Use concept exclusions to block known ambiguity mismatches`
5. `Store patient-specific preferred symbol overrides locally`

This split is small enough for contributor work, but still follows one coherent architecture.

---

## Final Recommendation

The project does **not** need more metadata brainstorming before implementation.

The highest-value next move is:

- treat schema v2 as settled enough for V1
- implement the source-file + Dexie path first
- keep personalization local-only
- delay Prisma expansion until there is a real server-side editing or sync need

That path is the best match for the current product decisions, the existing issue set, and the offline-first AAC requirement.
