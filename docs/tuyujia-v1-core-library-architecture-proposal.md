# Tuyujia V1 Core Library And Board Architecture Proposal

This document turns the commercial AAC comparison work into a first-pass architecture proposal for Tuyujia.

It is a product design proposal, not a final specification.

The goal is to answer:

- what the first Tuyujia core library should look like
- how the patient-side expression flow should be structured
- how the caregiver / receiver-side flow should be structured
- what layers should exist from day one
- what should be delayed until later phases

Reference inputs:

- [Commercial AAC core library / architecture matrix](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/commercial-aac-core-library-architecture-matrix.md)
- [AAC core library survey](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/aac-core-library-survey.md)
- [AAC reference inventory](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/aac-reference-inventory.md)

---

## Product Position

Tuyujia is not trying to become:

- a generic child AAC app
- a giant symbol browser
- a pure sentence generator

Tuyujia is best positioned as:

**an aphasia-aware, caregiver-supported, picture-first communication system for Chinese-speaking adults and families**

That means the architecture should optimize for:

- fast expression of needs, feelings, actions, and repair phrases
- adult daily life rather than child-school vocabulary
- strong support for misunderstanding repair
- simple patient-side interaction
- richer caregiver-side interpretation and correction
- printable backup from the start

---

## Core Design Decision

Tuyujia should have **different logic on the two sides**.

### Patient expression side

The patient side should prioritize:

- stability
- speed
- low visual search burden
- intent-first access
- repair/help access

It should learn most from:

- `LAMP` for stable button placement
- `Super Core` for printable, stable core layout
- `Voco Chat` for intent-first pathways
- `TD Snap Aphasia` for repair/cue/help patterns

### Caregiver / receiver side

The caregiver side should prioritize:

- richer vocabulary organization
- sentence reconstruction
- ambiguity control
- context-based disambiguation
- correction capture

It should learn most from:

- `WordPower` for sentence-building support
- `Core First` for core + topics + quick messages separation
- `Crescendo` for progressive vocabulary expansion
- `Communication Journey Aphasia` for adult relevance
- `Unity` for semantic disambiguation thinking

---

## V1 Board Stack

Tuyujia V1 should not be one giant board.

It should be a stack of layers.

| Layer | Purpose | Who uses it most | V1 priority |
|---|---|---|---|
| Core layer | High-frequency words always available | Patient | Must have |
| Quick expression layer | Fast, whole-message actions like yes/no/help/stop | Patient | Must have |
| Repair / support layer | Clarify, repeat, wrong, not this, I mean, help me say | Patient | Must have |
| Scene layer | Daily-life topic vocabulary | Patient and caregiver | Must have |
| Medical / body layer | Symptoms, pain, body, hospital, medicine | Patient and caregiver | Must have |
| Sentence reconstruction layer | Build and interpret fuller intended meaning | Caregiver | Must have |
| Personalization layer | Preferred symbols, family people, home items | Caregiver | Must have |
| Progressive expansion layer | Hide/reveal advanced vocabulary | Caregiver | Phase 2 |
| Visual scene / photo layer | Familiar-photo-based communication boards | Patient | Phase 2 |

---

## V1 Patient-Side Architecture

The patient side should have **four top-level entry modes**, not dozens of categories.

### 1. Quick Talk

Purpose:

- fastest possible communication
- very low cognitive load
- usable when tired, upset, or in a hurry

Suggested content:

- yes
- no
- help
- stop
- wait
- again
- finished
- not this
- I do not know
- I want to say something
- call family
- call nurse / doctor
- pain
- uncomfortable

Why it matters:

- this is the shortest path to useful communication
- this is also the best printable fallback board

### 2. Core Words

Purpose:

- support flexible expression with a small stable set

Suggested V1 target:

- around 36-60 stable high-frequency concepts on the patient side

Suggested types:

- people words: I, you
- want / not / more / again / finished
- go / come / give / get / do / make / help
- this / that / here / there
- good / bad / same / different
- yes / no / can / like
- question support: what / where / when / who

Why this size:

- small enough for stability
- large enough to combine with scene boards
- consistent with what `Project Core`, `Quick Core`, and `Super Core` suggest for a usable starting point

### 3. Needs And Scenes

Purpose:

- access practical fringe vocabulary

Top V1 scenes should be:

- food and drink
- body and health
- toilet and hygiene
- sleep and rest
- people and relationships
- places
- daily activities
- feelings
- clothes
- home objects
- transport

Design rule:

- do not expose 20+ categories on the first screen
- let users enter scenes from one simple `Needs / Topics` entry point

### 4. Repair And Clarify

Purpose:

- reduce communication breakdown

This layer is missing in many lightweight apps and should be explicit in Tuyujia.

Suggested V1 content:

- not this
- wrong
- again
- say slowly
- show me choices
- I mean...
- close
- similar
- different
- I want another word
- I know it but cannot say it
- use picture
- write it

This layer is especially important for aphasia.

---

## V1 Caregiver-Side Architecture

The caregiver side can be more complex because the caregiver is the navigator and interpreter.

