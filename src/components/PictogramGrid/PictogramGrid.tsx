import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, type ReactNode } from 'react'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type GridCols } from '@/stores/settings-store'
import { generatePlaceholderSvg, resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { sortPictogramsForDisplay } from '@/utils/pictogram-order'
import { LineIcon } from '@/components/ui/LineIcon'
import { CategoryIcon } from '@/components/CategoryIcon/CategoryIcon'
import type { BoardTile, Category, PictogramEntry } from '@/types'

// Tailwind 类必须是完整字符串，不可动态拼接
const GRID_CLASS: Record<GridCols, string> = {
  2: 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]',
  3: 'grid-cols-[repeat(auto-fill,minmax(126px,1fr))]',
  4: 'grid-cols-[repeat(auto-fill,minmax(104px,1fr))]',
}

const IMG_CLASS: Record<GridCols, string> = {
  2: 'w-20 h-20',
  3: 'w-16 h-16',
  4: 'w-12 h-12',
}

const ROOT_TILE_HEIGHT_CLASS = 'h-[136px] sm:h-[150px]'
const ROOT_MEDIA_SLOT_CLASS = 'size-[76px] sm:size-20'
const ROOT_TILE_LABEL_CLASS = 'text-base sm:text-lg'

const CATEGORY_COLORS: Record<string, string> = {
  quickchat: '#1d4ed8',
  actions:   '#16a34a',
  repair:    '#7c3aed',
  emotions:  '#ea580c',
  food:      '#dc2626',
  people:    '#7c3aed',
  places:    '#0891b2',
  medical:   '#0d9488',
  time:      '#d97706',
  activities:'#2563eb',
  animals:   '#65a30d',
  colors:    '#db2777',
  daily:     '#4A90D9',
  objects:   '#8E44AD',
}

const GRID_TONE_CLASS: Record<string, string> = {
  root:      'bg-slate-50',
  recent:    'bg-amber-50',
  quickchat: 'bg-sky-50',
  actions:   'bg-emerald-50',
  repair:    'bg-violet-50',
  emotions:  'bg-orange-50',
  food:      'bg-rose-50',
  people:    'bg-violet-50',
  places:    'bg-cyan-50',
  medical:   'bg-teal-50',
  time:      'bg-yellow-50',
  activities:'bg-blue-50',
  animals:   'bg-lime-50',
  colors:    'bg-pink-50',
  daily:     'bg-blue-50',
  objects:   'bg-fuchsia-50',
}

type GridItem =
  | { type: 'pictogram'; key: string; pictogram: PictogramEntry }
  | { type: 'category'; key: string; category: Category }
  | { type: 'savedPhrases'; key: string; label: string }

function withLabelOverride(pictogram: PictogramEntry, labelOverride?: string): PictogramEntry {
  if (!labelOverride) return pictogram
  return {
    ...pictogram,
    labels: {
      ...pictogram.labels,
      zh: [labelOverride, ...pictogram.labels.zh.filter((item) => item !== labelOverride)],
    },
  }
}

