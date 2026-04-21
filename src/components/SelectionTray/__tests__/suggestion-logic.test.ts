/**
 * SuggestionStrip 纯逻辑单元测试。
 *
 * 覆盖 buildRecentSuggestions 和 buildCategorySuggestions 两个辅助函数，
 * 不依赖 IndexedDB 或 React。
 */
import { describe, it, expect } from 'vitest'
import {
  buildRecentSuggestions,
  buildCategorySuggestions,
} from '../SuggestionStrip'
import type { PictogramEntry } from '@/types'

// ─── test fixture ────────────────────────────────────────────────────────── //

function makePictogram(
  overrides: Partial<PictogramEntry> & { id: string },
): PictogramEntry {
  const base: PictogramEntry = {
    id: overrides.id,
    imageUrl: '',
    labels: { zh: [overrides.id], en: [overrides.id] },
    categoryId: 'actions',
    synonyms: [],
    disambiguationHints: {},
    usageCount: 0,
  }
  return { ...base, ...overrides }
}

const P_A = makePictogram({ id: 'a', usageCount: 10, lastUsedAt: 3000, categoryId: 'food' })
const P_B = makePictogram({ id: 'b', usageCount: 5,  lastUsedAt: 2000, categoryId: 'food' })
const P_C = makePictogram({ id: 'c', usageCount: 20, lastUsedAt: 1000, categoryId: 'food' })
const P_D = makePictogram({ id: 'd', usageCount: 1,  lastUsedAt: 4000, categoryId: 'medical' })
const P_E = makePictogram({ id: 'e', usageCount: 0,  lastUsedAt: 0,   categoryId: 'food' })   // never used
const ALL = [P_A, P_B, P_C, P_D, P_E]

// ─── buildRecentSuggestions ──────────────────────────────────────────────── //

describe('buildRecentSuggestions', () => {
  it('returns items sorted by lastUsedAt descending', () => {
    const result = buildRecentSuggestions(ALL, 10)
    const ids = result.map((p) => p.id)
    // d=4000 > a=3000 > b=2000 > c=1000; e has lastUsedAt=0 so excluded
    expect(ids).toEqual(['d', 'a', 'b', 'c'])
  })

  it('excludes items with lastUsedAt = 0 (never used)', () => {
    const result = buildRecentSuggestions(ALL, 10)
    expect(result.find((p) => p.id === 'e')).toBeUndefined()
  })

  it('respects the max limit', () => {
    const result = buildRecentSuggestions(ALL, 2)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('d')
    expect(result[1].id).toBe('a')
  })

  it('returns empty array when no pictograms have been used', () => {
    const unused = [
      makePictogram({ id: 'x', usageCount: 0, lastUsedAt: 0 }),
      makePictogram({ id: 'y', usageCount: 0 }),
    ]
    expect(buildRecentSuggestions(unused, 10)).toHaveLength(0)
  })

  it('returns empty array when input is empty', () => {
    expect(buildRecentSuggestions([], 10)).toHaveLength(0)
  })
})

// ─── buildCategorySuggestions ────────────────────────────────────────────── //

describe('buildCategorySuggestions', () => {
  it('returns only items from the given category', () => {
    const result = buildCategorySuggestions(ALL, 'food', new Set(), 10)
    expect(result.every((p) => p.categoryId === 'food')).toBe(true)
    expect(result.find((p) => p.id === 'd')).toBeUndefined()   // d is 'medical'
  })

  it('sorts by usageCount descending', () => {
    const result = buildCategorySuggestions(ALL, 'food', new Set(), 10)
    const counts = result.map((p) => p.usageCount)
    const sorted = [...counts].sort((a, b) => b - a)
    expect(counts).toEqual(sorted)
  })

  it('excludes IDs in the excludeIds set', () => {
    const result = buildCategorySuggestions(ALL, 'food', new Set(['c', 'a']), 10)
    const ids = result.map((p) => p.id)
    expect(ids).not.toContain('c')
    expect(ids).not.toContain('a')
  })

  it('respects the max limit', () => {
    const result = buildCategorySuggestions(ALL, 'food', new Set(), 2)
    expect(result).toHaveLength(2)
  })

  it('returns empty array when all category items are excluded', () => {
    const excludeAll = new Set(ALL.filter((p) => p.categoryId === 'food').map((p) => p.id))
    const result = buildCategorySuggestions(ALL, 'food', excludeAll, 10)
    expect(result).toHaveLength(0)
  })

  it('returns empty array for unknown category', () => {
    const result = buildCategorySuggestions(ALL, 'nonexistent', new Set(), 10)
    expect(result).toHaveLength(0)
  })

  it('handles usageCount = undefined (treats as 0)', () => {
    const p1 = makePictogram({ id: 'x', categoryId: 'test' })         // usageCount: 0 (from makePictogram default)
    const p2 = makePictogram({ id: 'y', categoryId: 'test', usageCount: 5 })
    const result = buildCategorySuggestions([p1, p2], 'test', new Set(), 10)
    expect(result[0].id).toBe('y')
    expect(result[1].id).toBe('x')
  })
})
