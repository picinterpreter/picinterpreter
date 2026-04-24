import { useRef, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/utils/cn'

export function CategoryTabs() {
  const allCategories = useLiveQuery(() =>
    db.categories.orderBy('sortOrder').toArray(),
  )
  const hiddenCategoryIds = useSettingsStore((s) => s.hiddenCategoryIds)
  // Visible categories: filter out ones the caregiver has hidden
  const categories = allCategories?.filter((c) => !hiddenCategoryIds.includes(c.id))

  const activeCategoryId = useAppStore((s) => s.activeCategoryId)
  const setActiveCategory = useAppStore((s) => s.setActiveCategory)
  const setShowSavedPhrases = useAppStore((s) => s.setShowSavedPhrases)
  const setShowCategoryLinks = useAppStore((s) => s.setShowCategoryLinks)

  const scrollRef = useRef<HTMLDivElement>(null)

  // 激活分类切换时自动滚动到对应 tab
  useEffect(() => {
    if (!activeCategoryId || !scrollRef.current) return
    const el = scrollRef.current
    const btn = el.querySelector<HTMLButtonElement>(`[data-cat="${activeCategoryId}"]`)
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
    }
  }, [activeCategoryId])

  return (
    <div className="shrink-0 border-b border-stone-200 bg-white">
      <nav
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide sm:px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        aria-label="图片分类"
      >
        <button
          data-cat="recent"
          onClick={() => setActiveCategory('recent')}
          className={cn(
            'flex min-h-16 min-w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-center',
            activeCategoryId === 'recent'
              ? 'border-amber-300 bg-amber-200 text-slate-950'
              : 'border-stone-200 bg-white text-stone-600',
          )}
          aria-pressed={activeCategoryId === 'recent'}
        >
          <span className="text-2xl" aria-hidden="true">🕐</span>
          <span className="text-sm font-medium">最近</span>
        </button>

        {categories?.map((cat) => (
          <button
            key={cat.id}
            data-cat={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex min-h-16 min-w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-center',
              activeCategoryId === cat.id
                ? 'border-amber-300 bg-amber-200 text-slate-950'
                : 'border-stone-200 bg-white text-stone-600',
            )}
            aria-pressed={activeCategoryId === cat.id}
          >
            <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
            <span className="line-clamp-2 text-sm font-medium leading-tight">
              {cat.name}
            </span>
          </button>
        ))}

        <button
          onClick={() => setShowCategoryLinks(true)}
          className="flex min-h-16 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 bg-white px-2 text-center text-stone-600"
          title="管理分类链接"
          aria-label="管理分类链接"
        >
          <span className="text-2xl" aria-hidden="true">🔗</span>
          <span className="text-xs font-medium">链接</span>
        </button>
        <button
          onClick={() => setShowSavedPhrases(true)}
          className="ml-auto flex min-h-16 min-w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-stone-200 bg-slate-900 px-2 text-center text-white"
        >
          <span className="text-2xl" aria-hidden="true">⭐</span>
          <span className="text-sm font-medium">常用语</span>
        </button>
      </nav>
    </div>
  )
}
