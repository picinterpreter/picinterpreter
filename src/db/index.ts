import Dexie, { type EntityTable } from 'dexie'
import type {
  Category,
  PictogramEntry,
  Expression,
  SavedPhrase,
  TextToImageResult,
  SyncOutboxItem,
  SyncState,
} from '@/types'

class TuYuJiaDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  pictograms!: EntityTable<PictogramEntry, 'id'>
  expressions!: EntityTable<Expression, 'id'>
  savedPhrases!: EntityTable<SavedPhrase, 'id'>
  textToImageResults!: EntityTable<TextToImageResult, 'id'>
  syncOutbox!: EntityTable<SyncOutboxItem, 'id'>
  syncState!: EntityTable<SyncState, 'id'>

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
    this.version(4).stores({
      categories: 'id, sortOrder',
      pictograms: 'id, categoryId, *synonyms, usageCount, lastUsedAt',
      expressions: 'id, sessionId, createdAt, isFavorite, updatedAt',
      savedPhrases: 'id, usageCount, lastUsedAt, updatedAt',
      textToImageResults: 'id, createdAt',
      syncOutbox: 'id, createdAt, entityType, recordId',
      syncState: 'id',
    })
    this.version(5).stores({
      categories: 'id, sortOrder',
      pictograms: 'id, categoryId, *synonyms, usageCount, lastUsedAt, manualOrder',
      expressions: 'id, sessionId, createdAt, isFavorite, updatedAt',
      savedPhrases: 'id, usageCount, lastUsedAt, updatedAt',
      textToImageResults: 'id, createdAt',
      syncOutbox: 'id, createdAt, entityType, recordId',
      syncState: 'id',
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
const SEED_VERSION = 9
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

  try {
    await db.transaction('rw', db.categories, db.pictograms, async () => {
      // 保留用户已有的 linkedCategoryIds，并与 seed 默认链接合并。
      const existing = await db.categories.toArray()
      const userLinksById = new Map<string, string[]>()
      for (const c of existing) {
        if (c.linkedCategoryIds && c.linkedCategoryIds.length > 0) {
          userLinksById.set(c.id, c.linkedCategoryIds)
        }
      }

      const existingPictograms = await db.pictograms.toArray()
      const manualOrderById = new Map<string, number>()
      for (const p of existingPictograms) {
        if (typeof p.manualOrder === 'number') {
          manualOrderById.set(p.id, p.manualOrder)
        }
      }

      const newIdSet = new Set(categories.map((c) => c.id))
      const merged: Category[] = categories.map((c) => {
        const seedLinks = c.linkedCategoryIds ?? []
        const userLinks = userLinksById.get(c.id) ?? []
        const stillValid = [...new Set([...seedLinks, ...userLinks])].filter((id) => newIdSet.has(id))
        return stillValid.length > 0
          ? { ...c, linkedCategoryIds: stillValid }
          : c
      })

      const seedOrderByCategory = new Map<string, number>()
      const mergedPictograms: PictogramEntry[] = pictograms.map((p) => {
        const currentIndex = seedOrderByCategory.get(p.categoryId) ?? 0
        seedOrderByCategory.set(p.categoryId, currentIndex + 1)
        const preservedOrder = manualOrderById.get(p.id)

        return {
          ...p,
          manualOrder: preservedOrder ?? currentIndex,
        }
      })

      await db.categories.clear()
      await db.pictograms.clear()
      await db.categories.bulkAdd(merged)
      await db.pictograms.bulkAdd(mergedPictograms)
    })
  } catch (err) {
    // 事务失败时清除版本号，确保下次刷新能重试
    localStorage.removeItem(SEED_VERSION_KEY)
    throw err
  }

  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION))
}
