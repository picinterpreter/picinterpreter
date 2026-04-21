import { describe, it, expect } from 'vitest'
import {
  buildPhrasesExport,
  parsePhrasesImport,
  mergePhrases,
} from '../phrase-transfer'
import type { SavedPhrase } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────── //

function makePhrase(overrides: Partial<SavedPhrase> & { id: string }): SavedPhrase {
  const base: SavedPhrase = {
    id: overrides.id,
    sentence: `句子-${overrides.id}`,
    pictogramIds: [],
    usageCount: 0,
    lastUsedAt: 0,
  }
  return { ...base, ...overrides }
}

// ─── buildPhrasesExport ──────────────────────────────────────────────────── //

describe('buildPhrasesExport', () => {
  it('produces correct envelope shape', () => {
    const phrases = [makePhrase({ id: 'p1' })]
    const result = buildPhrasesExport(phrases)

    expect(result.version).toBe(1)
    expect(result.appId).toBe('tuyujia')
    expect(result.phrases).toHaveLength(1)
    expect(result.phrases[0].id).toBe('p1')
  })

  it('exportedAt is a valid ISO date string', () => {
    const result = buildPhrasesExport([])
    const d = new Date(result.exportedAt)
    expect(isNaN(d.getTime())).toBe(false)
  })

  it('does not mutate input phrases', () => {
    const phrase = makePhrase({ id: 'p1', usageCount: 5 })
    const original = { ...phrase }
    buildPhrasesExport([phrase])
    expect(phrase).toEqual(original)
  })
})

// ─── parsePhrasesImport ──────────────────────────────────────────────────── //

describe('parsePhrasesImport', () => {
  function validJson(phrases: unknown[] = []) {
    return JSON.stringify({
      version: 1,
      appId: 'tuyujia',
      exportedAt: new Date().toISOString(),
      phrases,
    })
  }

  it('returns ok:true for valid JSON with zero phrases', () => {
    const result = parsePhrasesImport(validJson([]))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.phrases).toHaveLength(0)
  })

  it('parses a valid phrase correctly', () => {
    const p = makePhrase({ id: 'abc', sentence: '我很痛', usageCount: 3, lastUsedAt: 1234567890 })
    const result = parsePhrasesImport(validJson([p]))
    expect(result.ok).toBe(true)
    if (result.ok) {
      const parsed = result.phrases[0]
      expect(parsed.id).toBe('abc')
      expect(parsed.sentence).toBe('我很痛')
      expect(parsed.usageCount).toBe(3)
    }
  })

  it('strips non-string values from pictogramIds', () => {
    const p = { id: 'x', sentence: '测试', pictogramIds: ['a', 42, null, 'b'], usageCount: 0, lastUsedAt: 0 }
    const result = parsePhrasesImport(validJson([p]))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.phrases[0].pictogramIds).toEqual(['a', 'b'])
    }
  })

  it('returns ok:false for malformed JSON', () => {
    const result = parsePhrasesImport('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('JSON')
  })

  it('returns ok:false for wrong appId', () => {
    const json = JSON.stringify({ version: 1, appId: 'other-app', phrases: [] })
    const result = parsePhrasesImport(json)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('图语家')
  })

  it('returns ok:false for unsupported version', () => {
    const json = JSON.stringify({ version: 99, appId: 'tuyujia', phrases: [] })
    const result = parsePhrasesImport(json)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('版本')
  })

  it('returns ok:false if phrases is not an array', () => {
    const json = JSON.stringify({ version: 1, appId: 'tuyujia', phrases: 'oops' })
    const result = parsePhrasesImport(json)
    expect(result.ok).toBe(false)
  })

  it('returns ok:false if a phrase is missing required fields', () => {
    const bad = { id: 'x', sentence: '测试' /* missing pictogramIds etc */ }
    const result = parsePhrasesImport(validJson([bad]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('第 1 条')
  })

  it('returns ok:false (not a crash) when a phrase entry is null', () => {
    const result = parsePhrasesImport(validJson([null]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('第 1 条')
  })

  it('returns ok:false (not a crash) when a phrase entry is a primitive', () => {
    const result = parsePhrasesImport(validJson([42, 'oops']))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('第 1 条')
  })

  it('returns ok:false (not a crash) when a phrase entry is an array', () => {
    const result = parsePhrasesImport(validJson([['a', 'b']]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('第 1 条')
  })
})

// ─── mergePhrases ────────────────────────────────────────────────────────── //

describe('mergePhrases', () => {
  it('adds all when no existing ids', () => {
    const incoming = [makePhrase({ id: 'a' }), makePhrase({ id: 'b' })]
    const { toAdd, skippedCount } = mergePhrases(incoming, new Set())
    expect(toAdd).toHaveLength(2)
    expect(skippedCount).toBe(0)
  })

  it('skips phrases whose id already exists', () => {
    const incoming = [makePhrase({ id: 'a' }), makePhrase({ id: 'b' })]
    const { toAdd, skippedCount } = mergePhrases(incoming, new Set(['a']))
    expect(toAdd).toHaveLength(1)
    expect(toAdd[0].id).toBe('b')
    expect(skippedCount).toBe(1)
  })

  it('skips all when all ids already exist', () => {
    const incoming = [makePhrase({ id: 'a' }), makePhrase({ id: 'b' })]
    const { toAdd, skippedCount } = mergePhrases(incoming, new Set(['a', 'b']))
    expect(toAdd).toHaveLength(0)
    expect(skippedCount).toBe(2)
  })

  it('does not mutate the incoming array', () => {
    const incoming = [makePhrase({ id: 'a' })]
    const copy = [...incoming]
    mergePhrases(incoming, new Set(['a']))
    expect(incoming).toEqual(copy)
  })
})
