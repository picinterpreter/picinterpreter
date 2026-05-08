# ADR-002: Board-First Incremental Migration

Status: Accepted

Date: 2026-05-08

## Context

Tuyujia's product direction has always been board-first:

- a stable home board
- Quick Talk
- Core Words
- Repair / Clarify
- Body / Health
- scene boards for daily needs
- the same card may appear in multiple boards
- different concepts may share the same image when that image is the best fit

Commercial AAC products and the Cboard codebase both confirm this direction. Mature AAC systems do not rely on a flat category browser as the primary patient interface. They use explicit boards, board links, stable positions, repair paths, and scene-based pages.

The current implementation already has several board-like pieces:

- `Category` acts as a patient-facing board in practice.
- `activeCategoryId` is equivalent to `activeBoardId`.
- `categoryPath` is equivalent to board navigation history.
- `linkedCategoryIds` is equivalent to linked board navigation.
- `categoryIds` allows one pictogram card to appear in multiple boards.
- `categoryId` remains useful as the primary semantic category for matching and disambiguation.

The main gap compared with Cboard is that Tuyujia board contents are still often derived from metadata queries:

```ts
pictograms.where('categoryIds').equals(boardId)
```

Cboard instead uses explicit board contents:

```ts
Board.tiles[]
```

This means Cboard can fully control which cells appear on a board, in what order, and whether each cell is a speech card or a link to another board.

## Decision

Tuyujia will not do a full board-model rewrite now.

Instead, Tuyujia will continue a gradual board-first migration:

1. Keep the current `Category` table and `activeCategoryId` navigation for now.
2. Treat `Category` as the current implementation name for a patient-facing board.
3. Keep `categoryId` on pictograms as the primary semantic category used by matching and disambiguation.
4. Keep `categoryIds` as the list of boards where a pictogram may appear.
5. Keep `linkedCategoryIds` as the current linked-board mechanism.
6. Support explicit board content as an incremental layer on top of the existing data model.

The target board content model must eventually support arbitrary mixed ordering of:

- pictogram cards
- board links
- future non-speaking utility cells if needed

Therefore, a plain `tileIds: string[]` list is useful as a transition, but it is not the final expressive model. The longer-term target is a lightweight `tiles[]` list:

```ts
type BoardTile =
  | { type: 'pictogram'; id: string; labelOverride?: string }
  | { type: 'category'; id: string; labelOverride?: string }
```

The exact TypeScript field names may change during implementation, but the architectural requirement is fixed:

**A board must be able to explicitly define a mixed ordered list of cards and board links.**

## Why Not Fully Rewrite Now

A full rewrite from `Category` to `Board` would create more risk than value at this stage.

It would affect:

- `PictogramGrid`
- `CategoryTabs`
- `CategoryLinksDrawer`
- `SettingsDrawer`
- `SuggestionStrip`
- Dexie seed migration
- import and server-side pictogram creation paths
- many existing tests

Most planned MVP features do not require a full rewrite:

- patient expression loop
- local text-to-image matching
- AI sentence generation
- TTS playback
- emergency panel
- saved phrases
- multi-board card reuse
- seed manifest reseeding
- high-risk token guardrails

The current model can already support these as long as it gains an explicit board-content layer.

## Functional Requirements Preserved

This decision must preserve the following product principles:

- A card can appear on multiple boards.
- Different words can share the same image.
- A category or board can itself be referenced as a tile.
- Do not choose a less accurate image only to avoid duplicate images.
- `synonyms` must remain limited to true aliases.
- `relatedTerms` may describe related but distinct concepts, but does not participate in matching.
- `categoryId` remains the semantic primary category.
- Board placement is separate from semantic meaning.

## Migration Path

### Phase 1: Current Transition State

Keep existing behavior:

- boards are still stored in `categories`
- pictograms can use `categoryIds` for multi-board visibility
- `linkedCategoryIds` displays linked boards
- query-derived board content remains as fallback

### Phase 2: Explicit Board Content

Add explicit board content while retaining fallback behavior.

Boards with explicit content should render from that list. Boards without explicit content should continue using the existing `categoryIds` query.

The explicit content model should support mixed tiles, not only pictogram ids.

### Phase 3: Home Board

Make the root patient view a real home board:

- fixed high-value speech cards
- links to primary boards
- stable visual order
- small enough to print

The home board should follow the V1 board layout research:

- yes / no
- help
- stop
- wait
- repeat
- core words
- need anchors
- links to Quick Talk, Core, Repair, Body / Health, Food / Drink, Daily Care, People

### Phase 4: Optional Naming Cleanup

Only after the board behavior is stable, consider renaming implementation concepts:

- `Category` -> `Board`
- `activeCategoryId` -> `activeBoardId`
- `linkedCategoryIds` -> `linkedBoardIds`

This is a cleanup step, not a prerequisite for the product behavior.

## Consequences

Positive consequences:

- avoids a disruptive rewrite
- preserves current working seed, matching, and deployment behavior
- aligns Tuyujia with Cboard and mature AAC board-first architecture
- enables arbitrary home-board and scene-board layouts
- keeps semantic metadata separate from board placement

Tradeoffs:

- the code will temporarily keep `Category` names even though they function as boards
- both query-derived and explicitly curated board content will coexist during migration
- tests must guard that explicit board tile ids and linked board ids point to real records

## Testing Expectations

When explicit mixed board tiles are implemented, tests should verify:

- every `pictogram` tile points to an existing pictogram
- every `category` tile points to an existing category or board
- explicit tile order is preserved
- fallback query behavior still works for boards without explicit tiles
- hidden boards are still reachable through explicit links
- no duplicate ids appear within the same explicit board unless intentionally allowed

## Non-Goals

This decision does not require:

- importing Cboard's default vocabulary
- replacing the current pictogram matcher
- changing AI sentence generation
- removing `categoryId`
- removing `categoryIds`
- removing `manualOrder` immediately
- renaming all code from category to board in one pass

## Summary

Tuyujia should not be rebuilt from scratch to match Cboard.

The right move is to keep the current working structure and add the missing board-first capability: explicit, mixed, ordered board tiles.

That gives Tuyujia the practical benefits of Cboard's board model while protecting the existing vocabulary, matching, seed, and deployment work.
