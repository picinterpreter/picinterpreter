/**
 * 高风险词 seed 数据回归测试。
 *
 * 不使用合成 pictogram，直接加载 public/seed/pictograms.json 真实数据。
 * 每条测试对应 docs/high-risk-token-list.md 里的一个已知失败模式或护栏规则。
 *
 * 如果这里有测试失败，说明 seed 数据或匹配逻辑出现了消歧回退。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PictogramEntry } from '@/types'
import seedJson from '../../../public/seed/pictograms.json'

const seedData = seedJson as unknown as PictogramEntry[]

// ─── Mock @/db ───────────────────────────────────────────────────────────── //

const mockToArray = vi.fn<() => Promise<PictogramEntry[]>>()

vi.mock('@/db', () => ({
  db: {
    pictograms: {
      toArray: () => mockToArray(),
    },
  },
}))

// ─── Mock @/data/lexicon ─────────────────────────────────────────────────── //

vi.mock('@/data/lexicon', () => ({
  findEntry: (token: string) => {
    if (token === '高兴') return { zh: '开心', category: 'emotions' }
    return null
  },
}))

const { matchTextToImages } = await import('../text-to-image-matcher')

// ─── Setup ───────────────────────────────────────────────────────────────── //

beforeEach(() => {
  mockToArray.mockResolvedValue(seedData)
})

// ─── Tests ───────────────────────────────────────────────────────────────── //

describe('高风险词 seed 回归', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // 开心 — 不能命中食物图（历史上命中 ARASAAC id=3372 开心果）
  // ─────────────────────────────────────────────────────────────────────────
  describe('开心 → p_happy（不是食物图）', () => {
    it('命中 p_happy', async () => {
      const result = await matchTextToImages('开心')
      const m = result.matches.find((x) => x.token === '开心')
      expect(m?.pictogram?.id).toBe('p_happy')
    })

    it('matchType 是 exact', async () => {
      const result = await matchTextToImages('开心')
      const m = result.matches.find((x) => x.token === '开心')
      expect(m?.matchType).toBe('exact')
    })

    it('命中图的 categoryId 是 emotions', async () => {
      const result = await matchTextToImages('开心')
      const m = result.matches.find((x) => x.token === '开心')
      expect(m?.pictogram?.categoryId).toBe('emotions')
    })

    it('p_happy imageUrl 不再指向 id=3372（开心果）', () => {
      const happy = seedData.find((p) => p.id === 'p_happy')
      expect(happy?.imageUrl).not.toContain('3372')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 高兴 — p_happy 的 synonym，应通过 Strategy 2 命中
  // ─────────────────────────────────────────────────────────────────────────
  describe('高兴 → p_happy（via synonym）', () => {
    it('命中 p_happy', async () => {
      const result = await matchTextToImages('高兴')
      const m = result.matches.find((x) => x.token === '高兴')
      expect(m?.pictogram?.id).toBe('p_happy')
    })

    it('matchType 是 synonym', async () => {
      const result = await matchTextToImages('高兴')
      const m = result.matches.find((x) => x.token === '高兴')
      expect(m?.matchType).toBe('synonym')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 苹果 — 默认食物域，不跑到设备相关图
  // ─────────────────────────────────────────────────────────────────────────
  describe('苹果 → p_apple（food）', () => {
    it('命中 p_apple', async () => {
      const result = await matchTextToImages('苹果')
      const m = result.matches.find((x) => x.token === '苹果')
      expect(m?.pictogram?.id).toBe('p_apple')
    })

    it('matchType 是 exact', async () => {
      const result = await matchTextToImages('苹果')
      const m = result.matches.find((x) => x.token === '苹果')
      expect(m?.matchType).toBe('exact')
    })

    it('命中图的 categoryId 是 food', async () => {
      const result = await matchTextToImages('苹果')
      const m = result.matches.find((x) => x.token === '苹果')
      expect(m?.pictogram?.categoryId).toBe('food')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 头晕 — 医疗词，不管分词结果如何，最终要命中 p_dizzy
  // ─────────────────────────────────────────────────────────────────────────
  describe('头晕 → p_dizzy（medical）', () => {
    it('结果里存在 p_dizzy', async () => {
      const result = await matchTextToImages('头晕')
      const hit = result.matches.find((m) => m.pictogram?.id === 'p_dizzy')
      expect(hit).toBeDefined()
    })

    it('p_dizzy 命中的 categoryId 是 medical', async () => {
      const result = await matchTextToImages('头晕')
      const hit = result.matches.find((m) => m.pictogram?.id === 'p_dizzy')
      expect(hit?.pictogram?.categoryId).toBe('medical')
    })

    it('preSegmented 整体 token "头晕" → exact 命中 p_dizzy', async () => {
      const result = await matchTextToImages('头晕', { preSegmented: ['头晕'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_dizzy')
      expect(m.matchType).toBe('exact')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 不开心 — 否定词整体 token 不能命中 p_happy；
  //          p_sad 把 "不开心" 列为 synonym，应命中 p_sad
  // ─────────────────────────────────────────────────────────────────────────
  describe('不开心 → p_sad，不命中 p_happy', () => {
    it('整体 token "不开心" 不命中 p_happy', async () => {
      const result = await matchTextToImages('不开心', { preSegmented: ['不开心'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).not.toBe('p_happy')
    })

    it('整体 token "不开心" 命中 p_sad（synonym）', async () => {
      const result = await matchTextToImages('不开心', { preSegmented: ['不开心'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_sad')
      expect(m.matchType).toBe('synonym')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 上厕所 — p_toilet 的 synonym，应通过 Strategy 2 命中
  // ─────────────────────────────────────────────────────────────────────────
  describe('上厕所 → p_toilet（via synonym）', () => {
    it('整体 token "上厕所" 命中 p_toilet', async () => {
      const result = await matchTextToImages('上厕所', { preSegmented: ['上厕所'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_toilet')
    })

    it('matchType 是 synonym', async () => {
      const result = await matchTextToImages('上厕所', { preSegmented: ['上厕所'] })
      const m = result.matches[0]
      expect(m.matchType).toBe('synonym')
    })
  })

})
