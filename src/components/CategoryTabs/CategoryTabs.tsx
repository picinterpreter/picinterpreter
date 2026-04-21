import { useRef, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore } from '@/stores/settings-store'

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
    <div className="relative bg-white border-b border-gray-200">
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
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-medium whitespace-nowrap transition-colors min-h-[48px] flex-shrink-0
            ${activeCategoryId === 'recent'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          aria-pressed={activeCategoryId === 'recent'}
        >
          <span className="text-lg">🕐</span>
          <span>最近</span>
        </button>

        {categories?.map((cat) => (
          <button
            key={cat.id}
            data-cat={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-medium whitespace-nowrap transition-colors min-h-[48px] flex-shrink-0
              ${activeCategoryId === cat.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            aria-pressed={activeCategoryId === cat.id}
          >
            <span className="text-lg">{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
        <button
          onClick={() => setShowCategoryLinks(true)}
          className="flex items-center justify-center px-3 py-2.5 rounded-xl text-base font-medium whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors min-h-[48px] min-w-[48px] flex-shrink-0"
          title="管理分类链接"
          aria-label="管理分类链接"
        >
          <span className="text-lg">🔗</span>
        </button>
        <button
          onClick={() => setShowSavedPhrases(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-medium whitespace-nowrap bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors min-h-[48px] ml-auto flex-shrink-0"
        >
          <span className="text-lg">⭐</span>
          <span>常用语</span>
        </button>
      </nav>
    </div>
  )
}
