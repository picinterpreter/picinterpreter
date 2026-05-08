# ADR-003: Use Cboard as the AAC Base for Secondary Development

Status: Accepted

Date: 2026-05-08

Supersedes: ADR-002 for the future production implementation direction.

ADR-002 remains useful as a record of the current prototype's incremental board-first migration, but this ADR changes the preferred long-term implementation strategy.

## Context

Tuyujia originally explored a custom implementation because the project needed more than a static communication board:

- Chinese core vocabulary and adult care scenarios
- patient picture selection to natural sentence generation
- caregiver text or speech to picture sequence reconstruction
- word-picture disambiguation, such as avoiding `开心 -> 开心果`
- high-risk token tests and seed curation guardrails
- personal image preferences and private pictograms
- medical, repair, and caregiver-assisted workflows

During implementation, many architecture issues appeared in the AAC board layer itself:

- whether a board should be a first-class object
- how to store exact board contents and stable order
- how one card can appear on multiple boards
- how a board can appear as a tile that links to another board
- how to support arbitrary mixed ordering of speech cards, board links, and future utility cells
- how to separate semantic category from board placement
- how to avoid using worse images only to avoid duplicate image references

Research into mature commercial AAC products and Cboard showed the same pattern:

- mature AAC systems are board-first, not flat category browsers
- board contents are explicitly curated
- the same card can appear in multiple contexts
- scene boards, quick communication, core words, and repair paths are separate but linked

Cboard already implements much of this AAC board foundation:

- board-first data model
- tiles as board contents
- board links through tile behavior
- navigation state and history
- reusable images and cards
- mature AAC editing and board-management assumptions

The question was not whether Tuyujia's features are easy to add to Cboard. The question was whether they are architecturally possible to fit into Cboard at all.

The conclusion is: yes, they can fit. There is no hard blocker that prevents Tuyujia from using Cboard as the AAC base.

## Decision

Tuyujia should use Cboard as the AAC board-system base for future secondary development.

The current custom implementation should be treated as:

- a working prototype
- a research and validation asset
- a source of Chinese vocabulary, matching logic, tests, and product decisions

It should not be treated as the preferred long-term AAC board infrastructure if the goal is a mature, maintainable AAC product.

The preferred architecture is:

```text
Cboard base
  -> AAC board model
  -> board editor
  -> tile navigation
  -> multi-board card reuse
  -> image/card management

Tuyujia extensions
  -> Chinese vocabulary and adult care boards
  -> Chinese word-picture matching and disambiguation
  -> patient picture sequence to natural sentence
  -> caregiver text/speech to picture sequence
  -> personal image preference mapping
  -> privacy and sync rules
  -> high-risk token regression tests
  -> seed curation rules and clinical board design
```

In short:

**Cboard should provide the AAC board chassis. Tuyujia should provide the Chinese semantic, caregiver-collaboration, and clinical vocabulary layers.**

## Decision Process

### 1. Initial Assumption

The initial product intuition was that Cboard was already mature enough, and Tuyujia would only need to add a small number of features on top of it.

That intuition was partly correct:

- Cboard is strong at the AAC board layer.
- Cboard's board-first model matches mature AAC product practice.
- Cboard is a better foundation for board navigation and editing than repeatedly recreating those concepts from scratch.

### 2. What Changed During Custom Development

While building the custom prototype, the project repeatedly rediscovered board-layer problems:

- `Category` was acting like `Board`.
- `categoryId` mixed semantic meaning with UI placement.
- `categoryIds` was needed because one card belongs on multiple boards.
- explicit `tiles[]` became necessary because board contents cannot be reliably derived from metadata queries.
- the home board needed mixed tiles, not just pictograms.
- card order needed to be curated, not popularity-derived by default.

These were not Tuyujia-specific innovations. They were standard AAC board-system requirements.

That means continuing to build this layer independently would keep consuming effort that should instead go into Tuyujia's real differentiators.

### 3. Can Tuyujia's Unique Features Fit into Cboard?

The answer is yes.

The following Tuyujia features can be added around or on top of Cboard:

