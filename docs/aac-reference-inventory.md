# AAC Reference Inventory

This document records the AAC reference materials downloaded for Tuyujia's core pictogram library research.

The downloaded source files are kept outside the repository at:

```text
D:/used-by-codex/aac-core-sources
```

This repository should keep only the **inventory, source links, download notes, intended use, and licensing boundaries**. Do not commit third-party PDFs, symbol archives, or large board JSON files into the app repository unless their licenses and redistribution terms are explicitly reviewed.

## Why The Raw Files Are Not Committed

| Reason | Explanation |
|---|---|
| License safety | Several materials are CC BY-NC-SA, PDF handouts, or third-party symbol metadata. Keeping raw files out of the code repo avoids accidentally redistributing assets without review. |
| Repository size | Some board JSON files are several MB each, and PDF/image assets will grow quickly. |
| Source-of-truth clarity | The app should use curated seed data, not raw downloaded third-party archives. |
| Future hosting flexibility | If raw references need to be shared, use a release artifact, cloud storage, or a separate research archive with explicit license notes. |

## Downloaded Local Archive

Local archive root:

```text
D:/used-by-codex/aac-core-sources
```

### AsTeRICS AAC Data

Source: https://github.com/asterics/Asterics-AAC-Data

Local folder:

```text
D:/used-by-codex/aac-core-sources/asterics
```

| Local file | Approx. size | Extracted scope | Intended use |
|---|---:|---|---|
| `quick-core-24.grd.json` | 864 KB | 50 grids, 628 unique labels | Minimal core vocabulary / small grid reference |
| `quick-core-40.grd.json` | 1.8 MB | 64 grids, 1,669 unique labels | Medium grid vocabulary reference |
| `quick-core-60.grd.json` | 2.0 MB | 62 grids, 2,004 unique labels | Larger core vocabulary reference |
| `quick-core-84.grd.json` | 3.6 MB | 78 grids, 3,877 unique labels | Large grid vocabulary reference |
| `communikate-20_EN.grd.json` | 1.8 MB | 97 grids, 1,162 unique labels | Small-grid communicator reference |
| `Global-Core_Communicator_ARASAAC_EN.grd.json` | 2.9 MB | 54 grids, 799 unique labels | ARASAAC global-core communicator reference |
| `communication_hospital.grd.json` | 6.1 MB | 67 grids, 864 unique labels | Hospital / ICU / symptom communication reference |

License boundary:

- AsTeRICS AAC Data README states that source code is AGPL-3.0.
- Documentation and communication grids are generally CC BY-NC-SA 4.0 unless another license is mentioned in a grid's `info.json`.
- Treat this as a reference source until each imported item is reviewed.

### Extracted AsTeRICS Labels

Local file:

```text
D:/used-by-codex/aac-core-sources/metadata/asterics-labels.csv
```

Rows: 12,140.

Generated from all downloaded AsTeRICS `.grd.json` files. Columns include source file, grid label, row, column, English label, image URL, image author, and action types.

Intended use:

- Candidate vocabulary review.
- Board structure analysis.
- Gap analysis for the first offline core library.
- Not a direct product import without license review.

### Widgit Bedside Messages

Source page: https://widgit-health.com/downloads/bedside-messages.htm

Local folder:

```text
D:/used-by-codex/aac-core-sources/widgit
```

| Local file | Intended use |
|---|---|
| `Bedside-Messages-Mandarin-A4.pdf` | Mandarin bedside / hospital phrase reference |
| `Bedside-Messages-Cantonese-A4.pdf` | Cantonese bedside / hospital phrase reference |

License boundary:

- These are PDF/visual materials, not machine-readable vocabularies.
- Use them for manual phrase extraction and scenario coverage.
- Do not copy symbols or layouts into the product without checking Widgit's terms.

### Lingraphica Communication Boards

Source page: https://lingraphica.com/free-communication-boards/

Local folder:

```text
D:/used-by-codex/aac-core-sources/lingraphica
```

| Local file | Intended use |
|---|---|
| `Daily-Activities-Communication-Board.pdf` | Daily activity vocabulary and board layout reference |
| `ICU-Communication-Board.pdf` | ICU / hospital communication reference |
| `Pain-Scale-Communication-Board.pdf` | Pain scale reference |
| `Simple-Communication-Board.pdf` | Small/simple communication board reference |
| `Conversational-Phrases-Communication-Board.pdf` | Conversation phrase reference |
| `Emergency-Responder-Comm-Board.pdf` | Emergency response communication reference |

