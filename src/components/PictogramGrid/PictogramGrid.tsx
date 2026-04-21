import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type GridCols } from '@/stores/settings-store'
import { generatePlaceholderSvg, resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { useDebounce } from '@/hooks/use-debounce'
import type { PictogramEntry } from '@/types'

// Tailwind 类必须是完整字符串，不可动态拼接
const GRID_CLASS: Record<GridCols, string> = {
  2: 'grid-cols-2 sm:grid-cols-3',
  3: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5',
  4: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8',
}

const IMG_CLASS: Record<GridCols, string> = {
  2: 'w-20 h-20',
  3: 'w-16 h-16',
  4: 'w-12 h-12',
}

const CATEGORY_COLORS: Record<string, string> = {
  quickchat: '#1d4ed8',
  actions:   '#16a34a',
  emotions:  '#ea580c',
  food:      '#dc2626',
  people:    '#7c3aed',
  places:    '#0891b2',
  medical:   '#0d9488',
  time:      '#d97706',
  animals:   '#65a30d',
  colors:    '#db2777',
  daily:     '#4A90D9',
  objects:   '#8E44AD',
}

/**
 * 递归收集分类自身及其所有链接分类的图片。
 *
 * @param categoryId  当前分类 ID
 * @param ancestors   当前递归路径上已访问的分类 ID（祖先集合，防止直接环路）
 * @param depth       当前递归深度，超过 3 时截断防止意外的深层嵌套
 *
 * 注意：每个递归分支传入 ancestors 的快照副本，确保兄弟节点之间互不影响。
 */
async function resolveLinkedPictograms(
  categoryId: string,
  ancestors = new Set<string>(),
  depth = 0,
): Promise<{ items: PictogramEntry[]; sourceName: string | null }[]> {
  if (ancestors.has(categoryId) || depth > 3) return []

  // 为当前分支克隆祖先集合，避免兄弟分支共享状态
  const currentAncestors = new Set(ancestors)
  currentAncestors.add(categoryId)

  const [ownItemsRaw, category] = await Promise.all([
    db.pictograms.where('categoryId').equals(categoryId).toArray(),
    db.categories.get(categoryId),
  ])
  // 按使用次数降序排列：高频词条自动浮到前面（新建副本保持不可变）
  const ownItems = [...ownItemsRaw].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0))

  // 本分类图片（sourceName = null 表示"属于当前分类本身"）
  const result: { items: PictogramEntry[]; sourceName: string | null }[] = [
    { items: ownItems, sourceName: null },
  ]

  // 递归解析链接分类 — 批量读取避免 N+1
  const linkedIds = category?.linkedCategoryIds ?? []
  if (linkedIds.length === 0) return result

  const linkedCategories = (await db.categories.bulkGet(linkedIds)).filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )

  for (const linkedCategory of linkedCategories) {
    // 每个兄弟分支都用同一个快照副本开启，不互相污染
    const subResult = await resolveLinkedPictograms(
      linkedCategory.id,
      currentAncestors,
      depth + 1,
    )
    for (const group of subResult) {
      // 第一层链接：标注来源名；更深层继续带原来的来源名（显示顶层链接分类）
      result.push({
        items: group.items,
        sourceName: group.sourceName ?? linkedCategory.name,
      })
    }
  }

  return result
}

/** 图片条目 + 来源分类名（null = 本分类直接包含） */
type PictogramWithSource = PictogramEntry & { sourceName: string | null }