- Chinese default boards and vocabulary
- adult aphasia / caregiver care scenario boards
- word-picture matching pipeline
- disambiguation metadata such as semantic domain and excluded meanings
- high-risk token tests
- AI sentence generation from selected tiles
- text-to-picture sequence reconstruction
- private user images and personal image preferences
- local-first seed and user vocabulary behavior
- privacy-aware sync rules

These features are not blocked by Cboard's model. They require real engineering work, but they do not contradict Cboard's architecture.

### 4. What Cboard Does Not Replace

Cboard does not replace Tuyujia's product layer.

It does not provide:

- Chinese word segmentation and semantic matching
- Chinese word-picture disambiguation
- caregiver correction learning
- patient-facing text-to-picture receive mode
- AI natural sentence generation
- adult Chinese medical and care vocabulary
- Tuyujia's high-risk word regression tests
- Tuyujia's seed curation and clinical vocabulary decisions

These remain Tuyujia-owned modules.

## Consequences

Positive consequences:

- avoids continuing to rebuild a mature AAC board foundation
- aligns implementation with mature AAC systems and Cboard's proven model
- reduces future architecture churn around boards, tiles, navigation, and editing
- lets development focus on Tuyujia's true product value
- makes arbitrary board mixing and board-link behavior natural instead of retrofitted

Tradeoffs:

- this is not a tiny plugin-style change
- Cboard will need meaningful secondary development
- Tuyujia-specific data, matcher, AI, and privacy modules still need to be integrated
- migration planning is required to avoid losing current prototype research and tests
- the current custom implementation may stop being the production target

## Implementation Direction

### Phase 1: Preserve Current Knowledge Assets

Keep and reuse:

- Chinese core vocabulary research
- commercial AAC architecture matrix
- board layout draft
- seed curation guide
- high-risk token list
- word-picture matching research
- regression tests for semantic mismatch
- product decisions around duplicate images and multi-board references

### Phase 2: Establish Cboard Fork / Base

Create a Cboard-based development line and verify:

- original Cboard runs locally
- license compatibility is acceptable for the project
- board, tile, image, and navigation models are understood
- default Cboard vocabulary can be replaced or supplemented
- Chinese labels and images can be imported cleanly

### Phase 3: Port Tuyujia Vocabulary and Boards

Port:

- home board
- quick communication board
- core words board
- repair / clarify board
- body / medical board
- food / drink board
- daily care board
- people and caregiver boards
- scene boards from the current seed

The port must preserve these product rules:

- one card may appear on multiple boards
- different words may share the same image
- a board may be referenced as a tile
- do not select a less accurate image just to avoid duplication
- board placement is separate from semantic meaning

### Phase 4: Add Tuyujia Semantic Layer

Integrate:

- Chinese tokenization and matching
- semantic-domain scoring
- disambiguation guards
- excluded meanings
- personal image preference mapping
- caregiver correction records
- high-risk token regression tests

### Phase 5: Add Bidirectional Communication Flows

Add:

- patient selected tiles -> natural Chinese sentence
- caregiver text/speech -> picture sequence
- fullscreen patient display
- correction and confirmation records
- AI fallback with local template fallback

## Non-Goals

This decision does not mean:

- the current custom prototype was wasted
- Tuyujia should copy Cboard's vocabulary as-is
- Tuyujia should abandon Chinese semantic matching
- Tuyujia should remove AI sentence generation
- Cboard already solves every Tuyujia requirement
- duplicate images should be avoided for their own sake
- one card must belong to only one board

## Relationship to ADR-002

ADR-002 was correct for stabilizing the existing prototype:

- add explicit mixed board tiles
- make home board real
- avoid further flat category-browser behavior

However, ADR-002 still assumed that the custom implementation would remain the primary codebase.

This ADR changes that long-term assumption.

For production-oriented development, the better direction is to use Cboard as the AAC base and port Tuyujia's unique layers onto it.

## Summary

The custom prototype proved the product direction, vocabulary logic, and Chinese semantic risks.

It also proved that the AAC board foundation is larger than expected.

Because Cboard already solves the board-system foundation well, Tuyujia should not keep rebuilding that layer.

The next production-oriented architecture should be:

**Cboard as the AAC board base, Tuyujia as the Chinese semantic and caregiver-collaboration layer.**
