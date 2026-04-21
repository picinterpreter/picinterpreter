/**
 * buildRecentContext 单元测试。
 *
 * @/db 被 mock，不依赖真实 IndexedDB。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Expression } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────── //

const SESSION_ID = 'test-session-123'
const NOW = Date.now()

function makeExpression(
  overrides: Partial<Expression> & { selectedSentence: string | null },
): Expression {
  const base: Expression = {
    id: crypto.randomUUID(),
    sessionId: SESSION_ID,
    direction: 'express',
    pictogramIds: [],
    pictogramLabels: [],
    candidateSentences: [],
    selectedSentence: null,
    createdAt: NOW,
    isFavorite: false,
  }
  return { ...base, ...overrides }
}

// ─── Mock @/db ───────────────────────────────────────────────────────────── //

const mockWhere = vi.fn()
const mockEquals = vi.fn()
const mockToArray = vi.fn<() => Promise<Expression[]>>()

vi.mock('@/db', () => ({
  db: {
    expressions: {
      where: (field: string) => {
        mockWhere(field)
        return {
          equals: (val: string) => {
            mockEquals(val)
            return { toArray: mockToArray }
          },
        }
      },
    },
  },
}))

const { buildRecentContext } = await import('../nlg-context')

// ─── tests ───────────────────────────────────────────────────────────────── //

describe('buildRecentContext', () => {
  beforeEach(() => {
    mockWhere.mockClear()
    mockEquals.mockClear()
    mockToArray.mockReset()
  })

  it('returns undefined for empty sessionId', async () => {
    const result = await buildRecentContext('')
    expect(result).toBeUndefined()
    // DB should not be queried
    expect(mockWhere).not.toHaveBeenCalled()
  })

  it('returns undefined when no expressions found for session', async () => {
    mockToArray.mockResolvedValue([])
    const result = await buildRecentContext(SESSION_ID)
    expect(result).toBeUndefined()
  })

  it('returns undefined when expressions exist but all have null selectedSentence', async () => {
    mockToArray.mockResolvedValue([
      makeExpression({ selectedSentence: null }),
      makeExpression({ selectedSentence: null }),
    ])
    const result = await buildRecentContext(SESSION_ID)
    expect(result).toBeUndefined()
  })

  it('returns undefined when expressions exist but all have empty selectedSentence', async () => {
    mockToArray.mockResolvedValue([
      makeExpression({ selectedSentence: '   ' }),
      makeExpression({ selectedSentence: '' }),
    ])
    const result = await buildRecentContext(SESSION_ID)
    expect(result).toBeUndefined()
  })

  it('returns recentSentences from matching expressions', async () => {
    mockToArray.mockResolvedValue([
      makeExpression({ selectedSentence: '我想吃饭', createdAt: NOW - 1000 }),
      makeExpression({ selectedSentence: '我要喝水', createdAt: NOW - 500 }),
    ])
    const result = await buildRecentContext(SESSION_ID)
    expect(result).toBeDefined()
    expect(result?.recentSentences).toEqual(['我想吃饭', '我要喝水'])
  })

  it('returns sentences in chronological order (oldest first)', async () => {
    mockToArray.mockResolvedValue([
      makeExpression({ selectedSentence: '第三句', createdAt: NOW - 100 }),
      makeExpression({ selectedSentence: '第一句', createdAt: NOW - 3000 }),
      makeExpression({ selectedSentence: '第二句', createdAt: NOW - 1000 }),
    ])
    const result = await buildRecentContext(SESSION_ID)
    expect(result?.recentSentences).toEqual(['第一句', '第二句', '第三句'])
  })

  it('limits to 5 most recent by default', async () => {
    const expressions = Array.from({ length: 8 }, (_, i) =>
      makeExpression({ selectedSentence: `句子${i + 1}`, createdAt: NOW - (8 - i) * 1000 }),
    )
    mockToArray.mockResolvedValue(expressions)
    const result = await buildRecentContext(SESSION_ID)
    expect(result?.recentSentences?.length).toBe(5)
    // 应取最后 5 句（最新的）
    expect(result?.recentSentences).toEqual(['句子4', '句子5', '句子6', '句子7', '句子8'])
  })

  it('respects custom limit option', async () => {
    const expressions = Array.from({ length: 6 }, (_, i) =>
      makeExpression({ selectedSentence: `句子${i + 1}`, createdAt: NOW - (6 - i) * 1000 }),
    )
    mockToArray.mockResolvedValue(expressions)
    const result = await buildRecentContext(SESSION_ID, { limit: 3 })
    expect(result?.recentSentences?.length).toBe(3)
  })

  it('filters out expressions outside the time window', async () => {
    const oldTime = NOW - 40 * 60 * 1000 // 40 min ago (outside default 30 min)
    mockToArray.mockResolvedValue([
      makeExpression({ selectedSentence: '过期了', createdAt: oldTime }),
      makeExpression({ selectedSentence: '新鲜的', createdAt: NOW - 5000 }),
    ])
    const result = await buildRecentContext(SESSION_ID)
    expect(result?.recentSentences).toEqual(['新鲜的'])
  })

  it('queries DB with the correct sessionId index', async () => {
    mockToArray.mockResolvedValue([])
    await buildRecentContext('my-session-uuid')
    expect(mockWhere).toHaveBeenCalledWith('sessionId')
    expect(mockEquals).toHaveBeenCalledWith('my-session-uuid')
  })

  it('skips expressions with whitespace-only selectedSentence', async () => {
    mockToArray.mockResolvedValue([
      makeExpression({ selectedSentence: '有效句子', createdAt: NOW - 1000 }),
      makeExpression({ selectedSentence: '  ', createdAt: NOW - 500 }),
    ])
    const result = await buildRecentContext(SESSION_ID)
    expect(result?.recentSentences).toEqual(['有效句子'])
  })
})
