import { describe, expect, it } from 'vitest'
import { pictogramsFromSequenceResult } from '../pictogram-sequence-agent'
import type { PictogramEntry, PictogramSequenceResponse } from '@/types'

function makePictogram(id: string, label: string): PictogramEntry {
  return {
    id,
    imageUrl: `https://example.com/${id}.png`,
    labels: { zh: [label], en: [] },
    categoryId: 'daily',
    synonyms: [],
    disambiguationHints: {},
    usageCount: 0,
  }
}

describe('pictogramsFromSequenceResult', () => {
  it('extracts unique pictograms for IndexedDB storage', () => {
    const fridge = makePictogram('arasaac_3272', '冰箱')
    const soup = makePictogram('arasaac_16049', '鸡汤')
    const result: PictogramSequenceResponse = {
      attempts: 1,
      missingTokens: ['没喝完'],
      items: [
        { token: '冰箱', normalizedToken: '冰箱', pictogram: fridge, matchType: 'exact', confidence: 1 },
        { token: '鸡汤', normalizedToken: '鸡汤', pictogram: soup, matchType: 'exact', confidence: 1 },
        { token: '冰箱', normalizedToken: '冰箱', pictogram: fridge, matchType: 'exact', confidence: 1 },
        { token: '没喝完', normalizedToken: '没喝完', pictogram: null, matchType: 'none', confidence: 0 },
      ],
      trace: {
        intent: '说明冰箱里还有鸡汤',
        finalText: '冰箱 鸡汤',
        attempts: [],
        verifications: [
          { arasaacId: '3272', label: '冰箱', verification: '冰箱图片适合表示地点' },
        ],
        missingConcepts: ['没喝完'],
        toolCalls: [
          {
            step: 1,
            toolName: 'searchPictograms',
            input: { name: '冰箱|鸡汤' },
            outputSummary: '找到 2 个候选',
          },
        ],
      },
    }

    expect(pictogramsFromSequenceResult(result)).toEqual([fridge, soup])
  })
})
