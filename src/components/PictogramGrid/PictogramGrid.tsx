import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, type ReactNode } from 'react'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type GridCols } from '@/stores/settings-store'
import { generatePlaceholderSvg, resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { LineIcon } from '@/components/ui/LineIcon'
import type { Category, PictogramEntry } from '@/types'

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

const GRID_TONE_CLASS: Record<string, string> = {
  root:      'bg-slate-50',
  recent:    'bg-amber-50',
  quickchat: 'bg-sky-50',
  actions:   'bg-emerald-50',
  emotions:  'bg-orange-50',
  food:      'bg-rose-50',
  people:    'bg-violet-50',
  places:    'bg-cyan-50',
  medical:   'bg-teal-50',
  time:      'bg-yellow-50',
  animals:   'bg-lime-50',
  colors:    'bg-pink-50',
  daily:     'bg-blue-50',
  objects:   'bg-fuchsia-50',
}

function asRootAnswer(pictogram: PictogramEntry, label: string): PictogramEntry {
  return {
    ...pictogram,
    labels: {
      ...pictogram.labels,
      zh: [label, ...pictogram.labels.zh.filter((item) => item !== label)],
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
  const hiddenCategoryIds = useSettingsStore((s) => s.hiddenCategoryIds)

  const allCategories = useLiveQuery(() =>
    db.categories.orderBy('sortOrder').toArray(),
  )
  const categories = allCategories?.filter((c) => !hiddenCategoryIds.includes(c.id)) ?? []
  const activeCategory = categories.find((c) => c.id === activeCategoryId)
  const isRoot = activeCategoryId === 'root'

  const childCategories = isRoot
    ? categories
    : (activeCategory?.linkedCategoryIds ?? [])
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is Category => Boolean(c))

  const pictograms = useLiveQuery(async (): Promise<PictogramEntry[]> => {
    if (activeCategoryId === 'root') {
      const [yesById, noById] = await db.pictograms.bulkGet(['p_yes', 'p_no'])
      const quickItems = !yesById || !noById
        ? await db.pictograms.where('categoryId').equals('quickchat').toArray()
        : []
      const yes = yesById ?? quickItems.find((p) =>
        p.labels.zh.includes('是') || p.synonyms.includes('是') || p.labels.en.includes('yes'),
      )
      const no = noById ?? quickItems.find((p) =>
        p.labels.zh.includes('不是') || p.synonyms.includes('不是') || p.labels.en.includes('no'),
      )

      return [
        yes ? asRootAnswer(yes, '是') : null,
        no ? asRootAnswer(no, '不是') : null,
      ].filter((p): p is PictogramEntry => p !== null)
    }

    // 最近使用：按上次使用时间倒序
    if (activeCategoryId === 'recent') {
      const used = await db.pictograms.filter((p) => (p.lastUsedAt ?? 0) > 0).toArray()
      return used
        .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
        .slice(0, 24)
    }

    const ownItems = await db.pictograms.where('categoryId').equals(activeCategoryId).toArray()
    return ownItems.sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0))
  }, [activeCategoryId])

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
      <div className="z-20 flex min-h-[56px] items-center gap-2 bg-slate-900 px-2 text-white shadow-sm">
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
              {isRoot && pictograms?.map((p) => (
                <PictogramTile
                  key={p.id}
                  pictogram={p}
                  color="#d97706"
                  cardTone="bg-yellow-100 border-yellow-200 text-yellow-950"
                  gridCols={gridCols}
                  imageClassName={ROOT_MEDIA_SLOT_CLASS}
                  minHeightClassName={ROOT_TILE_HEIGHT_CLASS}
                  labelClassName="text-xl sm:text-2xl"
                  onSelect={() => handleSelect(p)}
                />
              ))}

              {isRoot && (
                <ActionTile
                  icon={<LineIcon name="star" className="size-12 sm:size-14" />}
                  label="常用"
                  minHeightClassName={ROOT_TILE_HEIGHT_CLASS}
                  onClick={() => setShowSavedPhrases(true)}
                />
              )}

              {!isRoot && (
                <>
                  {childCategories.map((cat) => (
                    <FolderTile
                      key={cat.id}
                      category={cat}
                      minHeightClassName={useCompactFolderTiles ? ROOT_TILE_HEIGHT_CLASS : undefined}
                      isCompactTile={useCompactFolderTiles}
                      onOpen={() => openCategory(cat.id)}
                    />
                  ))}

                  {pictograms?.map((p) => (
                    <PictogramTile
                      key={p.id}
                      pictogram={p}
                      color={color}
                      cardTone="bg-yellow-100 border-yellow-200 text-yellow-950"
                      gridCols={gridCols}
                      onSelect={() => handleSelect(p)}
                    />
                  ))}
                </>
              )}

              {isRoot && childCategories.map((cat) => (
                <FolderTile
                  key={cat.id}
                  category={cat}
                  minHeightClassName={ROOT_TILE_HEIGHT_CLASS}
                  isCompactTile
                  onOpen={() => openCategory(cat.id)}
                />
              ))}

            </div>

            {/* 空状态 */}
            {pictograms?.length === 0 && childCategories.length === 0 && activeCategoryId === 'recent' && (
              <div className="text-center text-slate-400 mt-12 space-y-2">
                <LineIcon name="clock" className="mx-auto h-10 w-10" />
                <p className="text-lg">暂无</p>
              </div>
            )}
            {pictograms?.length === 0 && childCategories.length === 0 && activeCategoryId !== 'recent' && (
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
      className={`apple-press relative flex flex-col items-center gap-1.5 rounded-[22px] border-2 p-3 shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_22px_rgba(15,23,42,0.10)] transition-all hover:shadow-[0_3px_8px_rgba(15,23,42,0.10),0_16px_30px_rgba(15,23,42,0.12)] ${minHeightClassName} ${cardTone}`}
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
      <span className={`text-center font-semibold leading-tight text-slate-800 ${labelClassName}`}>
        {label}
      </span>
    </button>
  )
}

function FolderTile({
  category,
  icon,
  minHeightClassName = 'min-h-[124px]',
  isCompactTile = false,
  onOpen,
}: {
  category: Category
  icon?: ReactNode
  minHeightClassName?: string
  isCompactTile?: boolean
  onOpen: () => void
}) {
  const layoutClassName = isCompactTile
    ? 'justify-center gap-1.5 rounded-[22px] border-2 p-3'
    : 'justify-end rounded-[18px] border px-3 pb-3 pt-6'
  const iconClassName = isCompactTile
    ? `flex ${ROOT_MEDIA_SLOT_CLASS} items-center justify-center text-[48px] leading-none sm:text-[54px]`
    : 'flex min-h-[72px] items-center justify-center text-5xl leading-none sm:text-6xl'
  const folderTabClassName = isCompactTile
    ? 'rounded-br-[14px] rounded-tl-[22px] rounded-tr-[14px]'
    : 'rounded-br-[14px] rounded-tl-[18px] rounded-tr-[14px]'

  return (
    <button
      onClick={onOpen}
      className={`apple-press group relative flex flex-col items-center border-sky-200 bg-sky-100 text-sky-950 shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_22px_rgba(15,23,42,0.10)] transition-all hover:bg-sky-50 hover:shadow-[0_3px_8px_rgba(15,23,42,0.10),0_16px_30px_rgba(15,23,42,0.12)] ${layoutClassName} ${minHeightClassName}`}
      aria-label={`打开${category.name}`}
    >
      <span className={`absolute left-0 top-0 h-5 w-[48%] bg-sky-200 transition-colors group-hover:bg-sky-100 ${folderTabClassName}`} aria-hidden="true" />
      <span className={iconClassName}>
        {icon ?? category.icon}
      </span>
      <span className="mt-1 max-w-full truncate text-center text-base font-bold leading-tight text-slate-900">
        {category.name}
      </span>
    </button>
  )
}

function ActionTile({
  icon,
  label,
  minHeightClassName = 'min-h-[150px] sm:min-h-[166px]',
  onClick,
}: {
  icon: ReactNode
  label: string
  minHeightClassName?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`apple-press flex flex-col items-center justify-center gap-1.5 rounded-[22px] border-2 border-emerald-200 bg-emerald-100 p-3 text-emerald-950 shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_22px_rgba(15,23,42,0.10)] transition-all hover:bg-emerald-50 hover:shadow-[0_3px_8px_rgba(15,23,42,0.10),0_16px_30px_rgba(15,23,42,0.12)] ${minHeightClassName}`}
      aria-label={label}
    >
      <span className={`flex ${ROOT_MEDIA_SLOT_CLASS} items-center justify-center`}>
        {icon}
      </span>
      <span className="text-center text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
        {label}
      </span>
    </button>
  )
}
