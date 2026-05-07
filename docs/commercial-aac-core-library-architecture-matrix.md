# Commercial AAC Core Library / Architecture Matrix

This document compares the mature commercial AAC systems for which **real local reference materials have already been downloaded and verified** in the local archive.

It is not a product ranking. It is a design-input document for Tuyujia.

Scope of this comparison:

- only products with verified local PDF or official-page materials
- only public materials actually collected under the local archive
- focus on core vocabulary architecture, board structure, aphasia relevance, low-tech backup, and what Tuyujia can learn

Local archive root:

`D:\used-by-codex\picinterpreter\aac-core-sources\commercial`

Reference index:

- [AAC reference inventory](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/aac-reference-inventory.md)
- [AAC core library survey](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/aac-core-library-survey.md)
- [Local archive README](D:/used-by-codex/picinterpreter/aac-core-sources/README.md)

---

## Comparison Matrix

| Product / Family | Verified local materials | Main architecture logic | Core words behavior | Fringe / topic behavior | Best fit users | Aphasia relevance | Low-tech backup strength | Chinese / Mandarin relevance | Strongest lesson for Tuyujia |
|---|---|---|---|---|---|---|---|---|---|
| TD Snap Core First | Core First books, Chinese boards, user manual, training cards | Core-first grid plus topics plus quick messages | High-frequency words stay prominent across layouts | Topic pages and quick-response content are separated from the core | General AAC, school, family, adult daily use | Medium | Very strong | Strong because Chinese boards are collected | Separate core, quick expressions, and scene/topic boards instead of mixing everything into one layer |
| TD Snap Aphasia | Aphasia communication book, implementation guide, pocket guide, training cards, repair/cue/photo handouts | Conversation repair plus topic support plus aphasia-specific prompts | Less about abstract core-only teaching; more about usable conversation support | Topic/interest and repair content are explicit | Adults with acquired aphasia | Very high | Very strong | Medium; structure matters more than language here | Build explicit repair/help/clarification paths, not only symbol lookup |
| Proloquo2Go / Crescendo | Core word boards, quick communication boards, official public vocab pages | Core + fringe with progressive visibility and templates | Core stays accessible across vocabulary levels | Fringe expands through folders/templates and visibility levels | Broad AAC population | Medium | Medium to strong | Medium | Progressive visibility matters: caregivers should be able to hide/reveal vocabulary without breaking stable core access |
| TouchChat / WordPower | WordPower manual, QRGs, Chinese QRG/manual, manual boards | Syntax-driven core layout with strong next-word logic | Core is optimized for sentence building | Fringe/category pages support continuation of sentence patterns | Fluent AAC users, language growth, adult users | Medium | Strong | Strong because Mandarin and Cantonese materials are collected | Receiver-side and advanced patient-side flows should preserve sentence-building logic, not just categories |
| Communication Journey Aphasia | Aphasia vocabulary user guide, public overview pages | Aphasia-specific vocabulary with adult communication priorities | Core is less the headline than usable adult communication | Content is centered on adult life, healthcare, daily communication, and recovery | Adults with aphasia | Very high | Medium | Strong because Mandarin/Simplified Chinese public references exist | Adult aphasia communication needs should be treated as a first-class design target, not borrowed from child AAC |
| LAMP Words for Life | Manual boards, backup board, VI materials, workbook | Motor planning first; one word, one stable path | Core location stability is the whole point | Fringe exists, but stability beats browsing depth | Users who benefit from motor consistency | Medium | Very strong | Medium | Patient expression should avoid moving important buttons around between scenes or releases |
| Unity / Minspeak | Unity 45/60/84/144 charts, Unity workbook, Minspeak pages | Semantic compaction: multi-meaning icons and sequences | Core is compact and combinatorial rather than only visible as a flat list | Meaning emerges from icon combinations rather than deep folders | Advanced AAC systems, long-term learning | Low to medium for direct aphasia use, high for architecture thinking | Medium | Medium | One pictogram may need aliases, context rules, exclusions, and sequence meaning; this is directly relevant to ambiguity control |
| Smartbox Super Core | Resource pages, printable-board pages, one verified Super Core 50 Widgit board | Stable core board with printable low-tech variants | Core positions remain stable and printable | Fringe is paired around the core board structure | Early and intermediate symbol communicators | Medium | Very strong | Weak for Chinese directly, strong structurally | Printable low-tech fallback should be designed as a normal mode, not an afterthought |
| Smartbox Voco Chat | Official resource page and product page | Pragmatics-driven communication by intent | Core is subordinated to communication purpose | Pathways are organized by why you are communicating | Users needing fast, intent-first communication | Medium to high for adult support | Medium | Weak directly, strong conceptually | Patient-side fast access should support intent paths like ask, refuse, help, explain, repair, self-regulate |
| Project Core | 36-location boards in PCS / High Contrast / SymbolStix / Widgit, 4-square, 4-inline | Universal core vocabulary coverage with simple board variants | Small set of repeated high-value core words | Minimal fringe; designed for broad reuse and teaching | Entry-level AAC, education, broad access | Medium | Strong | Medium | A small, stable universal core is realistic and useful; Tuyujia does not need a huge initial vocabulary to be valuable |
| Avaz AAC | Core board and topic boards | Practical daily communication with caregiver-friendly groupings | Core exists, but usability and daily communication are emphasized | Topic boards are concrete and easy to understand | Early AAC, home use | Low to medium | Medium | Medium | Simplicity and caregiver comprehension matter; scene grouping should stay understandable without specialist training |
| Weave Chat AAC | Adult core board, EI core board, safety, illness, accessibility, menses boards | Adult-oriented core plus explicit fringe packs | Core board exists, but adult life topics are visible and honest | Fringe packs cover health, emergency, accessibility, relationships, identity | Adults, especially under-served adult topic areas | Medium to high | Strong | Weak directly, strong conceptually | Adult AAC needs are broader than food/toilet/emotions; health, safety, accessibility, and private life deserve real board space |
| Dialogue AAC / Essence | Manual and Essence QRG | Practical vocabulary system with lighter-weight structure | Core is present but less central than in LAMP/Core First | Useful as a simplified vocabulary-system reference | General AAC, lighter setup | Low to medium | Medium | Weak directly | Useful reminder that not every product needs maximal complexity; some users need a simpler operating model |
| AbleNet QuickTalker Freestyle monthly core packet | Monthly core-words packet | Teaching/implementation packet around core words | Reinforces repeated core usage | Fringe is introduced through activities | Early AAC and education | Low | Medium | Weak directly | Teaching materials matter: vocabulary is not enough without caregiver modeling and routines |
| CoughDrop / OpenAAC | Public board page, OBF references, public pages | Cloud-first boards plus open formats plus public low-tech boards | Depends on board set; architecture focus is openness and portability | Strong support for cross-device boards and public boards | Teams, schools, cross-device use | Medium | Strong | Medium | Treat low-tech and digital as one system; printable board + QR/digital continuation is a powerful service model |

