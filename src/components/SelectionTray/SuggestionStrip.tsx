/**
 * SuggestionStrip — 暂存区下方的"下一词"快速建议条。
 *
 * 逻辑：
 *  - 暂存区为空时：显示最近使用的图片（快速启动常见表达）
 *  - 暂存区非空时：显示与「最后一个已选图片」同分类中使用频率最高的图片
 *    （排除已选中的图片，避免重复）
 *
 * 在候选句面板打开期间自动隐藏，不占据空间。
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { LineIcon } from '@/components/ui/LineIcon'
import type { PictogramEntry } from '@/types'

const MAX_SUGGESTIONS = 8

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

// ─── Component ───────────────────────────────────────────────────────────── //

export function SuggestionStrip() {
  const selectedPictograms = useAppStore((s) => s.selectedPictograms)
  const addPictogram = useAppStore((s) => s.addPictogram)
  const showCandidatePanel = useAppStore((s) => s.showCandidatePanel)

  const lastSelected = selectedPictograms[selectedPictograms.length - 1] ?? null

  // 稳定的依赖字符串：只在选中 ID 集合真正变化时重新查询
  const selKeyDep = selectedPictograms.map((p) => p.id).join(',')

  const suggestions = useLiveQuery(async (): Promise<PictogramEntry[]> => {
    const selectedIds = new Set(selectedPictograms.map((p) => p.id))

    if (lastSelected === null) {
      // 暂存区为空：利用 lastUsedAt 索引高效查询最近使用的图片（O(MAX) 读取）
      const used = await db.pictograms
        .orderBy('lastUsedAt')
        .reverse()
        .filter((p) => (p.lastUsedAt ?? 0) > 0)
        .limit(MAX_SUGGESTIONS)
        .toArray()
      return used
    }

    // 暂存区非空：同分类高频图片（排除已选）
    // selKeyDep 在此作为非 Dexie 的外部依赖，确保选中集合变化时查询重新运行
    const catItems = await db.pictograms
      .where('categoryId')
      .equals(lastSelected.categoryId)
      .toArray()

    return buildCategorySuggestions(catItems, lastSelected.categoryId, selectedIds, MAX_SUGGESTIONS)
  }, [selKeyDep])

  // 候选句面板打开期间不占空间；无建议时也不渲染
  if (showCandidatePanel || !suggestions || suggestions.length === 0) return null

  function handleSelect(p: PictogramEntry) {
    addPictogram(p)
    // 更新使用统计，保持建议列表顺序的实时性；写失败只影响统计，不阻断交互
    db.pictograms
      .update(p.id, { usageCount: p.usageCount + 1, lastUsedAt: Date.now() })
      .catch((err) => console.error('SuggestionStrip: failed to update usage stats', err))
  }

  const hint =
    lastSelected === null
      ? '最近使用'
      : `${lastSelected.labels.zh[0]}相关`

  return (
    <div className="px-3 pt-2 pb-2 bg-white/65 border-t border-slate-200 backdrop-blur-xl">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400 select-none" aria-label={hint}>
        <LineIcon name="sparkle" className="h-3.5 w-3.5" />
        <span className="sr-only">{hint}</span>
      </p>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {suggestions.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(p)}
            className="apple-press flex flex-col items-center gap-0.5 p-1.5 rounded-2xl bg-white border border-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_2px_5px_rgba(15,23,42,0.08),0_12px_24px_rgba(15,23,42,0.08)] transition-all shrink-0 min-w-[64px]"
            aria-label={`快速添加：${p.labels.zh[0]}`}
          >
            <img
              src={resolveImageSrc(p.imageUrl, p.labels.zh[0], '#6B7280')}
              alt={p.labels.zh[0]}
              className="w-10 h-10 object-contain pointer-events-none"
            />
            <span className="text-xs font-medium text-slate-700 truncate max-w-[56px] select-none">
              {p.labels.zh[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
