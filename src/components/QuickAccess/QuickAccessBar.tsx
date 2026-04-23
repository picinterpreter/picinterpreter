/**
 * QuickAccessBar — 置顶一键播报条。
 *
 * 展示使用频率最高的 6 条收藏表达（按 usageCount 倒序），
 * 一次点击即立即触发 PlaybackOverlay。
 * 无收藏数据时不渲染，不占用布局空间。
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import type { SavedPhrase } from '@/types'
import { cn } from '@/utils/cn'

const MAX_QUICK = 6

export function QuickAccessBar() {
  const startPlayback = useAppStore((s) => s.startPlayback)

  const topPhrases = useLiveQuery(() =>
    db.savedPhrases.orderBy('usageCount').reverse().limit(MAX_QUICK).toArray(),
  )

  if (!topPhrases || topPhrases.length === 0) return null

  async function handleTap(phrase: SavedPhrase) {
    // 更新使用统计后立即播报；写失败不阻断播报
    db.savedPhrases
      .update(phrase.id, {
        usageCount: phrase.usageCount + 1,
        lastUsedAt: Date.now(),
      })
      .catch((err) => console.error('QuickAccessBar: failed to update usage stats', err))
    startPlayback(phrase.sentence, phrase.pictogramIds)
  }

  return (
    <div
      className="shrink-0 border-b border-stone-200 bg-[#f6f6f6] px-3 py-2 sm:px-4"
      role="toolbar"
      aria-label="常用语快捷播报"
    >
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        <div className="shrink-0">
          <p className="text-[11px] uppercase text-stone-500">常用句</p>
          <p className="text-xs font-medium text-slate-700">快速播放</p>
        </div>

        {topPhrases.map((phrase, index) => (
          <button
            key={phrase.id}
            onClick={() => handleTap(phrase)}
            aria-label={`一键播报：${phrase.sentence}`}
            className={cn(
              'min-h-12 min-w-32 shrink-0 rounded-xl border px-3 py-2 text-left',
              index === 0
                ? 'border-amber-300 bg-amber-100 text-amber-950'
                : 'border-stone-200 bg-stone-50 text-slate-700',
            )}
          >
            <span className="block text-[11px] uppercase text-stone-500">短句 {index + 1}</span>
            <span className="mt-1 block truncate text-sm font-medium">
              {phrase.sentence}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
