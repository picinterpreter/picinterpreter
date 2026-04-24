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
  const setShowSavedPhrases = useAppStore((s) => s.setShowSavedPhrases)
  const setShowCategoryLinks = useAppStore((s) => s.setShowCategoryLinks)
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
    <div className="relative border-b border-stone-200 bg-stone-50">
      {/* 左渐变遮罩 */}
      {showLeftFade && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10
          bg-gradient-to-r from-stone-50 to-transparent" />
      )}
      {/* 右渐变遮罩 */}
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10
          bg-gradient-to-l from-stone-50 to-transparent" />
      )}

      <nav
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        aria-label="图片分类"
      >
        {/* 最近使用（虚拟分类，不在 DB 中） */}
        <button
          data-cat="quickchat"
          onClick={() => setActiveCategory('quickchat')}
          className={`apple-press flex min-h-[48px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-base font-semibold transition-colors
            ${activeCategoryId === 'quickchat'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-800 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.26)] hover:bg-stone-100'
            }`}
          aria-pressed={activeCategoryId === 'quickchat'}
        >
          <LineIcon name="message" className="h-5 w-5" />
          <span>首页</span>
        </button>
        <button
          data-cat="recent"
          onClick={() => setActiveCategory('recent')}
          className={`apple-press flex items-center gap-1.5 px-4 py-2.5 rounded-full text-base font-semibold whitespace-nowrap transition-colors min-h-[48px] flex-shrink-0
            ${activeCategoryId === 'recent'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-800 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.26)] hover:bg-stone-100'
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
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-800 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.26)] hover:bg-stone-100'
              }`}
            aria-pressed={activeCategoryId === cat.id}
          >
            <span className="text-lg">{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
        <button
          onClick={() => setShowSavedPhrases(true)}
          className="apple-press flex min-h-[48px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-base font-semibold text-slate-800 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.26)] transition-colors hover:bg-stone-100"
          aria-label="常用语"
        >
          <LineIcon name="star" className="h-5 w-5" />
          <span>常用</span>
        </button>
        <button
          onClick={() => setShowCategoryLinks(true)}
          className="apple-press flex min-h-[48px] min-w-[48px] flex-shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.26)] transition-colors hover:bg-stone-100"
          aria-label="分类链接管理"
          title="分类链接管理"
        >
          <LineIcon name="link" className="h-5 w-5" />
        </button>
      </nav>
    </div>
  )
}
