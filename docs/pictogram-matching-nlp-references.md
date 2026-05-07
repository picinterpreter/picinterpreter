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

**Direct implications for Tuyujia:**

- `conceptType === 'verb'` and `conceptType === 'adjective'` are the concept classes most in need of:
  - multiple candidate symbols (`ConceptSymbolLink` alternates)
  - patient-specific preferred image (`PatientConceptPreference`)
  - custom uploaded photo fallback (`#10`)
- Medical and body vocabulary (mostly nouns) is the most universally understood category and appropriate for the core seed library
- Caregiver correction data (`#64 ReceiverCorrection`) is the closest available proxy for individual comprehension tracking — no open-source tool exists for predicting single-patient symbol comprehension

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

The key gap is Chinese. The path that currently exists:

```
Chinese input word
  → Chinese WordNet (CWN) synset
  → English WordNet synset (via cross-lingual links)
  → Arasaac-WN pictogram ID
  → ARASAAC API fetch
```

No open-source tool has assembled this full chain for Chinese. This is a Phase 2 opportunity.  
In V1, `ConceptAlias` and `ConceptExclusion` serve the same function via hand-curated rules (see [#15](https://github.com/picinterpreter/picinterpreter/issues/15)).

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

| Tool | Use in Tuyujia | Repository |
|---|---|---|
| OpenHowNet | Sememe-based Chinese semantic hierarchy; `快乐` and `开心果` have completely disjoint sememes — provides the theoretical basis for hard-exclusion rules | [thunlp/OpenHowNet](https://github.com/thunlp/OpenHowNet) |
| HanLP | Full Chinese NLP pipeline: dependency parsing, semantic similarity, semantic role labelling; useful for pre-processing before candidate lookup | [hankcs/HanLP](https://github.com/hankcs/HanLP) |

**Current project coverage:** alias lookup (`ConceptAlias`), hard-block and soft-penalty exclusions (`ConceptExclusion`), semantic domain weighting — these are V1 implementations of the same disambiguation logic that these research systems implement more formally.

---

## Problem 3 — Bidirectional Sentence-Pictogram Reconstruction

### ToPicto — Fine-tuned seq2seq text-to-pictogram system

**Papers:**
- [CEUR 2024 — Text-To-Picto Using Lexical Simplification](https://ceur-ws.org/Vol-3740/paper-146.pdf)
- [RANLP 2021 — Extending a Text-to-Pictograph System to French and to Arasaac](https://aclanthology.org/2021.ranlp-1.118.pdf)

**Method:** Fine-tunes Helsinki-NLP translation models to treat text → picto-sequence as a seq2seq "translation" task. Best published PictoER (Picto-term Error Rate) is ~18.5%.

**Status:** No public repository; dataset is French only.

**Implication for Tuyujia:** This confirms that the "treat it as machine translation" approach is the current state of the art for the reconstruction problem. In the LLM era this maps cleanly to a Chinese-language fine-tune or prompt-based pipeline using models like Qwen or DeepSeek-V3. Tuyujia's receiver pipeline already implements a version of this at the sentence segmentation and candidate-ranking stage.

### Transformer-based text-to-picto generation

**Paper:** [CEUR 2024 — A Transformer Based Approach for Text-to-Picto Generation](https://ceur-ws.org/Vol-3740/paper-154.pdf)

A parallel approach to ToPicto using a Transformer seq2seq architecture. Same research group; no public repository.

### Lexical simplification — reusable component libraries

Text simplification can serve as the first stage of a text → picto pipeline (sentence → simplified tokens → pictogram lookup):

| Tool | What it does | Repository |
|---|---|---|
| lightls | Language-agnostic lexical simplification | [codogogo/lightls](https://github.com/codogogo/lightls) |
| cocoxu/simplification | English text simplification system and dataset | [cocoxu/simplification](https://github.com/cocoxu/simplification) |

These are English-focused and not directly pluggable for Chinese, but the architecture (complex word → simpler synonym → concept lookup) is the same pattern that `ConceptAlias` implements in the project's hand-curated form.

---

## Summary: New vs Already Covered

| Problem | Already in Tuyujia | New from this research |
|---|---|---|
| Pictogram comprehension | custom upload / personal preference / caregiver correction | 2024 data: verbs and adjectives need the most multi-candidate and photo support |
| Word-to-pictogram matching | alias / exclusion / OpenHowNet / jieba / THUOCL | **Arasaac-WN** (WordNet↔ARASAAC bridge); RANLP 2023 WSD+Word2Vec approach; CWN→WordNet→ARASAAC chain as Phase 2 path |
| Sentence-pictogram reconstruction | receiver pipeline / caregiver correction / conversation context | ToPicto seq2seq approach; lightls lexical simplification as preprocessing |

---

## Phase 2 Recommendation

The single highest-value external resource not yet used is **Arasaac-WN**.

In V1, the gap is covered by hand-curated `ConceptExclusion` rules.  
In Phase 2, a Chinese WordNet → English WordNet → Arasaac-WN bridge would provide a principled semantic disambiguation path that does not require manually enumerating every ambiguous word pair.

This would be the foundation for replacing or supplementing the exclusion rule list with data-driven word-sense disambiguation.

---

*Related issues: [#8](https://github.com/picinterpreter/picinterpreter/issues/8) [#10](https://github.com/picinterpreter/picinterpreter/issues/10) [#11](https://github.com/picinterpreter/picinterpreter/issues/11) [#15](https://github.com/picinterpreter/picinterpreter/issues/15)*
