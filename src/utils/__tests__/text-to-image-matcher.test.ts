/**
 * matchTextToImages 单元测试。
 *
 * @/db 被 mock，不依赖真实 IndexedDB，测试匹配逻辑本身。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PictogramEntry } from '@/types'

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
    // 只为测试提供一个词条：马桶 → 厕所
    if (token === '马桶') return { zh: '厕所' }
    return null
  },
}))

// 在 mock 之后再 import
const { matchTextToImages } = await import('../text-to-image-matcher')

// ─── helpers ─────────────────────────────────────────────────────────────── //

function makePictogram(label: string, synonyms: string[] = []): PictogramEntry {
  return {
    id: `id-${label}`,
    imageUrl: `/seed/${label}.png`,
    labels: { zh: [label], en: [] },
    categoryId: 'test',
    synonyms,
    disambiguationHints: {},
    usageCount: 0,
  }
}

// ─── tests ───────────────────────────────────────────────────────────────── //

describe('matchTextToImages', () => {

  beforeEach(() => {
    mockToArray.mockReset()
  })

  it('returns empty matches for empty string', async () => {
    mockToArray.mockResolvedValue([])
    const result = await matchTextToImages('')
    expect(result.matches).toEqual([])
    expect(result.matchRate).toBe(0)
  })

  it('exact match on labels.zh[0]', async () => {
    // 用单字 "吃" 保证 segmenter 产生 token "吃"，而不是 "吃饭" 整体
    mockToArray.mockResolvedValue([makePictogram('吃')])
    const result = await matchTextToImages('吃')
    expect(result.matches.length).toBeGreaterThan(0)
    const eatMatch = result.matches.find((m) => m.token === '吃')
    expect(eatMatch).toBeDefined()
    expect(eatMatch?.matchType).toBe('exact')
    expect(eatMatch?.pictogram?.labels.zh[0]).toBe('吃')
  })

  it('synonym match on pictogram.synonyms', async () => {
    mockToArray.mockResolvedValue([makePictogram('吃饭', ['吃'])])
    // 输入 "吃" — 不精确匹配 label "吃饭"，但匹配 synonyms ["吃"]
    const result = await matchTextToImages('吃')
    const m = result.matches[0]
    expect(m.matchType).toBe('synonym')
    expect(m.pictogram?.labels.zh[0]).toBe('吃饭')
  })

  it('lexicon match via findEntry', async () => {
    // 词库：马桶 → 厕所；图库只有 "厕所"
    mockToArray.mockResolvedValue([makePictogram('厕所')])
    const result = await matchTextToImages('马桶')
    const m = result.matches[0]
    expect(m.matchType).toBe('lexicon')
    expect(m.pictogram?.labels.zh[0]).toBe('厕所')
  })

  it('returns matchType "missing" for unmatched tokens', async () => {
    mockToArray.mockResolvedValue([makePictogram('吃')])
    const result = await matchTextToImages('外星人')
    expect(result.matches.some((m) => m.matchType === 'missing')).toBe(true)
  })

  it('matchRate is 0 when nothing matches', async () => {
    mockToArray.mockResolvedValue([])
    const result = await matchTextToImages('我想吃饭')
    expect(result.matchRate).toBe(0)
  })

  it('matchRate is 1 when everything matches', async () => {
    // 单字 "我" → exact match
    mockToArray.mockResolvedValue([makePictogram('我')])
    const result = await matchTextToImages('我')
    expect(result.matchRate).toBe(1)
  })

  it('matchRate is between 0 and 1 for partial matches', async () => {
    mockToArray.mockResolvedValue([makePictogram('我')])
    // 不同输入取决于分词结果，至少验证范围
    const result = await matchTextToImages('我去医院')
    expect(result.matchRate).toBeGreaterThanOrEqual(0)
    expect(result.matchRate).toBeLessThanOrEqual(1)
  })

  it('result includes inputText, elapsedMs, and segmentation', async () => {
    mockToArray.mockResolvedValue([])
    const result = await matchTextToImages('你好')
    expect(result.inputText).toBe('你好')
    expect(typeof result.elapsedMs).toBe('number')
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
    expect(result.segmentation).toBeDefined()
    expect(Array.isArray(result.segmentation.segments)).toBe(true)
  })

  it('exact match takes precedence over synonym match', async () => {
    // 图库中两条：一条的 label 是 "吃"，另一条的 synonym 包含 "吃"
    mockToArray.mockResolvedValue([
      makePictogram('其他', ['吃']),  // synonym
      makePictogram('吃'),            // exact
    ])
    const result = await matchTextToImages('吃')
    const m = result.matches[0]
    expect(m.matchType).toBe('exact')
    expect(m.pictogram?.labels.zh[0]).toBe('吃')
  })

  it('exact match takes precedence over lexicon match', async () => {
    // 词库：马桶 → 厕所；图库有精确的 "马桶" 也有 "厕所"
    // 注意：这里 mock findEntry 里 "马桶"→"厕所" 是我们设定的，
    // 但精确匹配优先，所以找到 "马桶" label 后就直接返回
    mockToArray.mockResolvedValue([
      makePictogram('马桶'), // 精确
      makePictogram('厕所'), // lexicon 路径的结果
    ])
    const result = await matchTextToImages('马桶')
    const m = result.matches[0]
    expect(m.matchType).toBe('exact')
    expect(m.pictogram?.labels.zh[0]).toBe('马桶')
  })

  it('does not crash on single character input', async () => {
    mockToArray.mockResolvedValue([makePictogram('我')])
    await expect(matchTextToImages('我')).resolves.toBeDefined()
  })

  // ─── Strategy 4: 包含匹配 ────────────────────────────────────────────────── //

  it('partial match: 2-char label embedded in longer token is found', async () => {
    // 图库只有 "胸口"（2字）；输入 "胸口疼" 可能被分为整体 token 或被拆开
    // 无论哪种路径，图片 "胸口" 都应被匹配
    mockToArray.mockResolvedValue([makePictogram('胸口')])
    const result = await matchTextToImages('胸口疼')
    const hit = result.matches.find((m) => m.pictogram?.labels.zh[0] === '胸口')
    expect(hit).toBeDefined()
    expect(['exact', 'synonym', 'partial']).toContain(hit?.matchType)
  })

  it('partial match prefers longer label when multiple candidates', async () => {
    // 图库有 "肚"（1字，应被过滤）和 "肚子"（2字）
    // 对于 token "肚子疼"，应优先匹配 "肚子"
    mockToArray.mockResolvedValue([
      makePictogram('肚'),   // 1 字，Strategy 4 不考虑
      makePictogram('肚子'), // 2 字，应命中
    ])
    const result = await matchTextToImages('肚子疼')
    const hit = result.matches.find(
      (m) => m.token === '肚子疼' && m.matchType === 'partial',
    )
    if (hit) {
      // Strategy 4 路径：应选 "肚子"（最长）而非 "肚"
      expect(hit.pictogram?.labels.zh[0]).toBe('肚子')
    } else {
      // 分词器已将 "肚子疼" 拆开，"肚子" 通过 Strategy 1 精确匹配
      const exact = result.matches.find((m) => m.token === '肚子')
      expect(exact?.matchType).toBe('exact')
    }
  })

  it('all matchType values are from the valid union', async () => {
    // 验证 matchType 的类型安全性：所有返回值都在合法集合内
    mockToArray.mockResolvedValue([makePictogram('胸口'), makePictogram('肚子')])
    const result = await matchTextToImages('我胸口疼肚子也疼')
    const valid: string[] = ['exact', 'synonym', 'lexicon', 'partial', 'missing']
    for (const m of result.matches) {
      expect(valid).toContain(m.matchType)
    }
  })
})
