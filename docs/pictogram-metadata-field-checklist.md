# Pictogram Metadata Field Checklist

This checklist organizes the proposed pictogram metadata fields for Tuyujia and shows which ones have real reference support from existing AAC systems, symbol libraries, and downloaded commercial materials.

The purpose is practical:

- decide which fields are grounded in real AAC practice
- separate basic library metadata from Tuyujia-specific additions
- identify which fields are required for V1 and which can wait

Related documents:

- [AAC reference inventory](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/aac-reference-inventory.md)
- [Commercial AAC core library / architecture matrix](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/commercial-aac-core-library-architecture-matrix.md)
- [Tuyujia V1 core library and board architecture proposal](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/tuyujia-v1-core-library-architecture-proposal.md)

---

## Field Checklist

| Field | Meaning | Real reference support | Main reference sources | Tuyujia priority | Notes |
|---|---|---|---|---|---|
| `concept_id` | Stable internal concept identifier | Partial | Common database practice; implied by all structured AAC systems | Must have | Needed to separate concept from image file/source |
| `label` | Main display label | Strong | ARASAAC, Mulberry, Sclera, Project Core, Core First, WordPower, LAMP, TouchChat | Must have | Main human-readable concept name |
| `language` | Language of the label | Strong | ARASAAC multilingual data, Chinese commercial boards, multilingual AAC libraries | Must have | Important for Chinese + future bilingual support |
| `aliases` | Alternate labels or common variants | Strong | ARASAAC multilingual names, OpenSymbols/Global Symbols keyword patterns, commercial label variation | Must have | Needed for matching and search |
| `source_provider` | Where the image/metadata came from | Strong | ARASAAC, Mulberry, Sclera, OpenSymbols, commercial/public board sources | Must have | Example: `arasaac`, `mulberry`, `custom-upload` |
| `source_asset_id` | Original upstream asset ID | Strong | ARASAAC API ids, source-library identifiers | Must have when available | Important for traceability and refresh |
| `source_url` | Original source page or asset URL | Strong | Official library pages and downloaded public materials | Must have when available | Useful for audit and attribution |
| `license` | License of the symbol/image | Strong | ARASAAC, Sclera, Mulberry, OpenSymbols, public PDFs | Must have | Critical because sources differ sharply |
| `attribution_text` | Required attribution wording | Strong | ARASAAC/Open sources licensing rules | Must have when required | Prevents future compliance problems |
| `image_type` | Symbol / illustration / photo / custom upload | Strong | OpenSymbols source types, commercial/public board materials, custom uploads | Must have | Important for accessibility and personalization |
| `category` | High-level grouping | Strong | CBoard, AsTeRICS, Core First topics, Avaz, TouchChat, Weave Chat | Must have | Basic navigation and maintenance field |
| `subcategory` | More specific grouping under category | Strong | WordPower, Core First, CBoard, AsTeRICS, topic boards | Should have | Helps organization but can be light in V1 |
| `keywords` | Search terms / related search labels | Strong | ARASAAC/OpenSymbols/Global Symbols metadata | Must have | Needed for retrieval and maintenance |
| `tags` | Free-form semantic tags | Strong | Open symbol libraries + commercial board themes | Must have | Can store cross-cutting values like `medical`, `emotion`, `adult` |
| `semantic_domain` | Meaning family such as emotion, body, food, action | Strong | WordPower, Core First, Project Core, Weave Chat, TD Snap Aphasia | Must have | More precise than category for matching and ambiguity control |
| `is_core` | Whether the concept belongs to core vocabulary | Strong | Project Core, Quick Core, Super Core, Crescendo, Core First | Must have | Central to patient-side design |
| `is_fringe` | Whether the concept is scene/topic-specific vocabulary | Strong | Same as above | Should have | Often complementary to `is_core` |
| `board_membership` | Which board(s) a concept appears on | Strong | CBoard, AsTeRICS, OBF, Core First, WordPower manual boards | Must have | Essential because Tuyujia is not a flat list |
| `layer_membership` | Which system layer the concept belongs to | Strong | Commercial AAC structure synthesis | Must have | Example: `core`, `quick-talk`, `repair`, `body-health` |
| `scene_tags` | Context tags like home, hospital, rehab, toilet | Strong | TD Snap Aphasia, hospital boards, Weave Chat, scene boards | Must have | Useful for receiver-side disambiguation |
| `adult_relevance` | Whether the concept is especially useful for adults | Medium-strong | Communication Journey Aphasia, Weave Chat, adult-oriented systems | Should have | Helps avoid child-biased defaults |
| `aphasia_relevance` | Whether the concept is especially relevant for aphasia | Medium-strong | TD Snap Aphasia, Communication Journey Aphasia, hospital resources | Should have | Useful for prioritization and board design |
| `medical_relevance` | Whether the concept belongs to symptom/health/clinical use | Strong | Hospital boards, TD Snap Aphasia, Widgit bedside resources | Should have | High value for Tuyujia |
| `repair_relevance` | Whether the concept helps fix misunderstanding | Strong | TD Snap Aphasia, Voco Chat, repair-layer design | Should have | Key differentiator for aphasia support |
| `quick_phrase` | Whether the entry is a one-tap whole-message phrase | Strong | Core First quick messages, TD Snap Aphasia, Voco Chat | Must have | Important because not all entries are single concepts |
| `printable_priority` | Whether the concept should be included in low-tech printable boards | Strong | Project Core, LAMP, Super Core, TD Snap, Weave Chat | Should have | Helps printable export scope |
| `visibility_level` | Whether the item is always visible, expanded, or hidden | Medium-strong | Crescendo VocaPriority, Core First progression | Should have | Useful for progressive reveal in later phases |
| `review_status` | Draft / reviewed / approved / deprecated | Strong | General content operations practice; fits curated AAC library work | Should have | Important once library grows |
| `preferred_symbol_id` | Default chosen image for this concept | Medium-strong | Implied by every AAC system that selects one visible symbol per concept | Must have | Separates concept from alternate candidate images |
| `alternate_symbol_ids` | Other possible images for the same concept | Medium-strong | Multiple symbol libraries, alternate board styles, commercial variation | Should have | Needed for swap/replace workflows |
| `concept_notes` | Editor note about intended use or scope | Medium | Curatorial need; often implicit in commercial systems | Optional | Helpful for maintenance, not core runtime |
| `usage_notes` | Guidance on when to use the concept | Medium | Clinical/educational workbook materials | Optional | Nice for caregiver tooling |
| `excluded_meanings` | Meanings this concept should not be matched to | Strong practical support | Real ambiguity cases + commercial need for stable meaning boundaries | Must have | Example: `开心` excludes `开心果` |
| `negative_hints` | Words or candidates that should be penalized/blocked | Strong practical support | Matching failure cases, semantic guardrails, receiver correction patterns | Must have | More operational than `excluded_meanings` |
| `phrase_contexts` | Contexts in which a concept should be preferred | Medium-strong | Board/scene structure across commercial systems | Should have | Example: `苹果` in food scene vs tech scene |
| `ambiguity_group` | Group identifier for concepts that commonly conflict | Medium | Useful derived field from ambiguity research | Optional | Example: fruit/brand, body/symptom splits |
| `patient_preferred_symbol_override` | Patient-specific preferred image for this concept | Strong practical support | Custom pictures, adult AAC personalization, family-photo use, #10 scope extension | Must have for personalization layer | Key field for “for this patient, use this picture by default” |
| `patient_override_source_type` | Whether patient override comes from custom upload or built-in alternate | Medium | Derived from custom-upload and alternate-symbol behavior | Should have | Useful for management and fallback |
| `fallback_symbol_id` | Library default if patient override is removed or unavailable | Medium-strong | Safe personalization design | Should have | Protects against broken custom references |
| `custom_upload_owner_scope` | Whether a custom image is device, account, family, or private to one profile | Medium | Needed for private family images and sync control | Should have | Important for privacy and sync |
| `popularity_count` | Usage count for ordering / ranking | Strong practical support | Real UI behavior and issue #83 | Optional for metadata layer, useful operationally | Better stored as usage/event data than static seed metadata |
| `manual_order` | Saved fixed order for cards | Strong practical support | Real UI behavior and issue #83 | Optional for content metadata, useful operationally | Usually board-level state rather than concept-level metadata |

