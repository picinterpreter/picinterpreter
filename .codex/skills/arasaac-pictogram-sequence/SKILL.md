---
name: arasaac-pictogram-sequence
description: Convert Chinese caregiver sentences into aphasia-friendly AAC pictogram sequences by using the calling agent's own intelligence to segment, rewrite, and verify against data/arasaac-pictograms.json. Use when a user asks to turn text into ARASAAC pictures, debug text-to-picture matching, find missing pictograms, or iteratively rewrite a sentence until all picture tokens are found.
---

# ARASAAC Pictogram Sequence

## Purpose

Turn one Chinese caregiver sentence into a picture sequence that a person with aphasia can understand. Use your own language understanding for segmentation and rewriting. Do not call bundled scripts; this skill intentionally has no scripts.

## Required Data

Use the project file:

```text
data/arasaac-pictograms.json
```

The JSON shape is:

```ts
{
  metadata: {...},
  records: Array<{
    id: number
    chineseName: string
    englishName: string
    displayNameZhFallback: string
    imageUrl300: string
    imageUrl500: string
    arasaacUrlZh: string
    chineseKeywords: string[]
    englishKeywords: string[]
    categoriesZh: string[]
    tagsZh: string[]
  }>
}
```

Search only this JSON export for matching pictograms. CSV is not the runtime source.

## Workflow

For each input sentence, run this loop for at most 5 attempts:

1. Segment the current sentence into short AAC picture tokens.
   - Prefer concrete nouns, concrete actions, visible states, places, body parts, time, and important quantities.
   - Preserve important relationship tokens when they are present and match the JSON, especially `我`, `你`, `我们`, `给`, `在`, `上`, `然后`, and `想`.
   - Preserve action order. Put movement/action tokens before their destination when the sentence means "go to X", e.g. `去 + 医院`.
   - Remove only truly low-value particles and long explanation words.
   - Keep the original meaning, not just related meaning.
   - Use short Chinese tokens.
2. Search `data/arasaac-pictograms.json` for every token.
   - A token is a full hit if it exactly equals any of:
     - `chineseName`
     - `displayNameZhFallback`
     - any item in `chineseKeywords`
   - If there is no exact hit, try a clear same-meaning token that appears in those fields.
   - Do not count vague tag/category matches as full hits.
   - When several records match the same token, choose the picture in this order:
     1. `chineseName` exact match
     2. `displayNameZhFallback` exact match
     3. `chineseKeywords` exact match
     4. only then consider another same-meaning token
   - Do not choose a keyword match if a Chinese-name exact match exists for the same token. For example, `检查` should use a record named `检查`, not a record named `修改` that merely has `检查` as a keyword.
3. If every token is fully hit, stop and output the sequence.
4. If any token is missing, rewrite the whole sentence into a different but meaning-equivalent expression that is easier to picture.
   - Preserve the same communicative intent.
   - Replace missing abstract/status words with concrete visual equivalents when possible.
   - It is allowed to adjust word order or simplify the sentence if patient understanding improves.
   - Do not silently drop important meaning only to make all tokens match.
5. Segment the rewritten sentence and search again.

After 5 attempts, if full coverage is still impossible, output the best attempt and explicitly list missing concepts.

## Rewriting Rules

Use these patterns when helpful:

- `没喝完 / 剩下 / 还有一点` can become `少量` or `一点` when the intended meaning is remaining food/drink.
- `热热 / 热一下 / 温一下` can become `加热`.
- `复查` can become `医院 + 检查` if `复查` is missing.
- `吃饭` can become `吃 + 食物` or a specific food if `吃饭` is missing.
- `帮忙 / 扶` can become a more concrete visible action if one exists; otherwise keep it as missing.
- If `扶` is missing and the sentence has a clear helper and receiver, prefer preserving the relation as `我 + 帮助 + 你`.
- If the sentence contains a person relation, do not drop it just to shorten the sequence. `我`, `你`, and `我们` are valid pictogram tokens.
- If the sentence says "give/take something to someone", preserve `我/你 + 拿/给` and location tokens such as `在` and `上` when they are present.
- If `温水` is missing, prefer `水` and omit temperature if changing it to `热` would distort the meaning. Do not turn warm water into hot water.
- If `冷` is missing, try `冷的` before dropping the concept. Keep the practical response (`大衣 + 穿衣服`) and preserve `我 + 给 + 你` when the caregiver is helping the patient dress.
- If a yes/no question is addressed to the patient, preserve `你` and `想` when possible.
- For phone/social intent, preserve order as `你 + 想 + 打电话 + 妈妈` when the sentence asks whether the patient wants to call mother.
- For emergency or medical meaning, do not over-simplify away the key risk word.
- For "first/then" order, if `先` is missing, use `第一` for "first" and keep `然后` for the next step when both are important.
- For "morning", if `早上` is missing, `上午` is a good same-day replacement.
- For `复查`, use `检查` only when the care intent is "go to the hospital for a check/review"; keep `我们 + 去 + 医院 + 检查` in that order.
- For `量体温`, either keep `量体温` when it is a keyword hit or use the exact-name token `测体温`; preserve `你 + 发烧 + 我 + 给 + 你`.
- For device charging, prefer `我 + 帮助 + 你 + 手机 + 电池 + 充电`, and choose the exact `手机` record instead of a generic phone keyword match when available.
- For location phrases like "on the bedside table", keep `object + 在 + place + 上` when all four tokens are available.

## Matching Output

When reporting a result, include:

```ts
{
  originalText: string
  finalText: string
  attempts: Array<{
    sentence: string
    tokens: string[]
    missingTokens: string[]
  }>
  sequence: Array<{
    token: string
    arasaacId: number
    label: string
    imageUrl: string
    arasaacUrl: string
  }>
  missingConcepts: string[]
}
```

If the user wants a concise answer, show the final text, the token sequence, and missing concepts only.

## Quality Bar

- The sequence should be understandable from pictures alone.
- Prefer fewer, clearer pictures over a long literal word-by-word translation.
- Patient-facing meaning is more important than grammatical completeness, but do not remove people, receiver, helper, or action order when those are the point of the sentence.
- Never invent an ARASAAC hit. If the JSON does not contain a true full hit, mark the concept missing or rewrite and retry.
- Do not use placeholder images for missing tokens.
