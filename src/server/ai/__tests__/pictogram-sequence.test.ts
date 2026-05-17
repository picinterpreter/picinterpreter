import { describe, expect, it } from 'vitest'
import type { ArasaacRecord } from '@/server/pictograms/arasaac-index'
import {
  buildPictogramSequence,
  getPictogramDetail,
  parseAgentSequenceText,
  searchPictograms,
  sequenceFromConceptPlan,
  sequenceResponseFromAgentOutput,
} from '../pictogram-sequence'

const fixtureRecords: ArasaacRecord[] = [
  {
    id: 3272,
    chineseName: '冰箱',
    englishName: 'fridge',
    displayNameZhFallback: '冰箱',
    imageUrl300: 'https://static.arasaac.org/pictograms/3272/3272_300.png',
    imageUrl500: 'https://static.arasaac.org/pictograms/3272/3272_500.png',
    arasaacUrlZh: 'https://arasaac.org/pictograms/zh/3272',
    chineseKeywords: ['冰箱'],
    englishKeywords: ['fridge'],
    categoriesEn: ['electrical appliance'],
    tagsEn: ['object', 'appliance', 'home'],
  },
  {
    id: 16049,
    chineseName: '鸡汤',
    englishName: 'chicken soup',
    displayNameZhFallback: '鸡汤',
    imageUrl300: 'https://static.arasaac.org/pictograms/16049/16049_300.png',
    imageUrl500: 'https://static.arasaac.org/pictograms/16049/16049_500.png',
    arasaacUrlZh: 'https://arasaac.org/pictograms/zh/16049',
    chineseKeywords: ['鸡汤'],
    englishKeywords: ['chicken soup'],
    categoriesEn: ['gastronomy'],
    tagsEn: ['feeding', 'food'],
  },
  {
    id: 8520,
    chineseName: '加热',
    englishName: 'heat',
    displayNameZhFallback: '加热',
    imageUrl300: 'https://static.arasaac.org/pictograms/8520/8520_300.png',
    imageUrl500: 'https://static.arasaac.org/pictograms/8520/8520_500.png',
    arasaacUrlZh: 'https://arasaac.org/pictograms/zh/8520',
    chineseKeywords: ['加热'],
    englishKeywords: ['heat'],
    categoriesEn: ['verb', 'cookery'],
    tagsEn: ['communication', 'language', 'verb', 'feeding'],
  },
  {
    id: 2276,
    chineseName: '喝',
    englishName: 'drink',
    displayNameZhFallback: '喝',
    imageUrl300: 'https://static.arasaac.org/pictograms/2276/2276_300.png',
    imageUrl500: 'https://static.arasaac.org/pictograms/2276/2276_500.png',
    arasaacUrlZh: 'https://arasaac.org/pictograms/zh/2276',
    chineseKeywords: ['喝', '吃、喝'],
    englishKeywords: ['drink'],
    categoriesEn: ['verb', 'beverage'],
    tagsEn: ['communication', 'language', 'verb', 'feeding'],
  },
  {
    id: 2639,
    chineseName: '针',
    englishName: 'needle',
    displayNameZhFallback: '针',
    imageUrl300: 'https://static.arasaac.org/pictograms/2639/2639_300.png',
    imageUrl500: 'https://static.arasaac.org/pictograms/2639/2639_500.png',
    arasaacUrlZh: 'https://arasaac.org/pictograms/zh/2639',
    chineseKeywords: ['针'],
    englishKeywords: ['needle'],
    categoriesEn: ['work tool'],
    tagsEn: ['object'],
  },
  {
    id: 5441,
    chineseName: '希望、需要',
    englishName: 'need',
    displayNameZhFallback: '希望、需要',
    imageUrl300: 'https://static.arasaac.org/pictograms/5441/5441_300.png',
    imageUrl500: 'https://static.arasaac.org/pictograms/5441/5441_500.png',
    arasaacUrlZh: 'https://arasaac.org/pictograms/zh/5441',
    chineseKeywords: ['需要', '希望'],
    englishKeywords: ['need', 'want'],
    categoriesEn: ['verb'],
    tagsEn: ['communication', 'language', 'verb'],
  },
]

describe('searchPictograms', () => {
  it('searches by Chinese and English names, including fullwidth regex pipes', async () => {
    const results = await searchPictograms(
      { name: '冰箱｜chicken soup', limit: 10 },
      { records: fixtureRecords },
    )

    expect(results.map((result) => result.id)).toEqual(['3272', '16049'])
  })

  it('searches by tag/category and respects the result limit', async () => {
    const results = await searchPictograms(
      { tag: 'feeding', category: 'verb|gastronomy', limit: 2 },
      { records: fixtureRecords },
    )

    expect(results).toHaveLength(2)
    expect(results.map((result) => result.name)).toEqual(['鸡汤', '加热'])
  })
})

describe('getPictogramDetail', () => {
  it('returns detail metadata for an ARASAAC id', async () => {
    const detail = await getPictogramDetail('8520', { records: fixtureRecords })

    expect(detail?.name).toBe('加热')
    expect(detail?.imageUrl500).toContain('8520_500.png')
    expect(detail?.arasaacUrl).toBe('https://arasaac.org/pictograms/zh/8520')
  })

  it('returns null when the id does not exist', async () => {
    await expect(getPictogramDetail('999999', { records: fixtureRecords })).resolves.toBeNull()
  })
})

