import type { PictogramEntry } from '@/types'

// ─── Pure logic helpers (exported for unit tests) ────────────────────────── //

/** 从全量图片中选出最近使用的 N 条，按 lastUsedAt 倒序 */
export function buildRecentSuggestions(
  pictograms: PictogramEntry[],
  max: number,
): PictogramEntry[] {
  return pictograms
    .filter((p) => (p.lastUsedAt ?? 0) > 0)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, max)
}

/** 从同分类图片中选出使用频率最高的 N 条，排除已选中的 */
export function buildCategorySuggestions(
  pictograms: PictogramEntry[],
  categoryId: string,
  excludeIds: Set<string>,
  max: number,
): PictogramEntry[] {
  return pictograms
    .filter((p) => p.categoryId === categoryId && !excludeIds.has(p.id))
    .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0))
    .slice(0, max)
}
