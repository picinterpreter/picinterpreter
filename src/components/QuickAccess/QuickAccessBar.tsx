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
      className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-hide"
      role="toolbar"
      aria-label="常用语快捷播报"
    >
      <span className="text-xs text-amber-400 shrink-0 select-none" aria-hidden="true">⭐</span>
      {topPhrases.map((phrase) => (
        <button
          key={phrase.id}
          onClick={() => handleTap(phrase)}
          aria-label={`一键播报：${phrase.sentence}`}
          className="shrink-0 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-900 text-sm font-medium rounded-xl max-w-[160px] truncate min-h-[44px] transition-colors"
        >
          {phrase.sentence}
        </button>
      ))}
    </div>
  )
}
