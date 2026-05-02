# AAC Core Library Survey

This document collects reference material for Tuyujia's core pictogram library: open AAC board systems, pictogram sources, commercial AAC vocabulary patterns, and the local CBoard exports provided by the product owner.

The goal is not to copy another product's vocabulary. The goal is to learn how mature AAC tools organize core words, fringe vocabulary, scenes, categories, and reusable board links.

## Summary

For Tuyujia MVP, the safest direction is:

1. Use a **Board / PictureSet** model instead of a flat category list.
2. Use **ARASAAC** as the main pictogram source, while preserving per-pictogram license metadata.
3. Use **CBoard / OBF / AsTeRICS** as structural references.
4. Use commercial AAC systems only as product-pattern references.
5. Build a first offline core library around **300-500 scene-first pictograms**, then expand toward 500-800 after caregiver testing.

## Reusable Or Open References

| Source | What To Learn | Reuse Level | Notes |
|---|---|---:|---|
| Open Board Format | Standard concepts: board, button, image, linked board, `.obf` / `.obz` packaging | High for schema | Good reference for import/export compatibility. |
| CBoard | Open-source AAC board app and board export structure | High for architecture, medium for seed data | Do not reuse private user photos from exports. GPL constraints matter if copying code. |
| AsTeRICS AAC Data | Public board and communicator examples, including Quick Core and hospital communication | High for structure, license-sensitive for data | Repository documents `boards`, `communicators`, metadata, translated grids, and grid backup files. |
| ARASAAC | Main pictogram source and multilingual keywords | High, with license constraints | Current project metadata treats ARASAAC as CC BY-NC-SA 4.0. Keep per-item license. |
| OpenSymbols / Global Symbols | Symbol search aggregator and alternative symbol sets | Medium | Useful for runtime backfill, but license must be preserved per symbol. |

## Commercial Pattern References

These are not direct data sources. They are useful for understanding how mature AAC products structure vocabulary.

| Product | Pattern To Learn | Tuyujia Implication |
|---|---|---|
| Proloquo2Go / Crescendo | Core words plus fringe folders; robust vocabulary at different grid sizes | Keep high-frequency words always accessible; put scene-specific vocabulary in boards. |
| TD Snap Core First | Core vocabulary, topics, quick messages / quickfires, behavior supports | Separate quick expressions from general vocabulary; support scene boards. |
| TouchChat WordPower | Core vocabulary with category/fringe pages | Do not make categories the only navigation method; keep core access stable. |
| LAMP Words for Life | Motor planning and stable word locations | Avoid moving core buttons unpredictably; patient-side UI should stay stable. |
| Avaz AAC | Core vocabulary plus practical categories for daily communication | Use simple, caregiver-understandable scene groupings for first-run setup. |

## AsTeRICS Findings

The public `asterics/Asterics-AAC-Data` repository contains two useful levels:

- `boards`: single-topic boards, such as shower, Lego play, snacks, eating, drawing.
- `communicators`: self-contained communicator sets.

Observed communicator examples:

| Communicator | Why It Matters |
|---|---|
| Quick Core 24 / 40 / 60 / 84 | Core, motor-planning vocabulary sets at different grid sizes. |
| Global-Core Communicator ARASAAC | ARASAAC robust vocabulary with both category-distributed core vocabulary and essential-word core vocabulary. |
| Communication in hospital | Hospital-context communication set, multilingual, tagged BASIC / MEDICAL / HOSPITAL. |
| CommuniKate20 | Small-grid communicator pattern. |
| Vocal Flair 24 / 40 / 60 / 84 / 112 | Multiple grid sizes for different access needs. |

Useful lesson: Tuyujia should not treat "one category = one folder" as the final model. Mature AAC systems use multiple board sizes, topic boards, linked boards, and reusable core vocabulary.

## Local CBoard Export Findings

The local CBoard export is valuable as a structure sample, but it includes private names/photos and should not be treated as public seed data.

### CBoard Classic / Full Export

The larger export contains 127 boards. The top-level CBoard Classic Home includes these major groups:

