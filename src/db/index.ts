import Dexie, { type EntityTable } from 'dexie'
import type {
  Category,
  PictogramEntry,
  Expression,
  SavedPhrase,
  TextToImageResult,
} from '@/types'

class TuYuJiaDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  pictograms!: EntityTable<PictogramEntry, 'id'>
  expressions!: EntityTable<Expression, 'id'>
  savedPhrases!: EntityTable<SavedPhrase, 'id'>
  textToImageResults!: EntityTable<TextToImageResult, 'id'>

  constructor() {
    super('TuYuJiaDB')
    this.version(1).stores({
      categories: 'id, sortOrder',
      pictograms: 'id, categoryId, *synonyms, usageCount',
      expressions: 'id, createdAt, isFavorite',
      savedPhrases: 'id, usageCount, lastUsedAt',
      textToImageResults: 'id, createdAt',
    })
    // v2: 为 expressions 添加 sessionId 索引，支持按会话查询上下文
    this.version(2).stores({
      categories: 'id, sortOrder',
      pictograms: 'id, categoryId, *synonyms, usageCount',
      expressions: 'id, sessionId, createdAt, isFavorite',
      savedPhrases: 'id, usageCount, lastUsedAt',
      textToImageResults: 'id, createdAt',
    })
    // v3: 为 pictograms 添加 lastUsedAt 索引，支持 SuggestionStrip 的高效"最近使用"查询
    this.version(3).stores({
      categories: 'id, sortOrder',
      pictograms: 'id, categoryId, *synonyms, usageCount, lastUsedAt',
      expressions: 'id, sessionId, createdAt, isFavorite',
      savedPhrases: 'id, usageCount, lastUsedAt',
      textToImageResults: 'id, createdAt',
    })
  }
}

export const db = new TuYuJiaDB()

/**
 * 种子数据版本号。
 * 每次更新 categories.json / pictograms.json 时递增，
 * 触发自动清空并重新导入种子数据。
 * 注意：用户自己的 expressions / savedPhrases 不受影响。
 */
const SEED_VERSION = 3
const SEED_VERSION_KEY = 'tuyujia_seed_version'

/** 检查并导入种子数据（首次加载或版本升级时执行） */
export async function ensureSeedData(): Promise<void> {
  const stored = parseInt(localStorage.getItem(SEED_VERSION_KEY) ?? '0', 10)
  const needsReseed = stored < SEED_VERSION

  if (!needsReseed) {
    // 版本一致，无需重新导入
    return
  }

  // 版本落后 → 清空种子表并重新导入（保留用户数据）
  const [categoriesRes, pictogramsRes] = await Promise.all([
    fetch('/seed/categories.json'),
    fetch('/seed/pictograms.json'),
  ])

  if (!categoriesRes.ok || !pictogramsRes.ok) {
    throw new Error('无法加载种子数据文件')
  }

  const categories: Category[] = await categoriesRes.json()
  const pictograms: PictogramEntry[] = await pictogramsRes.json()

  await db.transaction('rw', db.categories, db.pictograms, async () => {
    // 先读出用户已有的 linkedCategoryIds（用户手动维护的数据）
    // 种子文件不提供链接信息，所以仅需保留旧记录里的该字段
    const existing = await db.categories.toArray()
    const userLinksById = new Map<string, string[]>()
    for (const c of existing) {
      if (c.linkedCategoryIds && c.linkedCategoryIds.length > 0) {
        userLinksById.set(c.id, c.linkedCategoryIds)
      }
    }

    // 合并：种子分类 + 保留对应 id 的用户链接
    // 清理逻辑：若某个 linkedId 在新种子里不存在，过滤掉避免悬空引用
    const newIdSet = new Set(categories.map((c) => c.id))
    const merged: Category[] = categories.map((c) => {
      const userLinks = userLinksById.get(c.id)
      if (!userLinks) return c
      const stillValid = userLinks.filter((id) => newIdSet.has(id))
      return stillValid.length > 0
        ? { ...c, linkedCategoryIds: stillValid }
        : c
    })

    await db.categories.clear()
    await db.pictograms.clear()
    await db.categories.bulkAdd(merged)
    await db.pictograms.bulkAdd(pictograms)
  })

  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION))
}
