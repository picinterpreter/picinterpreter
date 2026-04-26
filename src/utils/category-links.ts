/**
 * 分类链接工具函数
 *
 * 职责：
 *   - wouldCreateCycle()：在写入链接前检查是否会形成环
 *
 * 设计：链接视作有向图 sourceId → targetId（source 浏览时会看到 target 文件夹）。
 * 要防止 targetId → … → sourceId 的反向路径，否则会让"浏览 A 看到 B 文件夹，
 * 浏览 B 看到 A 文件夹"变成用户无法理解的递归状态。
 */

import type { Category } from '@/types'

/**
 * 检查从 sourceId 添加一条指向 targetId 的链接是否会形成环。
 *
 * 规则：
 *   - 自环（sourceId === targetId）直接拒绝
 *   - 若 targetId 已经（直接或间接）链接到 sourceId，则形成环
 */
export function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  allCategories: Category[],
): boolean {
  if (sourceId === targetId) return true

  const byId = new Map(allCategories.map((c) => [c.id, c]))
  const visited = new Set<string>()
  const stack: string[] = [targetId]

  while (stack.length > 0) {
    const id = stack.pop()!
    if (id === sourceId) return true
    if (visited.has(id)) continue
    visited.add(id)

    const cat = byId.get(id)
    if (!cat?.linkedCategoryIds) continue
    for (const next of cat.linkedCategoryIds) {
      if (!visited.has(next)) stack.push(next)
    }
  }
  return false
}
