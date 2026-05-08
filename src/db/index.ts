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
    // v6: 添加 *categoryIds 多值索引，支持同一卡片出现在多个板块
    this.version(6).stores({
      categories: 'id, sortOrder',
      pictograms: 'id, categoryId, *categoryIds, *synonyms, usageCount, lastUsedAt, manualOrder',
      expressions: 'id, sessionId, createdAt, isFavorite, updatedAt',
      savedPhrases: 'id, usageCount, lastUsedAt, updatedAt',
      textToImageResults: 'id, createdAt',
      syncOutbox: 'id, createdAt, entityType, recordId',
      syncState: 'id',
    }).upgrade(async (tx) => {
      const all = await tx.table<PictogramEntry>('pictograms').toArray()
      for (const p of all) {
        if (!Array.isArray(p.categoryIds) || p.categoryIds.length === 0) {
          await tx.table('pictograms').update(p.id, { categoryIds: [p.categoryId] })
        }
      }
    })
  }
}

export const db = new TuYuJiaDB()

/**
 * Seed 版本管理：基于内容哈希，不需要手动 bump 版本号。
 *
 * 启动时先拉取 /seed/manifest.json（轻量），比对其中的 seedHash
 * 与 localStorage 里存储的上次哈希。不一致时重新导入全量 seed。
 *
 * manifest.json 由 `scripts/update-seed-manifest.mjs` 生成，
 * 在 prebuild / predev 时自动执行，任何 seed 文件改动都会产生新哈希。
 */
const SEED_HASH_KEY = 'tuyujia_seed_hash'

/** 检查并导入种子数据（首次加载或 seed 内容变化时执行） */
export async function ensureSeedData(): Promise<void> {
  const manifestRes = await fetch('/seed/manifest.json')
  if (!manifestRes.ok) throw new Error('无法加载 seed manifest')
  const manifest = await manifestRes.json() as { seedHash: string }

  const storedHash = localStorage.getItem(SEED_HASH_KEY)
  if (storedHash === manifest.seedHash) return   // seed 没变，跳过

  // seed 内容有变化 → 清空并重新导入（保留用户数据）
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
        const categoryIds = Array.isArray(p.categoryIds) && p.categoryIds.length > 0
          ? p.categoryIds
          : [p.categoryId]

        return {
          ...p,
          categoryIds,
          manualOrder: preservedOrder ?? currentIndex,
        }
      })

      await db.categories.clear()
      await db.pictograms.clear()
      await db.categories.bulkAdd(merged)
      await db.pictograms.bulkAdd(mergedPictograms)
    })
  } catch (err) {
    // 事务失败时清除哈希，确保下次刷新能重试
    localStorage.removeItem(SEED_HASH_KEY)
    throw err
  }

  localStorage.setItem(SEED_HASH_KEY, manifest.seedHash)
}

/**
 * 强制清空并重新导入 seed（供设置页"重置默认词库"按钮使用）。
 * 清除本地哈希后直接调用 ensureSeedData()。
 */
export async function forceReseed(): Promise<void> {
  localStorage.removeItem(SEED_HASH_KEY)
  await ensureSeedData()
}
