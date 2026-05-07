import { describe, expect, it } from 'vitest'
import type { PictogramEntry } from '@/types'
import {
  movePictogramManualOrder,
  normalizeManualOrders,
  sortPictogramsForDisplay,
} from '@/utils/pictogram-order'

function makePictogram(
  id: string,
  label: string,
  usageCount: number,
  manualOrder?: number,
): PictogramEntry {
  return {
    id,
    imageUrl: '',
    labels: { zh: [label], en: [label] },
    categoryId: 'actions',
    synonyms: [],
    disambiguationHints: {},
    usageCount,
    manualOrder,
  }
}

describe('pictogram ordering', () => {
  it('uses manual order by default', () => {
    const items = [
      makePictogram('b', 'B', 10, 1),
      makePictogram('a', 'A', 1, 0),
      makePictogram('c', 'C', 99, 2),
    ]

    expect(sortPictogramsForDisplay(items, 'manual').map((item) => item.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('uses popularity first and manual order as tiebreaker', () => {
    const items = [
      makePictogram('b', 'B', 5, 1),
      makePictogram('a', 'A', 9, 2),
      makePictogram('c', 'C', 5, 0),
    ]

    expect(sortPictogramsForDisplay(items, 'popularity').map((item) => item.id)).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  it('normalizes missing manual order values', () => {
    const items = [
      makePictogram('b', 'B', 0, 4),
      makePictogram('a', 'A', 0),
      makePictogram('c', 'C', 0, 1),
    ]

    expect(normalizeManualOrders(items).map((item) => [item.id, item.manualOrder])).toEqual([
      ['c', 0],
      ['b', 1],
      ['a', 2],
    ])
  })

  it('moves a pictogram up within manual order', () => {
    const items = [
      makePictogram('a', 'A', 0, 0),
      makePictogram('b', 'B', 0, 1),
      makePictogram('c', 'C', 0, 2),
    ]

    expect(movePictogramManualOrder(items, 'c', 'up').map((item) => item.id)).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  it('moves a pictogram down within manual order', () => {
    const items = [
      makePictogram('a', 'A', 0, 0),
      makePictogram('b', 'B', 0, 1),
      makePictogram('c', 'C', 0, 2),
    ]

    expect(movePictogramManualOrder(items, 'a', 'down').map((item) => item.id)).toEqual([
      'b',
      'a',
      'c',
    ])
  })
})
