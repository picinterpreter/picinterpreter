/**
 * 消歧回归测试套件
 *
 * 目标：
 * 1. 暴露 text-to-image-matcher Strategy 4 的 partial-match 缺陷
 *    （"开心果" token 通过 includes 命中 "开心" label）
 * 2. 验证 concept-disambiguation 模块的 exclusion / alias 逻辑能修复已知失败案例
 *
 * 对应开发清单 Step 4（issue #15）。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PictogramEntry } from '@/types'
import {
  applyExclusions,
  scoreAliasMatches,
  mergeCandidates,
  SCORE_EXACT,
  SCORE_ALIAS,
  SOFT_PENALTY,
  type ScoredCandidate,
  type ConceptExclusion,
  type ConceptAlias,
} from '../concept-disambiguation'

// ─── Mock @/db ───────────────────────────────────────────────────────────── //

const mockToArray = vi.fn<() => Promise<PictogramEntry[]>>()

vi.mock('@/db', () => ({
  db: {
    pictograms: {
      toArray: () => mockToArray(),
    },
  },
}))

vi.mock('@/data/lexicon', () => ({
  findEntry: () => null,
}))

const { matchTextToImages } = await import('../text-to-image-matcher')

// ─── helpers ─────────────────────────────────────────────────────────────── //

function makePictogram(
  label: string,
  opts: { synonyms?: string[]; id?: string } = {},
): PictogramEntry {
  return {
    id: opts.id ?? `id-${label}`,
    imageUrl: `/seed/${label}.png`,
    labels: { zh: [label], en: [] },
    categoryId: 'test',
    synonyms: opts.synonyms ?? [],
    disambiguationHints: {},
    usageCount: 0,
  }
}

function makeCandidate(
  conceptId: string,
  score: number,
  reason: ScoredCandidate['matchReason'] = 'exact',
): ScoredCandidate {
  return { conceptId, score, matchReason: reason }
}

// ─── Section 1: 暴露 Strategy 4 partial-match 缺陷 ──────────────────────── //

describe('Strategy 4 partial-match — 已知缺陷暴露', () => {
  beforeEach(() => mockToArray.mockReset())

  it('【BUG】token "开心果" 通过 Strategy 4 错误命中 label "开心" 的图符', async () => {
    // 图库：只有 label="开心"（情绪图）
    // 输入：token "开心果"（坚果）
    // Strategy 4：token.includes(label) → "开心果".includes("开心") === true → 错误匹配
    mockToArray.mockResolvedValue([makePictogram('开心')])

    const result = await matchTextToImages('开心果')
    const hit = result.matches.find((m) => m.token === '开心果')

    // 当前行为：Strategy 4 会命中 "开心"（这是 BUG）
    // 本测试记录现状，作为回归基线
    expect(hit).toBeDefined()
    expect(hit?.pictogram?.labels.zh[0]).toBe('开心')
    expect(hit?.matchType).toBe('partial')
  })

  it('【BUG】token "苹果手机" 通过 Strategy 4 错误命中 label "苹果" 的图符', async () => {
    // preSegmented 强制传入整体 token，绕过 Intl.Segmenter 拆词（Segmenter 会拆成 苹果+手机）
    mockToArray.mockResolvedValue([makePictogram('苹果')])

    const result = await matchTextToImages('苹果手机', { preSegmented: ['苹果手机'] })
    const hit = result.matches.find((m) => m.token === '苹果手机')

    expect(hit?.pictogram?.labels.zh[0]).toBe('苹果')
    expect(hit?.matchType).toBe('partial')
  })

  it('否定前缀词 "不开心" 不触发 Strategy 4（已有保护）', async () => {
    // preSegmented 强制传入整体 token，绕过 Intl.Segmenter 拆词（Segmenter 会拆成 不+开心）
    mockToArray.mockResolvedValue([makePictogram('开心')])

    const result = await matchTextToImages('不开心', { preSegmented: ['不开心'] })
    const hit = result.matches.find((m) => m.token === '不开心')

    // 否定前缀保护正常工作 — Strategy 4 被跳过，matchType = 'none'
    expect(hit?.matchType).toBe('none')
  })
})

// ─── Section 2: ConceptExclusion — hard-block ────────────────────────────── //

describe('applyExclusions — hard-block', () => {
  const EXCLUSIONS: ConceptExclusion[] = [
    { conceptId: 'cn-happy',  excludedText: '开心果',  exclusionType: 'hard-block' },
    { conceptId: 'cn-apple',  excludedText: '苹果手机', exclusionType: 'hard-block' },
    { conceptId: 'cn-apple',  excludedText: 'iPhone',  exclusionType: 'hard-block' },
  ]

  it('"开心果" 触发 hard-block → cn-happy 被完全移除', () => {
    const candidates = [makeCandidate('cn-happy', SCORE_EXACT)]
    const result = applyExclusions(candidates, '开心果', EXCLUSIONS)
    expect(result).toHaveLength(0)
  })

  it('"苹果手机" 触发 hard-block → cn-apple 被完全移除', () => {
    const candidates = [makeCandidate('cn-apple', SCORE_EXACT)]
    const result = applyExclusions(candidates, '苹果手机', EXCLUSIONS)
    expect(result).toHaveLength(0)
  })

  it('"iPhone" 触发 hard-block → cn-apple 被完全移除', () => {
    const candidates = [makeCandidate('cn-apple', SCORE_EXACT)]
    const result = applyExclusions(candidates, 'iPhone', EXCLUSIONS)
    expect(result).toHaveLength(0)
  })

  it('无排除规则命中时，候选列表不变', () => {
    const candidates = [makeCandidate('cn-happy', SCORE_EXACT)]
    const result = applyExclusions(candidates, '开心', EXCLUSIONS)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(SCORE_EXACT)
  })

  it('hard-block 只移除命中的概念，不影响其他候选', () => {
    const candidates = [
      makeCandidate('cn-happy', SCORE_EXACT),
      makeCandidate('cn-pistachio', 80),
    ]
    const result = applyExclusions(candidates, '开心果', EXCLUSIONS)
    expect(result).toHaveLength(1)
    expect(result[0].conceptId).toBe('cn-pistachio')
  })
})

// ─── Section 3: ConceptExclusion — soft-penalty ──────────────────────────── //

describe('applyExclusions — soft-penalty', () => {
  const EXCLUSIONS: ConceptExclusion[] = [
    { conceptId: 'cn-run', excludedText: '跑步机', exclusionType: 'soft-penalty' },
  ]

  it('soft-penalty 降低分数但不移除候选', () => {
    const candidates = [makeCandidate('cn-run', SCORE_EXACT)]
    const result = applyExclusions(candidates, '跑步机', EXCLUSIONS)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(SCORE_EXACT - SOFT_PENALTY)
  })

  it('soft-penalty 后仍可被更高分候选超越', () => {
    const candidates = [
      makeCandidate('cn-run',       SCORE_EXACT),       // 100 → 60 after penalty
      makeCandidate('cn-treadmill', 80),
    ]
    const result = applyExclusions(candidates, '跑步机', EXCLUSIONS)
    // 两个候选都保留，cn-run 分数降到 60
    const run = result.find((c) => c.conceptId === 'cn-run')
    expect(run?.score).toBe(60)
  })
})

// ─── Section 4: ConceptAlias — alias 匹配与评分 ──────────────────────────── //

describe('scoreAliasMatches', () => {
  const ALIASES: ConceptAlias[] = [
    { conceptId: 'cn-happy',  alias: '高兴' },
    { conceptId: 'cn-happy',  alias: '快乐' },
    { conceptId: 'cn-hungry', alias: '肚子饿' },
  ]

  it('"高兴" 通过 alias 命中 cn-happy，分数为 SCORE_ALIAS', () => {
    const result = scoreAliasMatches('高兴', ALIASES)
    expect(result).toHaveLength(1)
    expect(result[0].conceptId).toBe('cn-happy')
    expect(result[0].score).toBe(SCORE_ALIAS)
    expect(result[0].matchReason).toBe('alias')
  })

  it('"肚子饿" 通过 alias 命中 cn-hungry', () => {
    const result = scoreAliasMatches('肚子饿', ALIASES)
    expect(result).toHaveLength(1)
    expect(result[0].conceptId).toBe('cn-hungry')
  })

  it('alias 分数 SCORE_ALIAS 低于精确匹配 SCORE_EXACT', () => {
    expect(SCORE_ALIAS).toBeLessThan(SCORE_EXACT)
  })

  it('无 alias 命中时返回空数组', () => {
    const result = scoreAliasMatches('开心果', ALIASES)
    expect(result).toHaveLength(0)
  })
})

// ─── Section 5: mergeCandidates — 去重合并 ───────────────────────────────── //

describe('mergeCandidates', () => {
  it('合并两个列表，去重保留最高分', () => {
    const primary = [makeCandidate('cn-happy', 80)]
    const fromAlias = [makeCandidate('cn-happy', SCORE_ALIAS)]
    const result = mergeCandidates(primary, fromAlias)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(SCORE_ALIAS) // 90 > 80
  })

  it('不同 conceptId 都保留', () => {
    const primary   = [makeCandidate('cn-happy',  SCORE_EXACT)]
    const fromAlias = [makeCandidate('cn-hungry', SCORE_ALIAS)]
    const result = mergeCandidates(primary, fromAlias)
    expect(result).toHaveLength(2)
  })

  it('结果按 score 降序排列', () => {
    const primary   = [makeCandidate('cn-b', 70), makeCandidate('cn-a', SCORE_EXACT)]
    const fromAlias = [makeCandidate('cn-c', SCORE_ALIAS)]
    const result = mergeCandidates(primary, fromAlias)
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score)
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score)
  })
})

// ─── Section 6: 端到端语义正确性验证 ────────────────────────────────────── //

describe('端到端：exclusion + alias 联合修复已知失败案例', () => {
  const EXCLUSIONS: ConceptExclusion[] = [
    { conceptId: 'cn-happy', excludedText: '开心果', exclusionType: 'hard-block' },
    { conceptId: 'cn-apple', excludedText: '苹果手机', exclusionType: 'hard-block' },
  ]
  const ALIASES: ConceptAlias[] = [
    { conceptId: 'cn-happy', alias: '高兴' },
    { conceptId: 'cn-happy', alias: '快乐' },
  ]

  it('输入 "开心果"：partial-match 后经 exclusion 过滤，最终无 cn-happy 候选', () => {
    // 模拟：Strategy 4 产生了 cn-happy 候选（score=30，partial）
    const partialCandidates = [makeCandidate('cn-happy', 30, 'partial')]
    const afterExclusion = applyExclusions(partialCandidates, '开心果', EXCLUSIONS)
    expect(afterExclusion.find((c) => c.conceptId === 'cn-happy')).toBeUndefined()
  })

  it('输入 "高兴"：alias 命中 cn-happy（score=90），优于 partial（score=30）', () => {
    const partialCandidates = [makeCandidate('cn-happy', 30, 'partial')]
    const aliasCandidates = scoreAliasMatches('高兴', ALIASES)
    const merged = mergeCandidates(partialCandidates, aliasCandidates)
    expect(merged[0].conceptId).toBe('cn-happy')
    expect(merged[0].score).toBe(SCORE_ALIAS)
    expect(merged[0].matchReason).toBe('alias')
  })

  it('输入 "苹果手机"：cn-apple hard-block 后，结果为空', () => {
    const candidates = [makeCandidate('cn-apple', 30, 'partial')]
    const after = applyExclusions(candidates, '苹果手机', EXCLUSIONS)
    expect(after).toHaveLength(0)
  })
})
