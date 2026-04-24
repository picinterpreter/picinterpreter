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
import { LineIcon } from '@/components/ui/LineIcon'
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
      className="flex shrink-0 items-center gap-2 overflow-x-auto border-b-2 border-amber-200 bg-amber-50 px-3 py-2 scrollbar-hide"
      role="toolbar"
      aria-label="常用语快捷播报"
    >
      <LineIcon name="star" className="h-4 w-4 shrink-0 text-amber-500" />
      {topPhrases.map((phrase) => (
        <button
          key={phrase.id}
          onClick={() => handleTap(phrase)}
          aria-label={`一键播报：${phrase.sentence}`}
          className="apple-press min-h-[44px] max-w-[160px] shrink-0 truncate rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-amber-950 shadow-[inset_0_0_0_2px_rgba(251,191,36,0.55)] transition-colors hover:bg-amber-100"
        >
          {phrase.sentence}
        </button>
      ))}
    </div>
  )
}
