import { describe, expect, it, vi } from 'vitest'
import { createArasaacIndex, type ArasaacRecord } from '@/server/pictograms/arasaac-index'
import {
  buildPictogramSequence,
  parsePictogramTokenResponse,
  type TokenGenerationRequest,
} from '../pictogram-sequence'

const fixtureRecords: ArasaacRecord[] = [
  {
    id: 3272,
    chineseName: '冰箱',
    englishName: 'fridge',
    imageUrl500: 'https://static.arasaac.org/pictograms/3272/3272_500.png',
    chineseKeywords: ['冰箱'],
    categoriesZh: ['electrical appliance'],
    tagsZh: ['object', 'appliance', 'home'],
  },
  {
    id: 16049,
    chineseName: '鸡汤',
    englishName: 'chicken soup',
    imageUrl500: 'https://static.arasaac.org/pictograms/16049/16049_500.png',
    chineseKeywords: ['鸡汤'],
    categoriesZh: ['gastronomy'],
    tagsZh: ['feeding', 'food'],
  },
  {
    id: 8520,
    chineseName: '加热',
    englishName: 'heat',
    imageUrl500: 'https://static.arasaac.org/pictograms/8520/8520_500.png',
    chineseKeywords: ['加热'],
    categoriesZh: ['verb', 'cookery'],
    tagsZh: ['communication', 'language', 'verb', 'feeding'],
  },
  {
    id: 2276,
    chineseName: '喝',
    englishName: 'drink',
    imageUrl500: 'https://static.arasaac.org/pictograms/2276/2276_500.png',
    chineseKeywords: ['喝', '吃、喝'],
    categoriesZh: ['verb', 'beverage'],
    tagsZh: ['communication', 'language', 'verb', 'feeding'],
  },
]

const index = createArasaacIndex(fixtureRecords)

describe('parsePictogramTokenResponse', () => {
  it('parses a standard JSON string array', () => {
    expect(parsePictogramTokenResponse('["冰箱","鸡汤","加热","喝"]')).toEqual([
      '冰箱',
      '鸡汤',
      '加热',
      '喝',
    ])
  })

  it('rejects damaged JSON so the caller can fallback', () => {
    expect(parsePictogramTokenResponse('["冰箱", "鸡汤",]')).toBeNull()
  })
})

describe('buildPictogramSequence', () => {
  it('builds a matched pictogram sequence from AI tokens', async () => {
    const result = await buildPictogramSequence('冰箱里有没喝完的鸡汤，你热热之后再喝。', {
      index,
      generateTokens: async () => ['冰箱', '鸡汤', '加热', '喝'],
    })

    expect(result?.missingTokens).toEqual([])
    expect(result?.items.map((item) => item.pictogram?.labels.zh[0])).toEqual([
      '冰箱',
      '鸡汤',
      '加热',
      '喝',
    ])
  })

  it('retries at most three times when missing tokens remain', async () => {
    const generateTokens = vi.fn(
      async (request: TokenGenerationRequest) =>
        request.attempt < 3 ? ['冰箱', '没喝完'] : ['冰箱', '剩下'],
    )

    const result = await buildPictogramSequence('冰箱里有没喝完的鸡汤', {
      index,
      generateTokens,
    })

    expect(generateTokens).toHaveBeenCalledTimes(3)
    expect(result?.attempts).toBe(3)
    expect(result?.missingTokens).toEqual(['剩下'])
  })

  it('returns null when the first AI response cannot be parsed', async () => {
    const result = await buildPictogramSequence('测试', {
      index,
      generateTokens: async () => null,
    })

    expect(result).toBeNull()
  })

  it('does not match a negated containing token to the opposite action', async () => {
    const result = await buildPictogramSequence('没喝完', {
      index,
      generateTokens: async () => ['没喝完'],
    })

    expect(result?.items[0].pictogram).toBeNull()
    expect(result?.missingTokens).toEqual(['没喝完'])
  })
})