export function PictogramGrid() {
  const activeCategoryId = useAppStore((s) => s.activeCategoryId)
  const addPictogram = useAppStore((s) => s.addPictogram)
  const gridCols = useSettingsStore((s) => s.gridCols)

  const [searchQuery, setSearchQuery] = useState('')
  // 防抖：250 ms 后才触发 Dexie 查询，避免每次按键都扫描全库
  const debouncedQuery = useDebounce(searchQuery, 250)

  const pictograms = useLiveQuery(async (): Promise<PictogramWithSource[]> => {
    const q = debouncedQuery.trim()

    // 搜索模式：跨所有分类搜索（不显示来源）
    if (q) {
      const items = await db.pictograms.filter((p) =>
        p.labels.zh.some((l) => l.includes(q)) ||
        p.synonyms.some((s) => s.includes(q)),
      ).toArray()
      return items.map((p) => ({ ...p, sourceName: null }))
    }

    // 最近使用：按上次使用时间倒序
    if (activeCategoryId === 'recent') {
      const used = await db.pictograms.filter((p) => (p.lastUsedAt ?? 0) > 0).toArray()
      return used
        .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
        .slice(0, 24)
        .map((p) => ({ ...p, sourceName: null }))
    }

    // 普通分类：包含链接分类的图片
    const groups = await resolveLinkedPictograms(activeCategoryId)
    const seen = new Set<string>()
    const result: PictogramWithSource[] = []

    // 本分类图片优先，链接分类图片追加（去重）
    for (const { items, sourceName } of groups) {
      for (const p of items) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          result.push({ ...p, sourceName })
        }
      }
    }

    return result
  }, [activeCategoryId, debouncedQuery])

  function handleSelect(p: PictogramEntry) {
    addPictogram(p)
    db.pictograms.update(p.id, {
      usageCount: p.usageCount + 1,
      lastUsedAt: Date.now(),
    })
  }

  const color = CATEGORY_COLORS[activeCategoryId] ?? '#4A90D9'
  const isSearching = debouncedQuery.trim().length > 0
  // 当前结果中是否有来自链接分类的图片
  const hasLinkedItems = pictograms?.some((p) => p.sourceName !== null) ?? false

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      {/* 搜索栏 */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-3 pb-2.5 border-b border-gray-100 shadow-sm">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索图片…"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full"
              aria-label="清除搜索"
            >
              ✕
            </button>
          )}
        </div>
        {isSearching && (
          <p className="mt-1.5 text-sm text-gray-500">
            找到 {pictograms?.length ?? 0} 个结果
          </p>
        )}
        {!isSearching && hasLinkedItems && (
          <p className="mt-1.5 text-xs text-blue-500">
            🔗 包含链接分类的图片
          </p>
        )}
      </div>

      {/* 图片网格 */}
      <div className="p-4">
        <div className={`grid ${GRID_CLASS[gridCols]} gap-3`}>
          {pictograms?.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all active:scale-95 min-h-[90px] relative"
              aria-label={p.labels.zh[0]}
            >
              {/* 来源标记（链接分类的图片） */}
              {p.sourceName !== null && (
                <span
                  aria-label={`来自：${p.sourceName}`}
                  className="absolute top-1 right-1 text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 leading-none max-w-[60px] truncate"
                >
                  🔗 {p.sourceName}
                </span>
              )}
              <img
                src={resolveImageSrc(p.imageUrl, p.labels.zh[0], color)}
                alt={p.labels.zh[0]}
                className={`${IMG_CLASS[gridCols]} object-contain`}
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget
                  if (!img.src.startsWith('data:')) {
                    img.src = generatePlaceholderSvg(p.labels.zh[0], color)
                  }
                }}
              />
              <span className="text-base font-medium text-gray-800 text-center leading-tight">
                {p.labels.zh[0]}
              </span>
            </button>
          ))}
        </div>

        {/* 空状态 */}
        {pictograms?.length === 0 && isSearching && (
          <div className="text-center text-gray-400 mt-12 space-y-2">
            <p className="text-4xl">🔍</p>
            <p className="text-lg">没有找到「{debouncedQuery}」</p>
            <p className="text-base">换个词试试，或浏览分类找图片</p>
          </div>
        )}
        {pictograms?.length === 0 && !isSearching && activeCategoryId === 'recent' && (
          <div className="text-center text-gray-400 mt-12 space-y-2">
            <p className="text-4xl">🕐</p>
            <p className="text-lg">还没有使用记录</p>
            <p className="text-base">点击任意图片后会出现在这里</p>
          </div>
        )}
        {pictograms?.length === 0 && !isSearching && activeCategoryId !== 'recent' && (
          <div className="text-center text-gray-400 text-lg mt-12">
            该分类暂无图片
          </div>
        )}
      </div>
    </div>
  )
}
