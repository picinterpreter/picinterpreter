import { beforeAll, describe, expect, it } from 'vitest'
import { createArasaacIndex, loadArasaacRecords, type ArasaacIndex, type ArasaacRecord } from '../arasaac-index'

describe('ARASAAC pictogram index', () => {
  let index: ArasaacIndex

  beforeAll(async () => {
    const records = await loadArasaacRecords()
    index = createArasaacIndex(records)
  })

  it('loads the exported { metadata, records } JSON shape', async () => {
    const records = await loadArasaacRecords()
    expect(records.length).toBeGreaterThan(10_000)
    expect(records[0]).toHaveProperty('id')
    expect(records[0]).toHaveProperty('chineseKeywords')
  })

  it.each(['鸡汤', '冰箱', '加热', '喝'])('matches %s from the local ARASAAC data', (token) => {
    const result = index.search(token)
    expect(result.pictogram).not.toBeNull()
    expect(result.matchType).not.toBe('none')
    expect(result.pictogram?.id).toMatch(/^arasaac_/)
  })

  it.each(['剩下', '没喝完'])('leaves %s missing when there is no reliable pictogram', (token) => {
    const result = index.search(token)
    expect(result.pictogram).toBeNull()
    expect(result.matchType).toBe('none')
  })

  it('deduplicates duplicate ARASAAC ids', () => {
    const records: ArasaacRecord[] = [
      {
        id: 1,
        chineseName: '水',
        englishName: 'water',
        imageUrl500: 'https://example.com/1.png',
        chineseKeywords: ['水'],
      },
      {
        id: 1,
        chineseName: '水重复',
        englishName: 'water duplicate',
        imageUrl500: 'https://example.com/1b.png',
        chineseKeywords: ['水重复'],
      },
    ]

    const customIndex = createArasaacIndex(records)
    expect(customIndex.records).toHaveLength(1)
    expect(customIndex.search('水').pictogram?.labels.zh[0]).toBe('水')
  })
})
