import { useRef, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore } from '@/stores/settings-store'
import { LineIcon } from '@/components/ui/LineIcon'

export function CategoryTabs() {
  const allCategories = useLiveQuery(() =>
    db.categories.orderBy('sortOrder').toArray(),
  )
  const hiddenCategoryIds = useSettingsStore((s) => s.hiddenCategoryIds)
  // Visible categories: filter out ones the caregiver has hidden
  const categories = allCategories?.filter((c) => !hiddenCategoryIds.includes(c.id))

  const activeCategoryId = useAppStore((s) => s.activeCategoryId)
  const setActiveCategory = useAppStore((s) => s.setActiveCategory)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showRightFade, setShowRightFade] = useState(true)
  const [showLeftFade, setShowLeftFade] = useState(false)

  // 监听滚动位置，控制左右渐变遮罩
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      setShowLeftFade(el.scrollLeft > 8)
      setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [categories])

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
    <div className="relative bg-white border-b border-slate-200">
      {/* 左渐变遮罩 */}
      {showLeftFade && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10
          bg-gradient-to-r from-white to-transparent" />
      )}
      {/* 右渐变遮罩 */}
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10
          bg-gradient-to-l from-white to-transparent" />
      )}

      <nav
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        aria-label="图片分类"
      >
        {/* 最近使用（虚拟分类，不在 DB 中） */}
        <button
          data-cat="recent"
          onClick={() => setActiveCategory('recent')}
          className={`apple-press flex items-center gap-1.5 px-4 py-2.5 rounded-full text-base font-semibold whitespace-nowrap transition-colors min-h-[48px] flex-shrink-0
            ${activeCategoryId === 'recent'
              ? 'bg-slate-950 text-white shadow-sm'
              : 'bg-white/80 text-slate-700 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-white'
            }`}
          aria-pressed={activeCategoryId === 'recent'}
        >
          <LineIcon name="clock" className="h-5 w-5" />
          <span>最近</span>
        </button>

        {categories?.map((cat) => (
          <button
            key={cat.id}
            data-cat={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`apple-press flex items-center gap-1.5 px-4 py-2.5 rounded-full text-base font-semibold whitespace-nowrap transition-colors min-h-[48px] flex-shrink-0
              ${activeCategoryId === cat.id
                ? 'bg-slate-950 text-white shadow-sm'
                : 'bg-white/80 text-slate-700 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-white'
              }`}
            aria-pressed={activeCategoryId === cat.id}
          >
            <span className="text-lg">{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