| Group | Count |
|---|---:|
| quickChat | 9 |
| time | 18 |
| food | 33 |
| drinks | 19 |
| snacks | 15 |
| activities | 20 |
| emotions | 11 |
| body | 26 |
| clothing | 15 |
| people | 13 |
| describe | 40 |
| kitchen | 16 |
| school | 16 |
| animals | 32 |
| technology | 22 |
| weather | 9 |
| plants | 27 |
| sports | 21 |
| transport | 28 |
| places | 15 |
| position | 18 |
| toys | 24 |
| actions | 41 |
| questions | 7 |
| furniture | 21 |
| hygiene | 18 |
| numbers | 10 |

Largest boards observed:

| Board | Count |
|---|---:|
| Creative, Sensory, & Numeracy | 77 |
| Universal Core 11x6 | 66 |
| actions / 行动 | 44 |
| describe / 描述 | 41 |
| 日常使用黄炳灿制作 | 35 |
| food | 34 |
| animals / 动物 | 32 |
| Chinese / 中文 | 30 |

### User Daily Export

The smaller user export contains 51 boards. Its top board contains 35 tiles / links:

| Group | Count | Notes |
|---|---:|---|
| quickChat | 14 | Quick expressions. |
| 身体 | 25 | Body parts and health-related expressions. |
| 人物 | 13 | Includes private names/photos; do not reuse as public seed. |
| activities | 20 | Daily activities. |
| 情绪 | 12 | Feelings. |
| 服装 | 15 | Clothing. |
| 饮料 | 19 | Drinks. |
| food | 34 | Food. |
| 厨房 | 16 | Kitchen objects. |
| 天气 | 9 | Weather. |
| 家具 | 21 | Furniture. |
| 地点 | 19 | Places; includes local/private place names. |
| 医疗 | 6 | Doctor, nurse, medicine, vaccine. |
| 体育 / 运动 | 21 | Sports. |
| 技术 | 17 | Technology. |
| 卫生 | 17 | Hygiene. |
| 问题 | 7 | Question words. |
| 玩具 | 24 | Toys. |
| 零食 | 15 | Snacks. |
| 交通出行 / 运输 | 26 | Transport. |
| 时间和日期 | 18 | Time. |
| 行动 | 44 | Actions. |
| 描述 | 41 | Descriptors. |
| 音乐 | 0 | Placeholder / empty board. |
| 机构和场所 | 16 | Institutions and public places. |
| 动物 | 32 | Animals. |
| 想法 | 0 | Placeholder / empty board. |
| 位置 | 18 | Position / spatial words. |
| 植物 | 27 | Plants. |
| 求助 | 0 | Placeholder / empty board. |
| 数字 | 10 | Numbers. |
| 工具 | 7 | Tools. |

## Proposed Tuyujia Core Library Shape

Tuyujia should keep two layers visible in the product:

1. **Core words**: always useful words that should stay easy to reach.
2. **Scene boards**: practical topic boards for daily care and family communication.

### First Offline Core Set

Recommended first-pass groups:

| Group | Purpose |
|---|---|
| Quick Expressions / 快速表达 | yes, no, help, stop, wait, again, finished, uncomfortable. |
| Core Words / 核心词 | I, you, want, not, more, go, come, have, like, this, that, good, bad. |
| Needs / 基本需求 | eat, drink, toilet, sleep, pain, medicine, help. |
| Body & Health / 身体医疗 | body parts, pain, symptoms, doctor, nurse, medicine. |
| Food & Drink / 饮食 | staple foods, drinks, snacks, utensils. |
| People / 人物 | family roles and caregiver roles; no private names in public seed. |
| Feelings / 情绪 | happy, sad, angry, scared, tired, uncomfortable. |
| Actions / 动作 | eat, drink, sleep, wash, go, come, sit, stand, play, watch. |
| Time / 时间 | today, tomorrow, night, morning, now, later, week, date. |
| Places / 地点 | home, hospital, toilet, bedroom, kitchen, park, school, shop. |
| Objects / 物品 | phone, TV, cup, bed, chair, clothes, bag. |
| Hygiene & Clothing / 卫生服装 | wash, bath, brush teeth, clothes, shoes. |
| Transport / 出行 | car, bus, taxi, walk, wheelchair. |
| Questions / 问题 | who, what, where, when, why, how, yes/no. |
| Descriptors / 描述 | big, small, hot, cold, fast, slow, many, few. |
| Emergency / 求助 | help, pain, danger, call doctor, call family. |

## Selection Rules

Use these rules when turning references into Tuyujia seed data:

