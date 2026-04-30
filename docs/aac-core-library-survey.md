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