License boundary:

- Use as scenario and board-pattern references.
- Do not copy symbols or complete board layouts into seed data without license review.
- PDF content should be manually reviewed before becoming test samples.

### Mulberry Symbols

Source: https://github.com/mulberrysymbols/mulberry-symbols

Local file:

```text
D:/used-by-codex/aac-core-sources/metadata/mulberry-symbol-info.csv
```

Rows: 3,436.

Intended use:

- Compare symbol categories, labels, tags, and grammar metadata.
- Possible alternate symbol source after license review.
- Useful for designing pictogram metadata.

License boundary:

- Do not import images or metadata into product seed data until license and attribution requirements are reviewed.

### Chinese AAC Clinical Study

Source article: https://trialsjournal.biomedcentral.com/articles/10.1186/s13063-021-05799-0

Local file:

```text
D:/used-by-codex/aac-core-sources/research/Huang_2021_AAC_post_stroke_aphasia_trial_protocol.pdf
```

Intended use:

- Chinese post-stroke aphasia AAC context.
- Clinical vocabulary category reference.
- Evidence for categories such as vegetables/fruits, daily items, actions, body parts, relatives, and medical staff.

License boundary:

- This is a research paper, not a structured vocabulary file.
- Use for clinical category evidence and manual review.

## Local Private / User-Provided AAC Exports

These files exist locally but are not copied into the archive or repository because they may include private personal data:

| Local file | Intended use |
|---|---|
| `D:/PicInterpreter/export/cboard-all2026-03-08_16-33-14-boardsset board.json` | CBoard structure analysis |
| `D:/PicInterpreter/export/cboard-export2026-03-08_16-32-12-boardsset board.json` | User daily board structure analysis; contains private names/photos |
| `D:/PicInterpreter/export/openboard2026-03-08_16-32-54-日常使用黄炳灿制作 board.obf` | OBF import compatibility analysis |

Boundary:

- Use for structure only.
- Do not publish private names, photos, or user-specific locations in seed data.

## Not Downloaded / Reference Only

| Source | Link | Reason |
|---|---|---|
| Taiwanese Mandarin AAC core vocabulary study | https://www.tandfonline.com/doi/abs/10.1080/07434618.2023.2199855 | Full 100-word list was not found as a public structured download. |
| Mandarin AphasiaBank core lexicon analysis | https://pubmed.ncbi.nlm.nih.gov/36866943/ | Research abstract/reference only; not an AAC seed vocabulary download. |
| PRC-Saltillo vocabularies | https://prc-saltillo.com/vocabularies | Commercial vocabulary system; use as product-pattern reference only. |
| Communication Journey: Aphasia | https://prc-saltillo.com/vocabularies/communication-journey | Commercial aphasia vocabulary; do not copy content without permission. |
| Proloquo2Go / Crescendo | https://www.assistiveware.com/products/proloquo2go | Commercial vocabulary; use as pattern reference only. |
| TD Snap Core First | https://www.tobiidynavox.com/products/td-snap | Commercial vocabulary; use as pattern reference only. |
| TouchChat / WordPower | https://touchchatapp.com/ | Commercial vocabulary; use as pattern reference only. |
| LAMP Words for Life | https://aacapps.com/lamp/ | Commercial vocabulary; use as motor-planning / stable-layout reference only. |
| Avaz AAC | https://www.avazapp.com/ | Commercial AAC product; use as onboarding/category reference only. |
| ARASAAC full keyword database | https://arasaac.org/ | No stable full batch keyword download was found. Use candidate word -> API search -> metadata cache -> manual review. |

## Recommended Product Workflow

Create a working spreadsheet with these columns:

```text
source
source_file
source_label
suggested_zh
category
core_or_fringe
must_offline
image_source
license
reuse_level
notes
```

Recommended extraction order:

1. AsTeRICS Quick Core 24 / 40 / 60.
2. ARASAAC Global-Core Communicator.
3. AsTeRICS Communication in hospital.
4. Widgit Mandarin / Cantonese Bedside Messages.
5. Lingraphica ICU / pain scale / emergency / daily boards.
6. Chinese clinical study categories.
7. Local CBoard structures.
8. Mulberry metadata for category/tag comparison.

## Product Boundary

The offline core pictogram library should be derived from mature AAC vocabularies, open AAC boards, ARASAAC / AsTeRICS / CBoard structures, and clinical vocabulary references.

Receiver fixture samples should be used for coverage validation and gap detection only. They should not become the primary source for defining the core library.