1. **Do not copy private CBoard export images into public seed.**
2. **Preserve source and license per pictogram.**
3. **Use stable IDs** such as `arasaac:1234`, `opensymbols:repo:id`, `custom:uuid`.
4. **Prefer scene coverage over quantity.** A smaller set that covers real communication is better than a large unfocused set.
5. **Keep core buttons stable.** Do not move the most important patient-facing buttons frequently.
6. **Support reusable PictureSets.** A set like "玩具" should be linkable from both "学校" and "物品".
7. **Separate public, family, and private images.** Private photos may be synced/exported only according to user-controlled scope.

## MVP Recommendation

For MVP, use this path:

1. Start with 300-500 offline pictograms.
2. Build around the 16 groups above.
3. Use ARASAAC first.
4. Use the local CBoard exports only as category/board structure evidence.
5. Add a fixture sheet: common caregiver utterance -> ideal pictogram sequence -> required board/source.
6. After field testing, expand to 500-800 pictograms.

## Supplement: Additional Symbol Libraries

The original survey lists ARASAAC and OpenSymbols. Two more open libraries are directly relevant for Tuyujia.

| Library | Format | License | Why It Matters |
|---|---|---|---|
| Mulberry Symbols | SVG | CC BY-SA 2.0 UK | 3,500+ symbols explicitly designed for **adult** AAC users with language difficulties. Most ARASAAC sets target children; Mulberry fills the adult gap. Hosted on GitHub; easy to bundle or serve as static assets. |
| Sclera Symbols | PNG | CC BY-NC | 4,700+ high-contrast white-on-black pictograms. Better visibility for users with low vision or cognitive fatigue. Available via Global Symbols API and OpenSymbols search. |

**Implication for Tuyujia:** ARASAAC remains the primary source (more pictograms, multilingual keywords). Mulberry and Sclera are useful secondary sources for concepts ARASAAC depicts less clearly for adult contexts (body parts, medical procedures, social situations). The per-pictogram `source` field already supports storing these alongside ARASAAC entries.

## Supplement: Mandarin Chinese Core Vocabulary Research

Two peer-reviewed studies provide a research-backed word list rather than guessing at Chinese vocabulary coverage.

| Study | Key Finding | Tuyujia Implication |
|---|---|---|
| Liu & Sloane — *Developing a Core Vocabulary for a Mandarin Chinese AAC System Using Word Frequency Data* (ResearchGate) | Corpus-derived frequency list supplemented with semantic completeness and user-expectation criteria. | Use the frequency-ranked list as a checklist when selecting the 300–500 MVP pictograms. |
| *Core vocabulary for AAC practice from Mandarin Chinese-speaking Taiwanese without disabilities* (Augmentative and Alternative Communication, 2023) | 100 core words achieve 66.7% coverage of spontaneous speech samples across 7 age groups. Top words are mostly function words and high-frequency verbs/nouns. | 100-word core gives a measurable target: if Tuyujia's pictogram library covers these 100 items, it covers two-thirds of what patients actually say. |

**Implication for Tuyujia:** The 2023 study's 100-word core list should be used as the acceptance criterion for the "Define core-vocabulary source schema" task (#32). A library that does not cover these 100 words is incomplete regardless of total count.

## Supplement: Aphasia-Specific Communication Resources

The original survey treats Tuyujia as a generic AAC product. Tuyujia's specific user group (post-stroke aphasia patients) has well-studied needs.

### Widgit Health — Bedside Messages

Research by Dr. Bronwyn Hemsley (speech pathologist, Australia) identified the **26 most critical phrases** patients need to communicate when they cannot speak in a hospital setting. These phrases are supported by Widgit symbols and available free in 30 languages.

The 26 phrases cluster into:
- Pain and comfort ("I'm in pain", "I'm uncomfortable", "I'm cold/hot")
- Basic needs ("I need the toilet", "I'm thirsty", "I'm hungry")
- Contact ("Please call my family", "Please call the nurse")
- Emotional state ("I'm scared", "I'm confused")
- Yes/No confirmation

**Implication for Tuyujia:** This list should be cross-referenced against Tuyujia's "Quick Expressions / 快速表达" and "Emergency / 求助" categories. Any of these 26 phrases not covered by Tuyujia's MVP library is a gap to fill before field testing.