Suggested caregiver-side flow:

1. Start from the patient-selected symbols or a caregiver-entered phrase
2. Map to core + scene vocabulary candidates
3. Use context to disambiguate
4. Offer 2-5 likely interpretations
5. Let caregiver confirm or correct
6. Save correction for future personalization

This means the caregiver side should expose:

- more categories
- more search
- alternate symbol candidates
- sentence reconstruction candidates
- error correction tools

It should not force the patient to do the same work.

---

## Suggested V1 Core Library Shape

Tuyujia V1 should define three vocabulary scopes.

### Scope A: Stable patient-visible core

Target:

- `36-60` concepts

Function:

- always reachable
- layout should rarely change

### Scope B: Shared scene vocabulary

Target:

- `150-250` concepts

Function:

- practical daily communication
- reused across multiple boards

Examples:

- drink, water, tea, rice, noodle, medicine, toilet, bed, shirt, shoe, phone, home, hospital, pain, hot, cold, tired

### Scope C: Extended caregiver-side interpretation vocabulary

Target:

- `300-500` concepts total in V1 system

Function:

- not all must be shown to the patient at once
- can support receiver-side matching, sentence rebuilding, and future expansion

This is the right place for:

- synonyms
- alternate symbol mappings
- ambiguity controls
- scene-specific variants

---

## V1 Symbol Metadata Requirements

If Tuyujia wants to avoid future ambiguity problems, the V1 architecture should already support richer metadata even if the UI stays simple.

Each concept should be able to store:

- canonical meaning
- display label
- aliases
- excluded meanings
- semantic domain
- scene tags
- adult / child relevance
- medical relevance
- preferred symbol id
- alternate symbol ids
- patient-specific preferred symbol override

Example:

`开心`

- canonical meaning: happy / glad
- aliases: 高兴, 开心的
- excluded meanings: 开心果
- semantic domain: emotion
- scene tags: feelings, social
- preferred symbol: smiling face

This is where the long-term solution to `开心 -> 开心果` begins.

---

## V1 Information Architecture Recommendation

The first screen on the patient side should not look like an app store.

Recommended top-level patient layout:

| Area | Function |
|---|---|
| Left / top stable strip | Quick Talk |
| Main center area | Core Words |
| One clear entry | Needs / Topics |
| One clear entry | Repair / Clarify |

Recommended top-level caregiver layout:

| Area | Function |
|---|---|
| Candidate interpretation area | Top interpretations |
| Context tools | scene, person, time, symptom context |
| Correction tools | wrong symbol, replace symbol, add symbol, reorder |
| Reconstruction area | candidate sentence outputs |

The caregiver layout can be denser because it is an interpretation workspace, not a patient expression surface.

---

## What Should Not Be In V1

To keep the architecture strong, Tuyujia V1 should avoid trying to do all of this at once:

- giant flat vocabulary exposure
- deep folder trees on the patient side
- end-to-end automatic sentence generation as the only output
- too many empty categories
- personalized photo scenes as a dependency for basic usability
- over-optimized AI ranking before enough correction data exists

These are better placed in Phase 2:

- progressive vocabulary reveal
- patient-specific symbol preference learning
- photo-backed visual scenes
- stronger semantic ranking
- round-trip quality evaluation

---

## V1 Printable Strategy

Tuyujia should ship with printable support as part of V1 architecture.

Minimum printable set:

1. Quick Talk board
2. Core board
3. Body / medical board
4. Food / drink board
5. Toileting / hygiene board

Why this matters:

- hospital use
- bathing / outdoor use
- device failure
- reduced sensory load
- caregiver modeling

The commercial references are unusually consistent on this point.

---

## Recommended V1 Build Order

### Step 1

Define the stable patient-visible core:

- choose `36-60` concepts
- freeze initial positions

### Step 2

Define the first five high-value scene boards:

- food and drink
- body and health
- toilet and hygiene
- feelings
- people and places

### Step 3

Define the repair layer:

- clarify
- wrong
- again
- show choices
- I mean

### Step 4

Define caregiver-side interpretation rules:

- scene weighting
- ambiguity exclusions
- alternate symbol suggestions
- sentence candidate generation

### Step 5

Define printable outputs for the same layers.

---

## Bottom Line

Tuyujia V1 should be built as:

- a small stable core
- plus quick whole-message expressions
- plus a dedicated repair layer
- plus a few adult daily-life scene boards
- plus a richer caregiver-side interpretation workspace

The most important synthesis is:

**LAMP-level stability for patient expression, WordPower/Core First-level structure for caregiver interpretation, and TD Snap Aphasia-level respect for repair and adult relevance.**

That is a clearer and safer direction than either:

- a giant category browser
- or a pure AI sentence reconstruction tool

---

## Immediate Next Output

If we continue from here, the highest-value next artifact is:

**a concrete V1 concept list**

That would mean:

1. the first `36-60` stable core concepts
2. the first `150-250` shared scene concepts
3. the first repair phrase set
4. the first printable board mapping

That is the point where this architecture can turn into implementation work.

---

*Last updated: 2026-05-06*