describe('parseAgentSequenceText', () => {
  it('parses a JSON object from plain or fenced model text', () => {
    expect(parseAgentSequenceText('```json\n{"sequence":[{"arasaacId":"2276","label":"喝"}],"missingConcepts":[]}\n```'))
      ?.toMatchObject({
        sequence: [{ arasaacId: '2276', label: '喝' }],
        missingConcepts: [],
      })
  })

  it('returns null for unparsable model text', () => {
    expect(parseAgentSequenceText('我找到了喝水图片')).toBeNull()
  })
})

describe('sequenceResponseFromAgentOutput', () => {
  it('normalizes valid agent ids into pictogram sequence items', async () => {
    const result = await sequenceResponseFromAgentOutput({
      originalText: '冰箱里有没喝完的鸡汤，你热热之后再喝。',
      finalText: '冰箱 鸡汤 加热 喝',
      intent: '提醒先加热鸡汤再喝',
      attempts: [{ candidateIds: ['3272', '16049', '8520', '2276'] }],
      sequence: [
        { arasaacId: '3272', label: '冰箱', role: '地点', verification: '冰箱图片适合表示存放位置' },
        { arasaacId: '16049', label: '鸡汤', role: '对象', verification: '鸡汤图片适合表示食物' },
        { arasaacId: '8520', label: '加热', role: '动作', verification: '加热图片适合表示热一热' },
        { arasaacId: '2276', label: '喝', role: '动作', verification: '喝图片适合表示饮用' },
      ],
      missingConcepts: [],
    }, { records: fixtureRecords })

    expect(result?.missingTokens).toEqual([])
    expect(result?.attempts).toBe(1)
    expect(result?.items.map((item) => item.pictogram?.labels.zh[0])).toEqual([
      '冰箱',
      '鸡汤',
      '加热',
      '喝',
    ])
    expect(result?.items.every((item) => item.matchType === 'ai-normalized')).toBe(true)
    expect(result?.trace?.intent).toBe('提醒先加热鸡汤再喝')
    expect(result?.trace?.verifications.map((item) => item.label)).toEqual([
      '冰箱',
      '鸡汤',
      '加热',
      '喝',
    ])
  })

  it('deduplicates ids and reports invalid ids as missing concepts', async () => {
    const result = await sequenceResponseFromAgentOutput({
      sequence: [
        { arasaacId: '3272', label: '冰箱' },
        { arasaacId: '3272', label: '冰箱' },
        { arasaacId: '999999', label: '剩下' },
      ],
      missingConcepts: ['没喝完'],
    }, { records: fixtureRecords, attempts: 2 })

    expect(result?.items).toHaveLength(1)
    expect(result?.items[0].pictogram?.imageUrl).not.toContain('placeholder')
    expect(result?.missingTokens).toEqual(['没喝完', '剩下'])
    expect(result?.attempts).toBe(2)
  })
})

describe('sequenceFromConceptPlan', () => {
  it('executes model planning with server-side search and detail verification', async () => {
    const result = await sequenceFromConceptPlan('冰箱里有鸡汤，热热再喝。', {
      intent: '提醒先加热鸡汤再喝',
      finalText: '冰箱 鸡汤 加热 喝',
      concepts: [
        { label: '冰箱', searchName: '冰箱', role: '地点' },
        { label: '鸡汤', searchName: '鸡汤', role: '对象' },
        { label: '加热', searchName: '热 加热', role: '动作' },
        { label: '喝', searchName: '喝', role: '动作' },
      ],
      missingConcepts: [],
    }, {
      slimRecords: fixtureRecords,
      fullRecords: fixtureRecords,
    })

    expect(result?.output.sequence.map((item) => item.arasaacId)).toEqual([
      '3272',
      '16049',
      '8520',
      '2276',
    ])
    expect(result?.output.attempts?.[0].draftedSequence).toEqual([
      '冰箱',
      '鸡汤',
      '加热',
      '喝',
    ])
    expect(result?.toolCalls[0]).toMatchObject({
      step: 1,
      toolName: 'planPictogramConcepts',
      resultCount: 4,
    })
    expect(result?.toolCalls.some((call) => call.toolName === 'getPictogramDetail')).toBe(true)
  })

  it('prefers Chinese concept matches over misleading English substrings', async () => {
    const result = await sequenceFromConceptPlan('需要喝水吗', {
      intent: '询问是否需要喝水',
      finalText: '需要 喝 水',
      concepts: [
        { label: '需要', searchName: 'need', role: '意图' },
      ],
      missingConcepts: [],
    }, {
      slimRecords: fixtureRecords,
      fullRecords: fixtureRecords,
    })

    expect(result?.output.sequence).toHaveLength(1)
    expect(result?.output.sequence[0]).toMatchObject({
      arasaacId: '5441',
      label: '需要',
    })
  })
})

describe('buildPictogramSequence', () => {
  it('uses the supplied agent runner without calling a real model', async () => {
    const result = await buildPictogramSequence('需要喝水吗', {
      records: fixtureRecords,
      runAgent: async () => ({
        output: {
          sequence: [
            { arasaacId: '2276', label: '喝', role: '动作', verification: '喝图片适合问题意图' },
          ],
          missingConcepts: ['水'],
        },
        toolCalls: [
          {
            step: 1,
            toolName: 'searchPictograms',
            input: { name: '喝水' },
            outputSummary: '找到 1 个候选：喝(2276)',
            resultCount: 1,
            ids: ['2276'],
          },
        ],
      }),
    })

    expect(result?.items.map((item) => item.token)).toEqual(['喝'])
    expect(result?.missingTokens).toEqual(['水'])
    expect(result?.trace?.toolCalls[0].toolName).toBe('searchPictograms')
  })
})
