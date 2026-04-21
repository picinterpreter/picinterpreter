import { describe, it, expect } from 'vitest'
import { wouldCreateCycle } from '../category-links'
import type { Category } from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────── //

function cat(id: string, linkedCategoryIds?: string[]): Category {
  return { id, name: id, icon: '', sortOrder: 0, linkedCategoryIds }
}

// ─── wouldCreateCycle ───────────────────────────────────────────────────── //

describe('wouldCreateCycle', () => {

  // 自环
  it('returns true when sourceId === targetId (self-loop)', () => {
    const cats = [cat('A')]
    expect(wouldCreateCycle('A', 'A', cats)).toBe(true)
  })

  // 直接反向：A→B 已存在，尝试 B→A
  it('returns true for direct reverse link', () => {
    const cats = [cat('A', ['B']), cat('B')]
    expect(wouldCreateCycle('B', 'A', cats)).toBe(true)
  })

  // 多跳环路：A→B→C 已存在，尝试 C→A
  it('returns true for multi-hop cycle (A→B→C, C→A would cycle)', () => {
    const cats = [cat('A', ['B']), cat('B', ['C']), cat('C')]
    expect(wouldCreateCycle('C', 'A', cats)).toBe(true)
  })

  // 三跳环路：A→B→C→D，尝试 D→A
  it('returns true for 3-hop cycle', () => {
    const cats = [cat('A', ['B']), cat('B', ['C']), cat('C', ['D']), cat('D')]
    expect(wouldCreateCycle('D', 'A', cats)).toBe(true)
  })

  // 安全链接：独立分支，D→A，不存在从 A 可达 D 的路径
  it('returns false for a safe new link (no path from target back to source)', () => {
    const cats = [cat('A', ['B']), cat('B', ['C']), cat('C'), cat('D')]
    expect(wouldCreateCycle('D', 'A', cats)).toBe(false)
  })

  // 完全没有链接
  it('returns false when no links exist', () => {
    const cats = [cat('X'), cat('Y'), cat('Z')]
    expect(wouldCreateCycle('X', 'Y', cats)).toBe(false)
  })

  // target 不存在于分类列表中
  it('returns false when target category is not in the list', () => {
    const cats = [cat('A', ['B']), cat('B')]
    expect(wouldCreateCycle('C', 'A', cats)).toBe(false)
  })

  // 空分类列表
  it('returns false for empty category list', () => {
    expect(wouldCreateCycle('A', 'B', [])).toBe(false)
  })

  // 钻石依赖（分叉后汇合）不应该被误报为循环
  it('returns false for diamond graph (A→B, A→C, B→D, C→D — no cycle)', () => {
    const cats = [
      cat('A', ['B', 'C']),
      cat('B', ['D']),
      cat('C', ['D']),
      cat('D'),
    ]
    expect(wouldCreateCycle('E', 'A', cats)).toBe(false)
  })

  // 源节点可以出现在多条路径上，但没有回路
  it('detects cycle in a graph where source appears multiple times in DFS', () => {
    // A→B, A→C, B→D, C→D，尝试 D→A → 会形成环
    const cats = [
      cat('A', ['B', 'C']),
      cat('B', ['D']),
      cat('C', ['D']),
      cat('D'),
    ]
    expect(wouldCreateCycle('D', 'A', cats)).toBe(true)
  })

  // 不可变：调用不应修改传入的 allCategories
  it('does not mutate the allCategories array', () => {
    const cats = [cat('A', ['B']), cat('B'), cat('C')]
    const snapshot = JSON.stringify(cats)
    wouldCreateCycle('C', 'A', cats)
    expect(JSON.stringify(cats)).toBe(snapshot)
  })
})
