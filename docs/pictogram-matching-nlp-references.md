# Pictogram Matching — NLP and Research References

This document records external research and open-source tools relevant to the three core technical problems in Tuyujia's pictogram pipeline.

Compiled: 2026-05-07  
Related issues: [#8](https://github.com/picinterpreter/picinterpreter/issues/8) [#10](https://github.com/picinterpreter/picinterpreter/issues/10) [#11](https://github.com/picinterpreter/picinterpreter/issues/11) [#15](https://github.com/picinterpreter/picinterpreter/issues/15)

---

## Problem 1 — Pictogram Comprehension: Will the Patient Understand This Symbol?

### Key finding: symbol transparency varies strongly by word class

**Source:** [Frontiers in Psychology (2024) — Transparency and translucency indices for 1,525 ARASAAC pictograms](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1467796/full)

521 participants were tested on 1,525 ARASAAC pictograms.

Results:

| Word class | Transparency | Implication |
|---|---|---|
| Nouns (objects, body parts, food) | High | Most universally recognisable; stable as defaults |
| Verbs (actions) | Medium–Low | Needs more candidate symbols or personal photos |
| Adjectives (states, qualities) | Low | Highest ambiguity; personal upload support most critical here |

**How to use this finding:**

This is a group-level study on the general population, not an individual-level predictor for post-stroke aphasia patients. Do not read it as "this symbol will be understood by this patient." Use it as a design heuristic:

- Verbs and adjectives are the word classes where standardised symbols are *most likely* to fail; they are the best candidates for offering multiple alternates (`ConceptSymbolLink`) and prompting caregivers to upload personal photos (`PatientConceptPreference`, `#10`)
- Medical and body vocabulary (mostly nouns) is the most stable across users and appropriate for the core seed library as reliable defaults
- Individual comprehension tracking still requires real usage data — `ReceiverCorrection` event logs (`#64`) are the closest available proxy for this in Tuyujia

---

## Problem 2 — Word-to-Pictogram Matching: Avoiding "开心 → 开心果"

### Arasaac-WN — WordNet synset links for ARASAAC pictograms

**Repository:** [github.com/getalp/Arasaac-WN](https://github.com/getalp/Arasaac-WN)  
**Paper:** [LREC 2020 — Providing Semantic Knowledge to a Set of Pictograms for People with Disabilities](https://aclanthology.org/2020.lrec-1.21/)

The only publicly available bridge between a pictogram database and a semantic knowledge base.

- Links ~800 ARASAAC pictograms to Princeton WordNet synsets
- Distributed as an SQL database under Creative Commons license
- Enables word-sense disambiguation via synsets rather than string matching alone

**Relevance for Tuyujia:**

In V1, `ConceptAlias` and `ConceptExclusion` serve the same disambiguation function via hand-curated rules (see [#15](https://github.com/picinterpreter/picinterpreter/issues/15)).

For Phase 2, a plausible engineering path would be:

```
Chinese input word
  → Chinese WordNet (CWN) synset
  → English WordNet synset (via cross-lingual links)
  → Arasaac-WN pictogram ID
  → ARASAAC API fetch
```

**Note:** this chain is an *inferred engineering design*, not a confirmed existing open-source pipeline. No tool has assembled this full path for Chinese. Each link in the chain (CWN, cross-lingual WordNet alignment, Arasaac-WN) exists independently and would need to be wired together. Flag this as a Phase 2 research task, not a drop-in dependency.

### WSD for Medical AAC Pictograms — BERT / Word2Vec approach

**Paper:** [RANLP 2023 — Word Sense Disambiguation for Automatic Translation of Medical Dialogues into Pictographs](https://aclanthology.org/2023.ranlp-1.87/)

When a word maps to multiple candidate pictograms (multi-candidate disambiguation), this paper tests:

- Word2Vec + fastText: best overall precision improvement for medical domain
- CamemBERT, FlauBERT, DrBERT: tested but general models underperformed domain-specific ones

Key finding: **medical-domain language models outperform general ones** when the input is clinical/hospital language. This validates:

- keeping `semanticDomain` as a V1 field
- the optional `medicalRelevance` score in the schema
- prioritising hospital-scene vocabulary in the initial seed library

### Chinese NLP tools relevant to matching

| Tool | Role | Repository |
|---|---|---|
| OpenHowNet | Sememe-based Chinese semantic hierarchy. `快乐` sememe = `happy\|快乐`; `开心果` sememe = `pistachio\|开心果(植物)` — completely disjoint. Useful for *reasoning about* why an exclusion rule is correct, and for building new rules systematically. Not a ready-made AAC disambiguator. | [thunlp/OpenHowNet](https://github.com/thunlp/OpenHowNet) |
| HanLP | Chinese NLP pipeline covering segmentation, dependency parsing, and semantic role labelling. Useful as a structural pre-processing step before candidate lookup. Not an AAC-specific tool — needs integration work to feed into Tuyujia's matching pipeline. | [hankcs/HanLP](https://github.com/hankcs/HanLP) |

Neither tool is a plug-in Chinese AAC disambiguator. They are NLP components that would need to be wired into Tuyujia's matching pipeline by the development team.

**Current project coverage:** alias lookup (`ConceptAlias`), hard-block and soft-penalty exclusions (`ConceptExclusion`), semantic domain weighting — these are V1 hand-curated implementations of the same logic that these tools would make more systematic in Phase 2.

---

## Problem 3 — Bidirectional Sentence-Pictogram Reconstruction

### ToPicto and related text-to-picto research (Phase 2/3 route reference only)

> These are research prototypes and competition notebooks, not mature engineering components. Treat them as route confirmation, not as engineering dependencies.

**Papers:**
- [RANLP 2021 — Extending a Text-to-Pictograph System to French and to Arasaac](https://aclanthology.org/2021.ranlp-1.118.pdf): established the text → picto seq2seq route; combines ARASAAC and WordNet; French only; no public repository
- [CEUR 2024 — Text-To-Picto Using Lexical Simplification](https://ceur-ws.org/Vol-3740/paper-146.pdf): CLEF 2024 competition notebook; lexical simplification approach; PictoER ~18.5%; research prototype, not a packaged library
- [CEUR 2024 — A Transformer Based Approach for Text-to-Picto Generation](https://ceur-ws.org/Vol-3740/paper-154.pdf): CLEF 2024 competition notebook; T5-based seq2seq; PictoER ~13.9%; research prototype, not a packaged library

**What these confirm:** treating text → picto conversion as a seq2seq translation task is the current research direction. In an LLM context this maps to prompt-based or fine-tuned Chinese models (Qwen, DeepSeek). This is a Phase 2/3 research path for Tuyujia, after the V1 alias/exclusion layer is stable.

**What these do not provide:** no public code, no Chinese dataset, no production-ready component.

### Lexical simplification tools (English only, architecture reference)

| Tool | What it does | Repository |
|---|---|---|
| lightls | Language-agnostic lexical simplification | [codogogo/lightls](https://github.com/codogogo/lightls) |
| cocoxu/simplification | English text simplification system and dataset | [cocoxu/simplification](https://github.com/cocoxu/simplification) |

English-only; not directly pluggable for Chinese. The architecture pattern (complex word → simpler synonym → concept lookup) is the same as what `ConceptAlias` implements by hand in V1.

---

## Summary

### What is new and immediately usable

| Resource | Type | Value |
|---|---|---|
| **Arasaac-WN** ([github.com/getalp/Arasaac-WN](https://github.com/getalp/Arasaac-WN)) | Open-source dataset | Only public WordNet ↔ ARASAAC bridge; directly relevant to #15 disambiguation |
| **RANLP 2023 WSD paper** ([link](https://aclanthology.org/2023.ranlp-1.87/)) | Research finding | Word2Vec/fastText + domain weighting outperforms general LLMs for medical pictogram selection; validates `semanticDomain` and `medicalRelevance` schema fields |

### What is useful as design inspiration

| Resource | How to use it |
|---|---|
| **2024 ARASAAC transparency study** | Heuristic: verbs and adjectives need more candidate symbols and personal photo support than nouns. Do not treat it as a predictor for individual aphasia patients. |

### What is Phase 2/3 route reference only (not an engineering dependency)

| Resource | Status |
|---|---|
| ToPicto (RANLP 2021 + CEUR 2024) | Research prototypes; French only; no public repository |
| CWN → WordNet → Arasaac-WN chain | Inferred engineering path; each link exists independently but no one has assembled it for Chinese |
| HanLP, OpenHowNet | Valid Chinese NLP components; need integration work; not ready-made AAC disambiguators |

---

## Recommended sequence (per Codex review)

1. V1: implement alias / exclusion / semantic domain (hand-curated, already in schema)
2. Phase 2: explore WordNet / sememe semantic bridging using Arasaac-WN as the ARASAAC anchor
3. Phase 3: consider seq2seq text-to-picto approaches (ToPicto-style) once the V1 library is stable

---

*Related issues: [#8](https://github.com/picinterpreter/picinterpreter/issues/8) [#10](https://github.com/picinterpreter/picinterpreter/issues/10) [#11](https://github.com/picinterpreter/picinterpreter/issues/11) [#15](https://github.com/picinterpreter/picinterpreter/issues/15)*
