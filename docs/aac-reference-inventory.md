# AAC Reference Inventory

This document indexes the AAC reference materials collected for Tuyujia research and development. It covers the local archive, evidence sources used in fixture samples, and additional sources not yet collected.

**Why raw files are not committed to the app repository:**
- Symbol archives (ARASAAC, Mulberry, Sclera) are large binary assets not suitable for Git
- Third-party board JSON files (`.grd`, `.obf`, `.obz`) contain content under separate licenses that must not be relicensed under GPL-3.0
- PDFs and research documents are under academic copyright
- The app fetches ARASAAC symbols at runtime via the official API; bundling them would violate the CC BY-NC-SA 4.0 attribution requirement

Local archive path: `docs/aac-reference/` (not committed to GitHub)

---

## 1. Pictogram Symbol Libraries

### 1.1 ARASAAC

| Field | Value |
|-------|-------|
| Full name | Aragonese Portal of Augmentative and Alternative Communication |
| URL | https://arasaac.org |
| Symbol count | ~30,000 pictograms |
| License | CC BY-NC-SA 4.0 |
| Language support | Multilingual including Simplified Chinese |
| Local archive | Not downloaded in bulk; fetched via API at runtime |
| API | `https://api.arasaac.org/v1/pictograms/{id}` |
| Used in project | Primary pictogram source; seed library and runtime backfill |
| Restrictions | Non-commercial only; attribution required; derivative works must use same license |
| Notes | ARASAAC pictograms use a Western cartoon line-art style. Some concepts (food, clothing, household objects) may have low cultural fit for Chinese users. Medical and body vocabulary is generally universal. |

### 1.2 Mulberry Symbols

| Field | Value |
|-------|-------|
| Full name | Mulberry Symbol Set |
| URL | https://mulberrysymbols.org |
| Symbol count | ~3,500 symbols |
| License | CC BY-SA 2.0 |
| Language support | English primary |
| Local archive | `docs/aac-reference/mulberry-symbol-info.csv` (metadata only) |
| Used in project | Reference for vocabulary coverage comparison; not yet in seed library |
| Restrictions | Attribution required; derivative works must use same license (ShareAlike) |
| Notes | Adult-oriented, more diverse body representation than ARASAAC. Includes medical, personal care, and emotions. No Chinese label data available. |

### 1.3 Sclera Symbols