### Lingraphica SmallTalk ICU

A free app specifically for non-speaking hospital patients. It includes picture-based vocabulary for:
- Communicating needs and feelings to ICU medical staff
- Pain scale (Wong-Baker Faces)
- Common hospital requests

No Chinese language version is publicly confirmed, but the vocabulary structure is a direct reference for Tuyujia's "身体医疗" and "求助" groups.

### Visual Scene Displays (VSD) — Research Paradigm

VSDs are an AAC interface pattern with strong research support for aphasia. Instead of a grid of isolated symbols, VSDs show a photograph of a real scene (e.g., a kitchen) with embedded hotspots that play words or phrases when tapped.

Research summary (Augmentative and Alternative Communication, 2015):
- VSDs are particularly effective for patients with severe aphasia who struggle to retrieve words from abstract symbol grids.
- Patients communicate more successfully when symbols are anchored to familiar scenes.

**Implication for Tuyujia:** VSDs are out of scope for MVP (which uses a symbol-sequence model). However, Phase 2 should evaluate whether personalised VSDs (using caregiver photos) would improve communication success rates for patients with severe aphasia. This would require the Board model (issue #30) to support photo-backed scene boards.

### PRC-Saltillo — Communication Journey: Aphasia (Mandarin)

As of 2025, PRC-Saltillo's "Communication Journey: Aphasia" vocabulary set is available in Mandarin (spoken) and Simplified Chinese (written), part of the Bruce Baker AAC Globalization Initiative. This is the closest commercially validated Mandarin aphasia vocabulary set.

**Implication for Tuyujia:** Review the public vocabulary structure of this set as a competitive reference. It represents what a commercial team considered sufficient coverage for Mandarin-speaking aphasia patients.

## Supplement: Global Symbols API

The original survey mentions Global Symbols only as a search aggregator. It also provides a structured API.

Global Symbols hosts multiple symbol sets (including Mulberry, Sclera, ARASAAC, and others) with:
- Multi-language keyword labels per symbol
- REST API for symbol search and retrieval
- Per-symbol license metadata

**Implication for Tuyujia:** Global Symbols is a viable third backfill source (alongside ARASAAC API and OpenSymbols). For tokens that ARASAAC and OpenSymbols cannot resolve, Global Symbols may return a result from Mulberry or another set. The `PictogramSource` field already supports per-symbol source attribution, so this is plug-in compatible with the existing architecture.

## Sources

- Open Board Format: https://www.openboardformat.org/
- OpenAAC OBF repository: https://github.com/open-aac/openboardformat
- CBoard: https://github.com/cboard-org/cboard
- AsTeRICS AAC Data: https://github.com/asterics/Asterics-AAC-Data
- ARASAAC: https://arasaac.org/
- OpenSymbols / Global Symbols: https://www.opensymbols.org/
- AssistiveWare Proloquo2Go / Crescendo: https://www.assistiveware.com/products/proloquo2go
- TD Snap: https://www.tobiidynavox.com/products/td-snap
- TouchChat / WordPower: https://touchchatapp.com/
- LAMP Words for Life: https://aacapps.com/lamp/
- Avaz AAC: https://www.avazapp.com/
- Mulberry Symbols: https://mulberrysymbols.org/ · https://github.com/mulberrysymbols/mulberry-symbols
- Sclera Symbols: https://www.sclera.be/en/picto/copyright · https://globalsymbols.com/symbolsets/sclera
- Global Symbols API: https://globalsymbols.com/about
- Widgit Health Bedside Messages: https://widgit-health.com/downloads/bedside-messages.htm
- Lingraphica SmallTalk ICU: https://lingraphica.com/smalltalk-aphasia-apps/
- Liu & Sloane — Mandarin Chinese AAC core vocabulary: https://www.researchgate.net/publication/220155841_Developing_a_Core_Vocabulary_for_a_Mandarin_Chinese_AAC_System_Using_Word_Frequency_Data
- 2023 Taiwanese core vocabulary study: https://pubmed.ncbi.nlm.nih.gov/37083492/
- Visual Scene Displays for aphasia (2015): https://pubmed.ncbi.nlm.nih.gov/26044911/
- PRC-Saltillo Communication Journey Aphasia: https://www.prc-saltillo.com/articles/Aphasia-Diagnosis-Vocabulary
