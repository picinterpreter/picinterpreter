---
name: arasaac-pictogram-sequence
description: Convert Chinese caregiver sentences into aphasia-friendly ARASAAC pictogram sequences without word segmentation. Use the bundled search and detail scripts to find candidate pictograms from data/arasaac-pictograms-slim.json, inspect chosen ids, and iteratively verify whether each picture fits the sentence meaning.
---

# ARASAAC Pictogram Sequence

## Purpose

Turn a Chinese caregiver sentence into an AAC picture sequence for aphasia communication.

This version must not cut, segment, tokenize, or mechanically split the sentence. Understand the sentence first, then decide which visual concepts should be represented.

## Required Data

Use these project files:

```text
data/arasaac-pictograms-slim.json
data/arasaac-pictograms.json
```

The slim file is used for search. The full file is used by the detail script when available.

## Bundled Scripts

Run scripts from the project root.

Search pictograms:

```bash
node .codex/skills/arasaac-pictogram-sequence/scripts/search-pictograms.mjs --name '太阳|阳台|日出'
node .codex/skills/arasaac-pictogram-sequence/scripts/search-pictograms.mjs --tag 'health|hospital'
node .codex/skills/arasaac-pictogram-sequence/scripts/search-pictograms.mjs --category 'food|drink'
```

Parameters are optional and can be combined:

- `--name`: regex over `chineseName`, `englishName`, and `chineseKeywords`
- `--tag`: regex over `tagsEn`
- `--category`: regex over `categoriesEn`

Chinese fullwidth `｜` is accepted as regex `|`. Output shape:

```ts
Array<{
  id: string
  name: string
  tag: string
  category: string
}>
```

Get pictogram detail:

```bash
node .codex/skills/arasaac-pictogram-sequence/scripts/get-pictogram-detail.mjs --id 2239
```

Output includes id, names, image URLs, ARASAAC URL, categories, tags, keywords, and a short metadata description.

## Workflow

For each sentence, run this loop for at most 5 attempts:

1. Read the whole sentence and state the communicative intent in your own mind.
   - Do not segment the sentence.
   - Do not produce a token list by cutting the sentence.
   - Decide the few concrete picture concepts needed for the patient to understand the message.
2. Search for candidate pictures using the search script.
   - Choose search queries yourself from the sentence meaning.
   - Search by `name` for concrete objects, people, actions, places, time words, symptoms, and body parts.
   - Search by `tag` or `category` when the sentence implies a domain but the exact Chinese name may vary, such as medical care, food, drink, bathroom, clothing, sleep, weather, or household objects.
   - Run multiple searches when needed. Prefer narrow regexes first, then broader alternatives.
3. Draft a pictogram sequence from the candidate ids.
   - The sequence is a designed answer, not the result of word segmentation.
   - Prefer fewer, clearer pictures.
   - Preserve important actors, receivers, actions, objects, places, sequence order, urgency, and yes/no question intent.
4. Verify every chosen id with the detail script.
   - Read the detail output and check whether the picture meaning fits the sentence context.
   - Use name, keywords, category, tag, and image URL as evidence.
   - If the detail suggests the wrong sense, remove it and return to step 2 with better searches.
5. Iterate until the sequence is suitable or no better candidate can be found.
   - Do not stop after the first draft if `missingConcepts` is non-empty.
   - If the current wording does not map cleanly to pictures, rewrite the sentence in a semantically equivalent way and search again from that new phrasing.
   - Keep looping through search → draft → detail check → revise until the missing idea is reduced as far as the data allows.
   - Never invent an ARASAAC id.
   - Never keep a picture only because a word surface matches.
   - If a meaning cannot be represented faithfully, list it in `missingConcepts`.

## Search Strategy

- Search concrete meanings, not grammatical fragments.
- For abstract caregiver intent, search for the visible action or practical outcome.
- For benefactive care, avoid a `give` picture unless something is physically handed over. Prefer help/care/action pictures when they fit.
- For location meaning like "on the table", prefer a place/object plus a spatial relation picture that actually means "on top", not an unrelated same-character sense.
- For medical and emergency sentences, keep the risk or symptom if a suitable picture exists.
- For yes/no questions, keep the patient/addressee and desire/action meaning when possible; add a question-mark pictogram only if it improves clarity.
- For time/order, represent only clinically or practically important order, such as first/then, morning/night, medicine timing, or appointment timing.
- If the first search route leaves gaps, do not treat that as the end of the task. Re-express the same meaning with a different but faithful wording, then search the pictogram data again.

## Output

Return this structure unless the user asks for a shorter format:

```ts
{
  originalText: string
  finalText: string
  intent: string
  attempts: Array<{
    searchQueries: Array<{
      name?: string
      tag?: string
      category?: string
    }>
    candidateIds: string[]
    draftedSequence: string[]
    rejected: Array<{
      id: string
      reason: string
    }>
    missingConcepts: string[]
  }>
  sequence: Array<{
    arasaacId: string
    label: string
    imageUrl: string
    arasaacUrl?: string
    role: string
    verification: string
  }>
  missingConcepts: string[]
}
```

`draftedSequence` is a list of intended picture labels, not a segmentation of the source sentence.

## Quality Bar

- The final sequence should be understandable from pictures alone.
- Patient-facing clarity is more important than grammatical completeness.
- Do not delete important meaning just to make the sequence shorter.
- Do not expose technical matching details in patient-facing text.
- Do not use placeholder images for missing concepts.