export function PictogramGrid() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeCategoryId = useAppStore((s) => s.activeCategoryId)
  const categoryPath = useAppStore((s) => s.categoryPath)
  const openCategory = useAppStore((s) => s.openCategory)
  const goBackCategory = useAppStore((s) => s.goBackCategory)
  const goRootCategory = useAppStore((s) => s.goRootCategory)
  const addPictogram = useAppStore((s) => s.addPictogram)
  const setShowSavedPhrases = useAppStore((s) => s.setShowSavedPhrases)
  const setShowCategoryLinks = useAppStore((s) => s.setShowCategoryLinks)
  const gridCols = useSettingsStore((s) => s.gridCols)
  const pictogramSortMode = useSettingsStore((s) => s.pictogramSortMode)
  const hiddenCategoryIds = useSettingsStore((s) => s.hiddenCategoryIds)

  const allCategories = useLiveQuery(() =>
    db.categories.orderBy('sortOrder').toArray(),
  )
  const homeCategory = allCategories?.find((c) => c.id === 'home')
  const isRoot = activeCategoryId === 'root'
  const activeCategory = isRoot
    ? homeCategory
    : allCategories?.find((c) => c.id === activeCategoryId)

  const gridItems = useLiveQuery(async (): Promise<GridItem[]> => {
    // 最近使用：按上次使用时间倒序
    if (activeCategoryId === 'recent') {
      const used = await db.pictograms.filter((p) => (p.lastUsedAt ?? 0) > 0).toArray()
      return used
        .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
        .slice(0, 24)
        .map((p) => ({ type: 'pictogram', key: `pictogram:${p.id}`, pictogram: p }))
    }

    // root 状态映射到 home 板（实际上是 hidden 的 'home' category）
    const targetId = activeCategoryId === 'root' ? 'home' : activeCategoryId

    const visibleCategory = (category: Category | undefined): category is Category =>
      Boolean(category && !hiddenCategoryIds.includes(category.id))

    async function resolveTiles(tiles: BoardTile[]): Promise<GridItem[]> {
      const pictogramIds = tiles.filter((tile) => tile.type === 'pictogram').map((tile) => tile.id)
      const categoryIds = tiles.filter((tile) => tile.type === 'category').map((tile) => tile.id)
      const [pictogramsByIndex, categoriesByIndex] = await Promise.all([
        db.pictograms.bulkGet(pictogramIds),
        db.categories.bulkGet(categoryIds),
      ])

      const pictograms = new Map<string, PictogramEntry>()
      pictogramIds.forEach((id, index) => {
        const pictogram = pictogramsByIndex[index]
        if (pictogram) pictograms.set(id, pictogram)
      })

      const categories = new Map<string, Category>()
      categoryIds.forEach((id, index) => {
        const category = categoriesByIndex[index]
        if (visibleCategory(category)) categories.set(id, category)
      })

      return tiles.flatMap((tile, index): GridItem[] => {
        if (tile.type === 'pictogram') {
          const pictogram = pictograms.get(tile.id)
          return pictogram
            ? [{
                type: 'pictogram',
                key: `pictogram:${tile.id}:${index}`,
                pictogram: withLabelOverride(pictogram, tile.labelOverride),
              }]
            : []
        }

        if (tile.type === 'category') {
          const category = categories.get(tile.id)
          return category
            ? [{
                type: 'category',
                key: `category:${tile.id}:${index}`,
                category: tile.labelOverride ? { ...category, name: tile.labelOverride } : category,
              }]
            : []
        }

        return [{
          type: 'savedPhrases',
          key: `savedPhrases:${tile.id}:${index}`,
          label: tile.labelOverride ?? '常用',
        }]
      })
    }

    // 显式策展优先：Category.tileIds 存在则按列表顺序加载；
    // 否则 fallback 到 categoryIds 多值索引查询。
    const cat = await db.categories.get(targetId)
    if (cat?.tiles && cat.tiles.length > 0) {
      return resolveTiles(cat.tiles)
    }

    if (cat?.tileIds && cat.tileIds.length > 0) {
      const fetched = await db.pictograms.bulkGet(cat.tileIds)
      return fetched
        .filter((p): p is PictogramEntry => Boolean(p))
        .map((p) => ({ type: 'pictogram', key: `pictogram:${p.id}`, pictogram: p }))
    }

    const linkedCategoryIds = cat?.linkedCategoryIds ?? []
    const linkedCategories = await db.categories.bulkGet(linkedCategoryIds)
    const categoryItems: GridItem[] = linkedCategoryIds.flatMap((id, index) => {
      const category = linkedCategories[index]
      return visibleCategory(category)
        ? [{ type: 'category', key: `category:${id}`, category }]
        : []
    })

    const ownItems = await db.pictograms.where('categoryIds').equals(targetId).toArray()
    const pictogramItems: GridItem[] = sortPictogramsForDisplay(ownItems, pictogramSortMode)
      .map((p) => ({ type: 'pictogram', key: `pictogram:${p.id}`, pictogram: p }))
    return [...categoryItems, ...pictogramItems]
  }, [activeCategoryId, hiddenCategoryIds, pictogramSortMode])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeCategoryId])

  function handleSelect(p: PictogramEntry) {
    addPictogram(p)
    db.pictograms.update(p.id, {
      usageCount: p.usageCount + 1,
      lastUsedAt: Date.now(),
    })
  }

  const color = CATEGORY_COLORS[activeCategoryId] ?? '#4A90D9'
  const gridTone = GRID_TONE_CLASS[activeCategoryId] ?? 'bg-slate-50'
  const title = isRoot ? '首页' : activeCategoryId === 'recent' ? '最近' : activeCategory?.name ?? '未找到'
  const showHierarchyControls = !isRoot
  const canGoBack = categoryPath.length > 0
  const useCompactFolderTiles = activeCategoryId === 'quickchat'

  return (
    <div className={`flex flex-1 flex-col min-h-0 ${gridTone}`}>
      <div className="z-20 flex min-h-[56px] items-center gap-2 bg-slate-900 px-2 text-white">
        <div className="min-w-[48px]" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-center text-lg font-bold leading-tight text-balance">
          {title}
        </h2>
        <button
          onClick={() => setShowCategoryLinks(true)}
          className="apple-press flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
          aria-label="分类链接管理"
          title="分类链接管理"
        >
          <LineIcon name="link" className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {showHierarchyControls && (
          <HierarchyNavRail
            canGoBack={canGoBack}
            onGoRoot={goRootCategory}
            onGoBack={goBackCategory}
          />
        )}

        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
          {/* 图片网格 */}
          <div className="p-3 sm:p-4 lg:p-5">
            <div className={`grid ${GRID_CLASS[gridCols]} gap-3 lg:gap-4`}>
              {gridItems?.map((item) => {
                if (item.type === 'pictogram') {
                  return (
                    <PictogramTile
                      key={item.key}
                      pictogram={item.pictogram}
                      color={isRoot ? '#d97706' : color}
                      cardTone="bg-yellow-100 border-yellow-200 text-yellow-950"
                      gridCols={gridCols}
                      imageClassName={isRoot ? ROOT_MEDIA_SLOT_CLASS : undefined}
                      minHeightClassName={isRoot ? ROOT_TILE_HEIGHT_CLASS : undefined}
                      labelClassName={isRoot ? ROOT_TILE_LABEL_CLASS : undefined}
                      onSelect={() => handleSelect(item.pictogram)}
                    />
                  )
                }

                if (item.type === 'category') {
                  return (
                    <FolderTile
                      key={item.key}
                      category={item.category}
                      minHeightClassName={useCompactFolderTiles || isRoot ? ROOT_TILE_HEIGHT_CLASS : undefined}
                      isCompactTile={useCompactFolderTiles || isRoot}
                      labelClassName={isRoot ? ROOT_TILE_LABEL_CLASS : undefined}
                      onOpen={() => openCategory(item.category.id)}
                    />
                  )
                }

                return (
                  <ActionTile
                    key={item.key}
                    icon={<LineIcon name="star" className="size-12 sm:size-14" />}
                    label={item.label}
                    minHeightClassName={isRoot ? ROOT_TILE_HEIGHT_CLASS : undefined}
                    labelClassName={isRoot ? ROOT_TILE_LABEL_CLASS : undefined}
                    onClick={() => setShowSavedPhrases(true)}
                  />
                )
              })}

            </div>

            {/* 空状态 */}
            {gridItems?.length === 0 && activeCategoryId === 'recent' && (
              <div className="text-center text-slate-400 mt-12 space-y-2">
                <LineIcon name="clock" className="mx-auto h-10 w-10" />
                <p className="text-lg">暂无</p>
              </div>
            )}
            {gridItems?.length === 0 && activeCategoryId !== 'recent' && (
              <div className="text-center text-slate-400 text-lg mt-12">
                暂无
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function HierarchyNavRail({
  canGoBack,
  onGoRoot,
  onGoBack,
}: {
  canGoBack: boolean
  onGoRoot: () => void
  onGoBack: () => void
}) {
  return (
    <aside className="flex w-20 shrink-0 flex-col border-r border-white/70 bg-rose-400 text-white sm:w-24">
      <button
        onClick={onGoRoot}
        className="apple-press flex min-h-[168px] flex-1 flex-col items-center justify-center gap-3 border-b-2 border-white/80 px-2 transition-colors hover:bg-rose-300 focus-visible:outline-white sm:min-h-[196px]"
        aria-label="回到首页"
        title="回到首页"
      >
        <LineIcon name="home" className="h-12 w-12 stroke-[2.4] sm:h-16 sm:w-16" />
        <span className="text-center text-base font-bold leading-tight sm:text-lg">
          首页
        </span>
      </button>
      <button
        onClick={canGoBack ? onGoBack : onGoRoot}
        className="apple-press flex min-h-[168px] flex-1 flex-col items-center justify-center gap-3 px-2 transition-colors hover:bg-rose-300 focus-visible:outline-white sm:min-h-[196px]"
        aria-label="返回上一级"
        title="返回上一级"
      >
        <LineIcon name="arrowLeft" className="h-14 w-14 stroke-[2.8] sm:h-20 sm:w-20" />
        <span className="text-center text-base font-bold leading-tight sm:text-lg">
          返回
        </span>
      </button>
    </aside>
  )
}

function PictogramTile({
  pictogram,
  color,
  cardTone,
  gridCols,
  imageClassName,
  minHeightClassName = 'min-h-[112px]',
  labelClassName = 'text-base',
  onSelect,
}: {
  pictogram: PictogramEntry
  color: string
  cardTone: string
  gridCols: GridCols
  imageClassName?: string
  minHeightClassName?: string
  labelClassName?: string
  onSelect: () => void
}) {
  const label = pictogram.labels.zh[0]

  return (
    <button
      onClick={onSelect}
      className={`apple-press radius-card relative flex flex-col items-center gap-1.5 border-2 p-3 transition-colors hover:border-slate-300 ${minHeightClassName} ${cardTone}`}
      aria-label={label}
    >
      <img
        src={resolveImageSrc(pictogram.imageUrl, label, color)}
        alt={label}
        className={`${imageClassName ?? IMG_CLASS[gridCols]} object-contain`}
        loading="lazy"
        onError={(e) => {
          const img = e.currentTarget
          if (!img.src.startsWith('data:')) {
            img.src = generatePlaceholderSvg(label, color)
          }
        }}
      />
      <span className="flex h-10 max-w-full items-center justify-center sm:h-11">
        <span className={`line-clamp-2 max-w-full break-words text-center font-semibold leading-tight text-slate-800 ${labelClassName}`}>
          {label}
        </span>
      </span>
    </button>
  )
}

function FolderTile({
  category,
  icon,
  minHeightClassName = 'min-h-[124px]',
  isCompactTile = false,
  labelClassName,
  onOpen,
}: {
  category: Category
  icon?: ReactNode
  minHeightClassName?: string
  isCompactTile?: boolean
  labelClassName?: string
  onOpen: () => void
}) {
  const layoutClassName = isCompactTile
    ? 'radius-card justify-center gap-1.5 border-2 p-3'
    : 'radius-card justify-end border px-3 pb-3 pt-6'
  const iconClassName = isCompactTile
    ? `flex ${ROOT_MEDIA_SLOT_CLASS} items-center justify-center text-[48px] leading-none sm:text-[54px]`
    : 'flex min-h-[72px] items-center justify-center text-5xl leading-none sm:text-6xl'
  const folderTabClassName = isCompactTile
    ? 'radius-folder-tab'
    : 'radius-folder-tab'

  return (
    <button
      onClick={onOpen}
      className={`apple-press group relative flex flex-col items-center border-sky-200 bg-sky-100 text-sky-950 transition-colors hover:bg-sky-50 ${layoutClassName} ${minHeightClassName}`}
      aria-label={`打开${category.name}`}
    >
      <span className={`absolute left-0 top-0 h-5 w-[48%] bg-sky-200 transition-colors group-hover:bg-sky-100 ${folderTabClassName}`} aria-hidden="true" />
      <span className={iconClassName}>
        {icon ?? (
          <CategoryIcon
            category={category}
            className="h-12 w-12 object-contain sm:h-14 sm:w-14"
            textClassName="text-[48px] leading-none sm:text-[54px]"
          />
        )}
      </span>
      <span className="mt-1 flex h-10 max-w-full items-center justify-center sm:h-11">
        <span className={`line-clamp-2 max-w-full break-words text-center text-base font-bold leading-tight text-slate-900 ${labelClassName ?? ''}`}>
          {category.name}
        </span>
      </span>
    </button>
  )
}

function ActionTile({
  icon,
  label,
  minHeightClassName = 'min-h-[150px] sm:min-h-[166px]',
  labelClassName,
  onClick,
}: {
  icon: ReactNode
  label: string
  minHeightClassName?: string
  labelClassName?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`apple-press radius-card flex flex-col items-center justify-center gap-1.5 border-2 border-emerald-200 bg-emerald-100 p-3 text-emerald-950 transition-colors hover:bg-emerald-50 ${minHeightClassName}`}
      aria-label={label}
    >
      <span className={`flex ${ROOT_MEDIA_SLOT_CLASS} items-center justify-center`}>
        {icon}
      </span>
      <span className="flex h-10 max-w-full items-center justify-center sm:h-11">
        <span className={`line-clamp-2 max-w-full break-words text-center text-base font-bold leading-tight text-slate-900 ${labelClassName ?? ''}`}>
          {label}
        </span>
      </span>
    </button>
  )
}