| Field | Value |
|-------|-------|
| Full name | Sclera Symbol Set |
| URL | https://www.sclera.be/en/picto/overview |
| Symbol count | ~13,000 symbols |
| License | CC BY-NC 2.0 |
| Language support | Dutch primary; multilingual metadata available |
| Local archive | Not collected |
| Used in project | Not yet; candidate for verb/action coverage |
| Restrictions | Non-commercial only; attribution required |
| Notes | Simple black-and-white line art style. Research suggests this style is more effective for verbs and abstract concepts than photographic symbols (representational transparency, see issue #74). |

### 1.4 OpenSymbols (aggregator)

| Field | Value |
|-------|-------|
| Full name | OpenSymbols.org |
| URL | https://www.opensymbols.org |
| License | Per-symbol (aggregates multiple libraries) |
| Local archive | Not collected; accessed via API at runtime |
| API | Requires `OPENSYMBOLS_SECRET` env variable |
| Used in project | Runtime backfill fallback when ARASAAC has no match |
| Notes | Aggregates ARASAAC, Mulberry, Sclera, and others. License of each result depends on source library. `PictogramSource` field in Dexie schema stores per-symbol license. |

---

## 2. AAC Board Datasets (AsTeRICS Grid)

Source repository: https://github.com/asterics/Asterics-AAC-Data  
Local archive: `docs/aac-reference/asterics/` and `docs/aac-reference/asterics-aac/` (sparse checkout)  
Full communicator list: `docs/aac-reference/communicators-list.json` (113 communicators)  
Format: `.grd.json` (AsTeRICS Grid proprietary format); parser at `docs/aac-reference/parse-grd.cjs`

### 2.1 Communication in Hospital

| Field | Value |
|-------|-------|
| Author | Projekt InDiKo, UAS Technikum Wien |
| Website | https://www.technikum-wien.at/forschungsprojekte/indiko/ |
| Languages | 22 languages including Chinese (zh) |
| Tags | BASIC, MEDICAL, HOSPITAL |
| Local path | `docs/aac-reference/asterics/Communication_in_hospital/` |
| Used in project | Core reference for hospital scene vocabulary; evidence tag `ASTERICS_HOSPITAL` in fixture samples |
| Notes | Developed in cooperation with Klinik Floridsdorf, Vienna. Covers: feelings, symptoms, requests, needs, help, pain. 6 scene categories parsed into Chinese fixture samples (scenarios 1–34 in receiver-fixture-samples-evidence.md). |

### 2.2 Quick Core 24

| Field | Value |
|-------|-------|
| Author | OpenAAC |
| Website | https://www.openboardformat.org/examples |
| License | CC BY-NC-SA 4.0 |
| Format | OBF (Open Board Format) |
| Local path | `docs/aac-reference/asterics/Quick_Core_24/` |
| Used in project | Core vocabulary backbone; evidence tag `ASTERICS_QC24` |
| Key words | 我 / 想 / 吃 / 喝 / 去 / 好 / 不 / 停 / 什么时候 |
| Notes | Motor-planning based vocabulary. 24 buttons per board. These 24 core words cover approximately 80% of daily communication needs. They are the minimum viable offline vocabulary for Tuyujia. |

### 2.3 Quick Core 40 / Quick Core 60

| Field | Value |
|-------|-------|
| Author | OpenAAC |
| License | CC BY-NC-SA 4.0 |
| Local path | `docs/aac-reference/asterics/Quick_Core_40/`, `docs/aac-reference/asterics/Quick_Core_60/` |
| Used in project | Extended vocabulary reference for Phase 2 expansion |
| Notes | Superset of Quick Core 24. Useful when expanding beyond the MVP 500–800 word target. |

### 2.4 Global-Core Communicator ARASAAC

| Field | Value |
|-------|-------|
| Author | ARASAAC team |
| Website | https://arasaac.org |
| Local path | `docs/aac-reference/asterics/Global-Core_Communicator_ARASAAC/` |
| Used in project | Category structure and vocabulary breadth reference |
| Notes | Dynamic communicator combining category-based and essential-words layouts. Word prediction enabled. Useful for understanding how ARASAAC organises its own vocabulary taxonomy. |

### 2.5 CommuniKate 20

| Field | Value |
|-------|-------|
| Author | Kate McCallum |
| License | CC BY-NC-SA 4.0 |
| Local path | `docs/aac-reference/asterics/CommuniKate20/` |
| Used in project | Adult communicator layout reference |
| Notes | 20-button layout designed specifically for adult AAC users. Relevant for understanding caregiver-facing interaction patterns and grid density trade-offs. |

---

## 3. Research-Backed Communication Resources

### 3.1 Widgit / Hemsley 26 Critical Phrases

| Field | Value |
|-------|-------|
| Reference | Hemsley B. et al. "26 Critical Health Phrases for People with Communication Disability" (2012) |
| Evidence tag | `WIDGIT_BEDSIDE` |
| Used in project | Fixture sample design; bedside hospital communication patterns |
| Phrases covered | Pain location, severity, needs, requests for staff, yes/no confirmation, environmental requests |
| Notes | 26 phrases identified as critical for hospitalized patients who cannot speak. Adapted (not copied) into Chinese caregiver utterances in fixture samples. Source is publicly documented in academic literature. |

### 3.2 Lingraphica ICU / Hospital Communication Boards

| Field | Value |
|-------|-------|
| Source | Lingraphica free AAC boards — https://www.lingraphica.com/free-aac-boards/ |
| Evidence tag | `LINGRAPHICA_BOARD` |
| Used in project | ICU and daily communication pattern reference for fixture samples |
| Notes | Publicly available boards for people with aphasia. Covers: pain scale, yes/no responses, basic needs, medical requests. Patterns adapted (not copied) for Chinese fixture samples (42 samples in receiver-fixture-samples-evidence.md reference this tag). |

### 3.3 SCA — Supported Conversation for Adults with Aphasia

| Field | Value |
|-------|-------|
| Source | Aphasia Institute, Toronto — https://www.aphasia.ca/sca/ |
| Evidence tag | `SCA_APHASIA` |
| Used in project | Core communication strategy principles; evidence basis for receiver pipeline design |
| Key principles | Patients use single keywords or 1–3 word utterances; caregivers should offer binary choices, use yes/no questions, confirm understanding |
| Notes | These principles directly inform the receiver pipeline design: short caregiver input → pictogram sequence → patient review → caregiver correction. Also informs the patient-facing UI requirement of ≤3 steps to complete an expression. |

### 3.4 LAMP Words for Life

| Field | Value |
|-------|-------|
| Source | PRC-Saltillo — https://www.prentrom.com/lamp |
| Evidence tag | `LAMP` |
| Used in project | Motor-planning vocabulary structure reference |
| Notes | LAMP (Language Acquisition through Motor Planning) emphasises consistent motor patterns for core words. Informs why core words should occupy stable, prominent positions in the patient-facing grid and why grid layout should not change between categories. Commercial product; patterns referenced, content not reproduced. |

### 3.5 2023 Mandarin Core Vocabulary Study (Taiwan)

| Field | Value |
|-------|-------|
| Reference | Chinese-language AAC core vocabulary research for Mandarin speakers (Taiwan, 2023) |
| Evidence tag | `2023-Mandarin` |
| Used in project | Mandarin-specific core vocabulary categories |
| Notes | Identifies high-frequency Mandarin words used by AAC users and caregivers in Taiwan context. Particularly relevant for corpus-driven core vocabulary selection (issue #11, #32). Simplified/Traditional Chinese mapping needed for mainland users. Full citation to be confirmed. |

### 3.6 Aphasia Best Practice (Clinical Guidelines)

| Field | Value |
|-------|-------|
| Source | Clinical AAC best practice literature; Aphasia Institute SCA principles |
| Evidence tag | `Aphasia-Best-Practice` |
| Used in project | Foundational principles for patient-facing UI design and pipeline expectations |
| Notes | Informs: icon-first patient UI (issue #6), ≤3-step interaction requirement, offline-first guarantee (issue #32), caregiver correction flow (issue #26). Referenced in AGENTS.md and architecture decision index. |

---

## 4. Open Board Format (OBF) Sources

OBF is the open standard for AAC board exchange: https://www.openboardformat.org

| Source | Format | License | Status | Notes |
|--------|--------|---------|--------|-------|
| CBoard export | OBF / OBZ | User data | Collected locally | Categories and board structure extracted; evidence tag `LOCAL_CBOARD_EXPORT` in fixture samples |
| OpenAAC examples | OBF | CC BY-NC-SA 4.0 | Collected | Quick Core boards above |
| Snap Core First | OBZ | Commercial | Not collected | Reference only |
| Proloquo2Go | Proprietary | Commercial | Not collected | Reference only |
| TouchChat | Proprietary | Commercial | Not collected | Reference only |

OBF import support is planned for Phase 2 (issue #30). When implemented, imported OBF content will carry the source license in `PictogramSource` and will not merge with or override the app's seed library.

---

## 5. Chinese / Cantonese-Specific Gaps

The following sources have been identified as relevant but not yet collected. These are the highest-priority gaps for improving Tuyujia's fit for Chinese-speaking users.

| Source | Type | Priority | Action needed |
|--------|------|----------|---------------|
| Hong Kong AAC resources (SAHK) | Cantonese board sets and vocabulary | **High** | Contact Spastic Association of Hong Kong; Cantonese is Tuyujia's first-priority dialect |
| 中文沟通板（大陆医院康复科） | Hospital communication boards | **High** | Collect PDF samples from mainland rehabilitation hospitals; convert vocabulary to fixture samples |
| 台湾中文 AAC 词库 | Vocabulary lists (Traditional Chinese) | Medium | Obtain from 2023-Mandarin study authors; map Traditional → Simplified Chinese |
| 中国失语症康复指南 | Clinical guidelines | Medium | Chinese clinical rehabilitation guidelines for aphasia; validate vocabulary against clinical standard |
| 粤语核心词研究 | Academic research | Low (Phase 2) | Cantonese-specific core vocabulary studies; not yet located as open publication |
| 失语症家属照护手册 | Caregiver guides | Medium | Mainland Chinese patient/caregiver guides published by hospitals or patient associations |

---

## 6. Fixture Sample Evidence Map

The fixture samples in `fixtures/receiver-samples.json` and `docs/receiver-fixture-samples-evidence.md` draw from the sources above. Evidence tags map as follows:

| Evidence tag | Source |
|--------------|--------|
| `WIDGIT_BEDSIDE` | §3.1 Hemsley 26 Critical Phrases |
| `ASTERICS_HOSPITAL` | §2.1 Communication in Hospital |
| `LINGRAPHICA_BOARD` | §3.2 Lingraphica boards |
| `CHINA_RCT_WORDS` | §3.5 2023 Mandarin study |
| `SCA_APHASIA` | §3.3 SCA principles |
| `LOCAL_CBOARD_EXPORT` | §4 CBoard export |
| `AAC_PRODUCT_PATTERN` | §3.4 LAMP / commercial product patterns (structure only) |
| `SYNTHETIC_CN_CARE` | Adapted from all above; no single direct source |

---

## 7. How to Add New Reference Material

1. Check the license before downloading. Materials with NC (non-commercial) clauses are fine for research and fixture design but cannot be bundled into a GPL-3.0 app binary.
2. If the license permits local storage, place files under `docs/aac-reference/<source-name>/`.
3. Add an entry to this document under the appropriate section.
4. If the material informs fixture samples, add a corresponding evidence tag to `receiver-samples.schema.json` (the `evidence[].source` enum).
5. Do **not** commit raw symbol files, PDFs, or third-party board JSON to the GitHub repository. Add the path to `.gitignore` and document the local path here instead.
6. If the material reveals vocabulary gaps (concepts with no matching pictogram), add them to the missing token tracking workflow (issue #19, #62).

---

*Last updated: 2026-05-02*  
*Closes: #75*  
*Related issues: #11 #19 #30 #32 #38 #74*