---

## What Is Most Strongly Grounded In Real AAC References

These fields have the strongest direct support from real existing AAC libraries or commercial/public resources:

- `label`
- `aliases`
- `source_provider`
- `source_asset_id`
- `source_url`
- `license`
- `attribution_text`
- `image_type`
- `category`
- `subcategory`
- `keywords`
- `tags`
- `semantic_domain`
- `is_core`
- `is_fringe`
- `board_membership`
- `scene_tags`
- `quick_phrase`

These are the safest fields to formalize first because they are clearly supported by what already exists.

---

## What Is Strongly Justified By Commercial AAC Structure

These fields may not appear as named database columns in vendor materials, but they are strongly implied by the real systems we studied:

- `layer_membership`
- `adult_relevance`
- `aphasia_relevance`
- `medical_relevance`
- `repair_relevance`
- `printable_priority`
- `visibility_level`
- `preferred_symbol_id`
- `alternate_symbol_ids`

These come directly from patterns seen in:

- Core First
- TD Snap Aphasia
- Communication Journey Aphasia
- WordPower
- LAMP
- Super Core
- Voco Chat
- Project Core

---

## What Tuyujia Needs To Add Beyond Typical Library Metadata

These are the fields that matter especially for Tuyujia and are not usually handed to us ready-made by public symbol libraries:

- `excluded_meanings`
- `negative_hints`
- `phrase_contexts`
- `patient_preferred_symbol_override`
- `patient_override_source_type`
- `fallback_symbol_id`
- `custom_upload_owner_scope`

These fields are driven by:

- Chinese ambiguity problems such as `开心 -> 开心果`
- aphasia-specific repair needs
- patient-specific personalization
- family-uploaded images

This is where Tuyujia becomes more than a plain symbol catalog.

---

## Suggested V1 Minimum Field Set

If the team wants the smallest reasonable V1 schema, this is the safest minimum set.

### Identity and source

- `concept_id`
- `label`
- `aliases`
- `source_provider`
- `source_asset_id`
- `source_url`
- `license`
- `image_type`

### Meaning and organization

- `category`
- `semantic_domain`
- `tags`
- `is_core`
- `board_membership`
- `layer_membership`
- `scene_tags`

### Matching and ambiguity

- `keywords`
- `excluded_meanings`
- `negative_hints`

### Rendering and personalization

- `preferred_symbol_id`
- `alternate_symbol_ids`
- `patient_preferred_symbol_override`

That set is small enough for V1 and rich enough to support:

- core/fringe design
- board structure
- ambiguity control
- patient personalization

---

## Suggested Phase 2 Fields

These can wait until after the first structured library exists:

- `subcategory`
- `adult_relevance`
- `aphasia_relevance`
- `medical_relevance`
- `repair_relevance`
- `visibility_level`
- `printable_priority`
- `concept_notes`
- `usage_notes`
- `ambiguity_group`
- `patient_override_source_type`
- `fallback_symbol_id`
- `custom_upload_owner_scope`

---

## Bottom Line

The older structured-metadata work already covers the basic library layer well:

- names
- source
- license
- category
- keywords

What the newer commercial AAC research adds is the missing second layer:

- semantic role
- board/layer placement
- ambiguity exclusion
- repair relevance
- adult/aphasia relevance
- patient-specific preferred image mapping

So the practical answer is:

**yes, many metadata fields have real references, but the most important Tuyujia-specific fields are the ones that extend beyond ordinary library metadata into communication behavior and personalization.**

---

*Last updated: 2026-05-06*
