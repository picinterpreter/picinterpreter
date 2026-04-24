import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type GridCols } from '@/stores/settings-store'
import { generatePlaceholderSvg, resolveImageSrc } from '@/utils/generate-placeholder-svg'
import type { PictogramEntry } from '@/types'

// Tailwind 类必须是完整字符串，不可动态拼接
const GRID_CLASS: Record<GridCols, string> = {
  2: 'grid-cols-2 lg:grid-cols-3',
  3: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  4: 'grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
}

const IMG_CLASS: Record<GridCols, string> = {
  2: 'size-28',
  3: 'size-24',
  4: 'size-20',
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
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())

  const pictograms = useLiveQuery(async (): Promise<PictogramWithSource[]> => {
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
  }, [activeCategoryId])

  function handleSelect(p: PictogramEntry) {
    addPictogram(p)
    db.pictograms.update(p.id, {
      usageCount: p.usageCount + 1,
      lastUsedAt: Date.now(),
    })
  }

  const color = CATEGORY_COLORS[activeCategoryId] ?? '#4A90D9'
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
      <div className="bg-stone-50 p-3 sm:p-4">
        <div className={`grid ${GRID_CLASS[gridCols]} gap-3 sm:gap-4`}>
          {pictograms?.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="relative flex min-h-[180px] flex-col items-center justify-between rounded-[28px] border border-amber-200 bg-amber-100 px-3 py-4 text-center shadow-sm"
              aria-label={p.labels.zh[0]}
            >
              {p.sourceName !== null && (
                <span
                  aria-label={`来自：${p.sourceName}`}
                  className="absolute right-3 top-3 max-w-24 truncate rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[10px] leading-none text-slate-600"
                >
                  来自 {p.sourceName}
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
              <span className="line-clamp-2 text-center text-base font-semibold leading-tight text-slate-900 sm:text-lg">
                {p.labels.zh[0]}
              </span>
            </button>
          ))}
        </div>

        {pictograms?.length === 0 && activeCategoryId === 'recent' && (
          <div className="mt-12 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-500">
            <p className="text-lg font-medium text-slate-700">还没有最近使用记录</p>
            <p className="mt-2 text-sm text-pretty">从任意分类里点一张图片，它就会出现在这里。</p>
          </div>
        )}
        {pictograms?.length === 0 && activeCategoryId !== 'recent' && (
          <div className="mt-12 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-500">
            <p className="text-lg font-medium text-slate-700">这个分类还没有图卡</p>
            <p className="mt-2 text-sm text-pretty">可以先切换到别的分类继续表达。</p>
          </div>
        )}
      </div>
    </div>
  )
}