---

## What The Matrix Really Says

Across these products, there are several recurring patterns.

### 1. No mature product treats categories alone as enough

The more mature systems always combine at least two of these:

- stable core words
- topic/fringe boards
- quick messages or repair phrases
- intent/pragmatics pathways
- low-tech printable backups

For Tuyujia, this means a pure "category browser" is not enough.

### 2. Patient-side and caregiver-side should not be optimized the same way

The materials strongly suggest two different interaction logics:

- patient expression side should favor stability, speed, repair, and intent-first access
- caregiver / receiver side can tolerate richer categorization, search, and sentence reconstruction support

This is one of the clearest cross-product lessons.

### 3. Low-tech is not optional in serious AAC practice

The strongest products all publish printables, books, or backup boards:

- TD Snap
- LAMP
- Super Core
- Project Core
- Weave Chat
- WordPower manual boards

For Tuyujia, printable backup should be treated as normal product architecture, especially for:

- hospital use
- bathing / water environments
- outdoor use
- device failure
- reduced visual/cognitive load

### 4. Aphasia products behave differently from child-development AAC products

The aphasia-oriented materials do not only teach vocabulary growth. They focus much more on:

- repair
- cueing
- topic support
- adult life relevance
- photo support
- communication breakdown recovery

That makes `TD Snap Aphasia` and `Communication Journey Aphasia` especially important for Tuyujia.

