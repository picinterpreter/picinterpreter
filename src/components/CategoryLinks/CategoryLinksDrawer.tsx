/**
 * CategoryLinksDrawer — 管理分类双向链接
 *
 * 功能：
 *   - 选择当前要编辑的分类
 *   - 为该分类添加 / 移除链接分类
 *   - 链接分类的图片会自动出现在被链接分类的图片网格里
 */

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import { wouldCreateCycle } from '@/utils/category-links'
import type { Category } from '@/types'

export function CategoryLinksDrawer() {
  const showCategoryLinks = useAppStore((s) => s.showCategoryLinks)
  const setShowCategoryLinks = useAppStore((s) => s.setShowCategoryLinks)
  const activeCategoryId = useAppStore((s) => s.activeCategoryId)

  // 默认编辑当前激活的分类（排除虚拟分类 recent）
  const [editingId, setEditingId] = useState<string>(() =>
    activeCategoryId === 'recent' ? '' : activeCategoryId,
  )
  const [saving, setSaving] = useState(false)
  const [cycleWarning, setCycleWarning] = useState<string | null>(null)

  const categories = useLiveQuery(() =>
    db.categories.orderBy('sortOrder').toArray(),
  )

  const editingCategory = categories?.find((c) => c.id === editingId)
  const linkedIds: string[] = editingCategory?.linkedCategoryIds ?? []

  // Escape 关闭
  useEffect(() => {
    if (!showCategoryLinks) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCategoryLinks(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showCategoryLinks, setShowCategoryLinks])

  if (!showCategoryLinks) return null

  /** 添加链接 */
  async function handleAddLink(targetId: string) {
    if (!editingId || linkedIds.includes(targetId) || targetId === editingId) return

    // 写入前做环检测：若 target 已（直接/间接）回指向 editingId，拒绝
    const all = categories ?? []
    if (wouldCreateCycle(editingId, targetId, all)) {
      const target = all.find((c) => c.id === targetId)
      const source = all.find((c) => c.id === editingId)
      setCycleWarning(
        `⚠️ 无法链接：${target?.name ?? targetId} 已经（直接或间接）链接到 ${source?.name ?? editingId}，会形成循环。`,
      )
      // 3 秒后清除警告
      setTimeout(() => setCycleWarning(null), 3000)
      return
    }

    setSaving(true)
    const newLinked = [...linkedIds, targetId]
    await db.categories.update(editingId, { linkedCategoryIds: newLinked })
    setSaving(false)
  }

  /** 移除链接 */
  async function handleRemoveLink(targetId: string) {
    if (!editingId) return
    setSaving(true)
    const newLinked = linkedIds.filter((id) => id !== targetId)
    await db.categories.update(editingId, { linkedCategoryIds: newLinked })
    setSaving(false)
  }

  /** 可添加的分类（排除自身和已链接的） */
  const availableToLink = (categories ?? []).filter(
    (c) => c.id !== editingId && !linkedIds.includes(c.id),
  )

  /** 已链接分类的完整信息 */
  const linkedCategories = (categories ?? []).filter((c) => linkedIds.includes(c.id))

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40"
        onClick={() => setShowCategoryLinks(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="管理分类链接"
        className="w-96 max-w-[90vw] bg-white shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-bold text-gray-800">🔗 管理分类链接</h2>
          <button
            onClick={() => setShowCategoryLinks(false)}
            className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 说明 */}
          <div className="px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700 space-y-1">
            <p className="font-medium">💡 什么是分类链接？</p>
            <p className="text-xs text-blue-600">
              为分类 A 链接分类 B，浏览 A 时自动显示 B 的所有图片。
              更新 B 后，A 里的内容也会实时更新，无需重复维护。
            </p>
          </div>

          {/* 选择要编辑的分类 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">选择要编辑的分类</h3>
            <div className="grid grid-cols-3 gap-2">
              {(categories ?? []).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setEditingId(cat.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-center transition-all min-h-[56px]
                    ${editingId === cat.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                >
                  <span className="text-lg leading-none">{cat.icon}</span>
                  <span className="text-xs font-medium leading-tight truncate max-w-full px-1">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {editingCategory && (
            <>
              {/* 当前已链接的分类 */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  「{editingCategory.name}」已链接的分类
                  {linkedCategories.length > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      ({linkedCategories.length} 个)
                    </span>
                  )}
                </h3>

                {linkedCategories.length === 0 ? (
                  <p className="text-sm text-gray-400 px-1">
                    还没有链接任何分类。从下方选择要链接的分类。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedCategories.map((cat) => (
                      <LinkedCategoryRow
                        key={cat.id}
                        category={cat}
                        onRemove={() => handleRemoveLink(cat.id)}
                        disabled={saving}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* 环检测警告 */}
              {cycleWarning && (
                <div
                  role="alert"
                  className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-sm text-amber-700"
                >
                  {cycleWarning}
                </div>
              )}

              {/* 可以添加的分类 */}
              {availableToLink.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    点击添加链接
                  </h3>
                  <div className="space-y-2">
                    {availableToLink.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleAddLink(cat.id)}
                        disabled={saving}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-700 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="text-xl shrink-0">{cat.icon}</span>
                        <span className="flex-1 text-sm font-medium">{cat.name}</span>
                        <span className="text-lg text-gray-400">＋</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {!editingCategory && (
            <p className="text-center text-gray-400 text-sm mt-4">
              请从上方选择一个分类进行编辑
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={() => setShowCategoryLinks(false)}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-lg font-medium hover:bg-blue-700 transition-colors min-h-[48px]"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}

/** 单行已链接分类 */
function LinkedCategoryRow({
  category,
  onRemove,
  disabled,
}: {
  category: Category
  onRemove: () => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-blue-200 bg-blue-50">
      <span className="text-xl shrink-0">{category.icon}</span>
      <span className="flex-1 text-sm font-medium text-blue-800">{category.name}</span>
      <button
        onClick={onRemove}
        disabled={disabled}
        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 hover:text-red-500 transition-colors disabled:opacity-50 min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label={`移除链接：${category.name}`}
      >
        ✕
      </button>
    </div>
  )
}
