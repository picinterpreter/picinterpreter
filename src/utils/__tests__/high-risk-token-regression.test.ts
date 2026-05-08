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

  // ─────────────────────────────────────────────────────────────────────────
  // 难受 / 不舒服 — 不能再被泛化到 p_pain；应优先命中各自的独立医疗概念
  // ─────────────────────────────────────────────────────────────────────────
  describe('难受 / 不舒服 → 独立医疗概念', () => {
    it('整体 token "难受" exact 命中 p_uncomfortable，不命中 p_pain', async () => {
      const result = await matchTextToImages('难受', { preSegmented: ['难受'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_uncomfortable')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('medical')
      expect(m.pictogram?.id).not.toBe('p_pain')
    })

    it('整体 token "不舒服" exact 命中 p_unwell，不命中 p_sick 和 p_pain', async () => {
      const result = await matchTextToImages('不舒服', { preSegmented: ['不舒服'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_unwell')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('medical')
      expect(m.pictogram?.id).not.toBe('p_sick')
      expect(m.pictogram?.id).not.toBe('p_pain')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 第二批医疗高风险词 — 应保持在 medical 域中，不被别的近义概念抢走
  // ─────────────────────────────────────────────────────────────────────────
  describe('第二批医疗高风险词', () => {
    it('恶心 exact 命中 p_nausea，且 imageUrl 不为空', async () => {
      const result = await matchTextToImages('恶心', { preSegmented: ['恶心'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_nausea')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('medical')
      expect(m.pictogram?.imageUrl).toBeTruthy()
    })

    it('想吐 synonym 命中 p_nausea', async () => {
      const result = await matchTextToImages('想吐', { preSegmented: ['想吐'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_nausea')
      expect(m.matchType).toBe('synonym')
    })

    it('药 exact 命中 p_medicine', async () => {
      const result = await matchTextToImages('药', { preSegmented: ['药'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_medicine')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('medical')
    })

    it('吃药 exact 命中 p_take_medicine，而不是 p_medicine', async () => {
      const result = await matchTextToImages('吃药', { preSegmented: ['吃药'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_take_medicine')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.id).not.toBe('p_medicine')
    })

    it('服药 synonym 命中 p_take_medicine', async () => {
      const result = await matchTextToImages('服药', { preSegmented: ['服药'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_take_medicine')
      expect(m.matchType).toBe('synonym')
    })

    it('医生 exact 命中 p_doctor', async () => {
      const result = await matchTextToImages('医生', { preSegmented: ['医生'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_doctor')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('medical')
    })

    it('看病 synonym 命中 p_hospital，而不是 p_doctor', async () => {
      const result = await matchTextToImages('看病', { preSegmented: ['看病'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_hospital')
      expect(m.matchType).toBe('synonym')
      expect(m.pictogram?.id).not.toBe('p_doctor')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 第三批医疗精细化词 — 痛的具体短语 + 医疗角色词
  // ─────────────────────────────────────────────────────────────────────────
  describe('第三批医疗精细化词', () => {
    it('头痛 exact 命中 p_headache，而不是 p_head 或 p_pain', async () => {
      const result = await matchTextToImages('头痛', { preSegmented: ['头痛'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_headache')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.id).not.toBe('p_head')
      expect(m.pictogram?.id).not.toBe('p_pain')
    })

    it('头疼 synonym 命中 p_headache', async () => {
      const result = await matchTextToImages('头疼', { preSegmented: ['头疼'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_headache')
      expect(m.matchType).toBe('synonym')
    })

    it('肚子疼 exact 命中 p_stomachache，而不是 p_belly 或 p_pain', async () => {
      const result = await matchTextToImages('肚子疼', { preSegmented: ['肚子疼'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_stomachache')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.id).not.toBe('p_belly')
      expect(m.pictogram?.id).not.toBe('p_pain')
    })

    it('胸口疼 exact 命中 p_chest_pain，而不是 p_chest 或 p_pain', async () => {
      const result = await matchTextToImages('胸口疼', { preSegmented: ['胸口疼'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_chest_pain')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.id).not.toBe('p_chest')
      expect(m.pictogram?.id).not.toBe('p_pain')
    })

    it('治疗师 exact 命中 p_therapist', async () => {
      const result = await matchTextToImages('治疗师', { preSegmented: ['治疗师'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_therapist')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('medical')
    })

    it('康复师 synonym 命中 p_therapist', async () => {
      const result = await matchTextToImages('康复师', { preSegmented: ['康复师'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_therapist')
      expect(m.matchType).toBe('synonym')
    })

    it('看护人 exact 命中 p_caregiver', async () => {
      const result = await matchTextToImages('看护人', { preSegmented: ['看护人'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_caregiver')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('people')
    })

    it('照护者 synonym 命中 p_caregiver', async () => {
      const result = await matchTextToImages('照护者', { preSegmented: ['照护者'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_caregiver')
      expect(m.matchType).toBe('synonym')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 手机 — 当前只保留对象义，不再把动作义 "打电话" 混进同一张图
  // ─────────────────────────────────────────────────────────────────────────
  describe('手机 → p_phone（objects）', () => {
    it('手机 exact 命中 p_phone', async () => {
      const result = await matchTextToImages('手机', { preSegmented: ['手机'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_phone')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('objects')
    })

    it('p_phone 的 synonyms 不再包含 "打电话"', () => {
      const phone = seedData.find((p) => p.id === 'p_phone')
      expect(phone?.synonyms).not.toContain('打电话')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 打电话 — 应该有独立动作概念，不再回落到手机物品图
  // ─────────────────────────────────────────────────────────────────────────
  describe('打电话 → p_make_call（activities）', () => {
    it('打电话 exact 命中 p_make_call，而不是 p_phone', async () => {
      const result = await matchTextToImages('打电话', { preSegmented: ['打电话'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_make_call')
      expect(m.matchType).toBe('exact')
      expect(m.pictogram?.categoryId).toBe('activities')
      expect(m.pictogram?.id).not.toBe('p_phone')
    })

    it('通电话 synonym 命中 p_make_call', async () => {
      const result = await matchTextToImages('通电话', { preSegmented: ['通电话'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_make_call')
      expect(m.matchType).toBe('synonym')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 想 / 要 — 两个核心词都保留，但不再互相吞并
  // ─────────────────────────────────────────────────────────────────────────
  describe('想 / 要 → 分开的核心词', () => {
    it('想 exact 命中 p_want', async () => {
      const result = await matchTextToImages('想', { preSegmented: ['想'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_want')
      expect(m.matchType).toBe('exact')
    })

    it('要 exact 命中 p_need_want', async () => {
      const result = await matchTextToImages('要', { preSegmented: ['要'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_need_want')
      expect(m.matchType).toBe('exact')
    })

    it('想要 synonym 命中 p_need_want，而不是 p_want', async () => {
      const result = await matchTextToImages('想要', { preSegmented: ['想要'] })
      const m = result.matches[0]
      expect(m.pictogram?.id).toBe('p_need_want')
      expect(m.matchType).toBe('synonym')
      expect(m.pictogram?.id).not.toBe('p_want')
    })

    it('p_want 的 synonyms 不再包含 "要"', () => {
      const want = seedData.find((p) => p.id === 'p_want')
      expect(want?.synonyms).not.toContain('要')
    })
  })

})