### 5. Ambiguity control needs metadata, not just better search

`Unity / Minspeak` and the stronger core systems point to the same underlying truth:

- one picture can carry multiple meanings
- one meaning can be expressed by multiple pictures
- context changes interpretation

So for Tuyujia, the long-term answer to things like `开心 -> 开心果` is not only retrieval tuning. It is also better metadata:

- aliases
- exclusion hints
- semantic domain
- phrase context
- patient-specific preferred symbol mapping

---

## Product Lessons By Design Question

| Tuyujia design question | Best commercial references |
|---|---|
| How should the first core vocabulary be kept small but useful? | Project Core, Core First, Super Core |
| How should patient buttons stay stable? | LAMP, Core First, Super Core |
| How should sentence-building remain usable? | WordPower, Core First, Crescendo |
| How should adult aphasia support differ from child AAC? | TD Snap Aphasia, Communication Journey Aphasia, Weave Chat |
| How should fast repair/help phrases be handled? | TD Snap Aphasia, Core First, Voco Chat |
| How should ambiguity and semantic grouping evolve over time? | Unity / Minspeak, Crescendo, WordPower |
| How should low-tech fallback be built in? | Project Core, LAMP, Super Core, TD Snap, Weave Chat |
| How should printable and digital systems connect? | CoughDrop / OpenAAC, TD Snap, Super Core |

---

## Practical Recommendation For Tuyujia

If we translate this matrix into product decisions, the safest synthesis is:

### Expression side

- borrow `LAMP` and `Super Core` stability
- borrow `Voco Chat` intent-first thinking
- borrow `TD Snap Aphasia` repair/help pathway design

### Receiver / caregiver side

- borrow `WordPower` and `Crescendo` structure for richer organization
- borrow `Core First` separation of core, topics, and quick messages
- borrow `Communication Journey Aphasia` adult relevance

### Vocabulary policy

- start with a `Project Core` sized stable core mindset
- expand with `Core First` / `Crescendo` style fringe layering
- prepare future metadata in a `Unity`-informed way so symbol meaning is context-aware rather than flat

### Product operations

- treat printables as part of the product, not a side document
- keep adult/aphasia scenarios visible from day one
- collect patient-specific preferred symbol mappings as first-class data

---

## Current Bottom Line

Based on the verified locally collected materials, Tuyujia now has enough commercial reference coverage to support a serious first-pass core library and board architecture design.

The most important references are no longer missing:

- `Core First`
- `TD Snap Aphasia`
- `Crescendo`
- `WordPower`
- `Communication Journey Aphasia`
- `LAMP`
- `Unity / Minspeak`
- `Super Core`
- `Voco Chat`
- `Project Core`

That means the next high-value step is no longer "search for more products".

The next high-value step is:

1. define Tuyujia's own first core board architecture
2. define its core/fringe/repair/intent layers
3. map the first 100-300 Chinese concepts against this matrix

---

## Local Material Map

For quick access, the main local folders behind this comparison are:

- [TD Snap Core First](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/td-snap-core-first)
- [TD Snap Aphasia](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/td-snap-aphasia)
- [AssistiveWare Proloquo / Crescendo](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/assistiveware-proloquo)
- [TouchChat / WordPower](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/touchchat-wordpower)
- [WordPower manual boards](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/wordpower-manual-boards)
- [LAMP Words for Life](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/lamp-words-for-life)
- [Unity / Minspeak](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/prc-saltillo-unity)
- [Smartbox Super Core](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/smartbox-super-core)
- [Smartbox Voco Chat](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/smartbox-voco-chat)
- [Project Core](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/project-core)
- [Avaz AAC](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/avaz-aac)
- [Weave Chat AAC](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/weave-chat)
- [CoughDrop / OpenAAC public boards](D:/used-by-codex/picinterpreter/aac-core-sources/commercial/coughdrop-public-boards)

---

*Last updated: 2026-05-06*
