import type { PictogramEntry } from '@/types'

export type PictogramSortMode = 'manual' | 'popularity'

function normalizeOrderValue(item: PictogramEntry): number {
  return typeof item.manualOrder === 'number' ? item.manualOrder : Number.MAX_SAFE_INTEGER
}

export function sortPictogramsForDisplay(
  pictograms: PictogramEntry[],
  mode: PictogramSortMode,
): PictogramEntry[] {
  const items = [...pictograms]

  if (mode === 'popularity') {
    return items.sort((a, b) => {
      const usageDiff = (b.usageCount ?? 0) - (a.usageCount ?? 0)
      if (usageDiff !== 0) return usageDiff

      const manualDiff = normalizeOrderValue(a) - normalizeOrderValue(b)
      if (manualDiff !== 0) return manualDiff

      return (a.labels.zh[0] ?? '').localeCompare(b.labels.zh[0] ?? '', 'zh-CN')
    })
  }

  return items.sort((a, b) => {
    const manualDiff = normalizeOrderValue(a) - normalizeOrderValue(b)
    if (manualDiff !== 0) return manualDiff

    return (a.labels.zh[0] ?? '').localeCompare(b.labels.zh[0] ?? '', 'zh-CN')
  })
}

export function normalizeManualOrders(
  pictograms: PictogramEntry[],
): Array<PictogramEntry & { manualOrder: number }> {
  const sorted = sortPictogramsForDisplay(pictograms, 'manual')
  return sorted.map((item, index) => ({ ...item, manualOrder: index }))
}

export function movePictogramManualOrder(
  pictograms: PictogramEntry[],
  itemId: string,
  direction: 'up' | 'down',
): Array<PictogramEntry & { manualOrder: number }> {
  const ordered = normalizeManualOrders(pictograms)
  const index = ordered.findIndex((item) => item.id === itemId)

  if (index < 0) return ordered

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= ordered.length) return ordered

  const swapped = [...ordered]
  ;[swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]]

  return swapped.map((item, nextIndex) => ({ ...item, manualOrder: nextIndex }))
}
