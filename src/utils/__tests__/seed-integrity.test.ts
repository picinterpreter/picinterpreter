/**
 * Seed 数据完整性测试。
 *
 * 每次修改 public/seed/pictograms.json 后自动运行，防止以下问题再次出现：
 *   1. 空 imageUrl（图片无法加载）
 *   2. 重复 imageUrl（不同概念显示同一张图）
 *   3. semanticDomain 被错误设置（影响消歧评分）
 *   4. 非 ASCII 字符出现在 id 字段（潜在系统兼容性问题）
 *   5. 必填字段缺失
 */

import { describe, it, expect } from 'vitest'
import seedJson from '../../../public/seed/pictograms.json'
import type { PictogramEntry } from '@/types'

const seed = seedJson as unknown as PictogramEntry[]

// p_toilet 的 categoryId="quickchat"（UI 板位）和 semanticDomain="hygiene"（语义域）
// 是有意区分的，不视为错误。同类情况在此白名单里豁免。
const INTENTIONAL_CATEGORY_DOMAIN_DIFF: Record<string, true> = {
  p_toilet: true,
}

// data: URI 是合法的 SVG 占位图，不算"空"
function isEmptyUrl(url: string): boolean {
  return url === '' || url === null || url === undefined
}

describe('seed 数据完整性', () => {

  it('每条 pictogram 都有 id', () => {
    const missing = seed.filter(e => !e.id)
    expect(missing, `缺少 id 的条目：${JSON.stringify(missing)}`).toHaveLength(0)
  })

  it('id 只包含 ASCII 字符（英文字母、数字、下划线）', () => {
    const badIds = seed
      .map(e => e.id)
      .filter(id => !/^[a-zA-Z0-9_]+$/.test(id))
    expect(
      badIds,
      `id 含非 ASCII 字符，可能引发系统兼容性问题：${badIds.join(', ')}`
    ).toHaveLength(0)
  })

  it('imageUrl 不为空', () => {
    const empty = seed.filter(e => isEmptyUrl(e.imageUrl))
    expect(
      empty.map(e => e.id),
      `以下条目 imageUrl 为空（图片无法加载）`
    ).toHaveLength(0)
  })

  it('semanticDomain 只能是已知合法值', () => {
    const VALID_DOMAINS = new Set([
      'activities', 'daily', 'descriptors', 'emotions', 'medical', 'actions', 'food', 'objects',
      'people', 'places', 'hygiene', 'time', 'quickchat', 'repair',
    ])
    const invalid = seed
      .filter(e => {
        const sd = e.disambiguationHints?.semanticDomain
        return sd && !VALID_DOMAINS.has(sd)
      })
      .map(e => `${e.id}: semanticDomain="${e.disambiguationHints.semanticDomain}"`)

    expect(
      invalid,
      `semanticDomain 值不在合法列表中：\n${invalid.join('\n')}`
    ).toHaveLength(0)
  })

  it('semanticDomain 与 categoryId 一致（白名单中的有意区分除外）', () => {
    const mismatches = seed
      .filter(e => {
        if (INTENTIONAL_CATEGORY_DOMAIN_DIFF[e.id]) return false
        const sd = e.disambiguationHints?.semanticDomain
        return sd && e.categoryId !== sd
      })
      .map(e =>
        `${e.id}: categoryId="${e.categoryId}" vs semanticDomain="${e.disambiguationHints.semanticDomain}"`
      )

    expect(
      mismatches,
      `categoryId 与 semanticDomain 不一致（若属有意区分，请加入白名单）：\n${mismatches.join('\n')}`
    ).toHaveLength(0)
  })

  it('labels.zh 至少有一个非空字符串', () => {
    const bad = seed.filter(
      e => !Array.isArray(e.labels?.zh) || e.labels.zh.length === 0 || !e.labels.zh[0]
    )
    expect(bad.map(e => e.id), '缺少中文标签').toHaveLength(0)
  })

  it('synonyms 是数组（matcher 依赖 .includes()，缺失会崩溃）', () => {
    const bad = seed.filter(e => !Array.isArray(e.synonyms))
    expect(bad.map(e => e.id), '以下条目缺少 synonyms 数组').toHaveLength(0)
  })

  it('usageCount 是数字', () => {
    const bad = seed.filter(e => typeof e.usageCount !== 'number')
    expect(bad.map(e => e.id), '以下条目缺少 usageCount').toHaveLength(0)
  })

  it('descriptors 单字主标签不与其他分类精确重叠（防止 exact 级 tie-break 导致不可达）', () => {
    // 这些 descriptor 条目的单字主标签是其唯一稳定入口，不能被其他分类占用
    const DESCRIPTOR_EXCLUSIVE_LABELS: Record<string, string[]> = {
      d_left:    ['左'],
      d_right:   ['右'],
      d_outside: ['外', '外边'],
      d_many:    ['多'],
      d_slow:    ['慢'],
      d_fast:    ['快'],
      d_big:     ['大'],
      d_small:   ['小'],
      d_few:     ['少'],
      d_above:   ['上', '上面'],
      d_below:   ['下', '下面'],
      d_front:   ['前', '前面'],
      d_behind:  ['后', '后面'],
      d_inside:  ['里', '里面'],
    }

    // Build label → ids map across all non-descriptor entries
    const otherLabelMap = new Map<string, string[]>()
    for (const p of seed.filter(e => e.categoryId !== 'descriptors')) {
      const all = [...(p.labels?.zh ?? []), ...(p.synonyms ?? [])]
      for (const lbl of all) {
        if (!otherLabelMap.has(lbl)) otherLabelMap.set(lbl, [])
        otherLabelMap.get(lbl)!.push(p.id)
      }
    }

    const collisions: string[] = []
    for (const [descriptorId, exclusiveLabels] of Object.entries(DESCRIPTOR_EXCLUSIVE_LABELS)) {
      for (const lbl of exclusiveLabels) {
        const others = otherLabelMap.get(lbl)
        if (others && others.length > 0) {
          collisions.push(`${descriptorId}("${lbl}") 与 ${others.join(', ')} 重叠`)
        }
      }
    }

    expect(collisions, `descriptor 主标签被其他分类占用，会导致 exact 级平局：\n${collisions.join('\n')}`).toHaveLength(0)
  })

  it('每个 id 唯一', () => {
    const counts = new Map<string, number>()
    for (const e of seed) counts.set(e.id, (counts.get(e.id) ?? 0) + 1)
    const dups = [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(([id]) => id)
    expect(dups, `重复 id：${dups.join(', ')}`).toHaveLength(0)
  })

})
