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
import categoriesJson from '../../../public/seed/categories.json'
import type { BoardTile, Category, PictogramEntry } from '@/types'

const seed = seedJson as unknown as PictogramEntry[]
const categories = categoriesJson as unknown as Category[]

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

  it('relatedTerms 若存在必须是数组', () => {
    const bad = seed.filter(e => 'relatedTerms' in e && !Array.isArray((e as { relatedTerms?: unknown }).relatedTerms))
    expect(bad.map(e => e.id), 'relatedTerms 字段类型错误').toHaveLength(0)
  })

  it('relatedTerms 与 synonyms 不重叠（同一个词不能身兼两职）', () => {
    const violations: string[] = []
    for (const e of seed) {
      const related: string[] = ((e as { relatedTerms?: string[] }).relatedTerms) ?? []
      for (const term of related) {
        if (e.synonyms.includes(term))
          violations.push(`${e.id}: "${term}" 同时出现在 synonyms 和 relatedTerms`)
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0)
  })

  it('usageCount 是数字', () => {
    const bad = seed.filter(e => typeof e.usageCount !== 'number')
    expect(bad.map(e => e.id), '以下条目缺少 usageCount').toHaveLength(0)
  })

  it('category tileIds 若存在必须指向真实 pictogram', () => {
    const pictogramIds = new Set(seed.map(e => e.id))
    const missing: string[] = []
    for (const category of categories) {
      for (const tileId of category.tileIds ?? []) {
        if (!pictogramIds.has(tileId)) missing.push(`${category.id}.tileIds -> ${tileId}`)
      }
    }
    expect(missing, `以下 tileIds 指向不存在的 pictogram：\n${missing.join('\n')}`).toHaveLength(0)
  })

  it('category tiles 若存在必须类型合法并指向真实记录', () => {
    const pictogramIds = new Set(seed.map(e => e.id))
    const categoryIds = new Set(categories.map(e => e.id))
    const errors: string[] = []

    function isBoardTile(tile: unknown): tile is BoardTile {
      if (!tile || typeof tile !== 'object') return false
      const candidate = tile as { type?: unknown; id?: unknown; labelOverride?: unknown }
      if (typeof candidate.type !== 'string' || typeof candidate.id !== 'string') return false
      if ('labelOverride' in candidate && typeof candidate.labelOverride !== 'string') return false
      return ['pictogram', 'category', 'savedPhrases'].includes(candidate.type)
    }

    for (const category of categories) {
      const seen = new Set<string>()
      for (const [index, tile] of ((category as { tiles?: unknown[] }).tiles ?? []).entries()) {
        if (!isBoardTile(tile)) {
          errors.push(`${category.id}.tiles[${index}] 格式非法`)
          continue
        }

        const key = `${tile.type}:${tile.id}`
        if (seen.has(key)) errors.push(`${category.id}.tiles 重复：${key}`)
        seen.add(key)

        if (tile.type === 'pictogram' && !pictogramIds.has(tile.id)) {
          errors.push(`${category.id}.tiles[${index}] pictogram 不存在：${tile.id}`)
        }
        if (tile.type === 'category' && !categoryIds.has(tile.id)) {
          errors.push(`${category.id}.tiles[${index}] category 不存在：${tile.id}`)
        }
        if (tile.type === 'savedPhrases' && tile.id !== 'saved-phrases') {
          errors.push(`${category.id}.tiles[${index}] savedPhrases id 非法：${tile.id}`)
        }
      }
    }

    expect(errors, errors.join('\n')).toHaveLength(0)
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

  it('synonym 不得是其他条目的 primary label（防止概念被吞噬）', () => {
    // 如果词 W 是条目 A 的 labels.zh[0]，它就是 A 的"正式名"
    // W 出现在条目 B 的 synonyms 里意味着：输入 W 本应命中 A，却可能被 B 抢走
    const primaryLabel = new Map<string, string>(
      seed
        .map(e => [e.labels?.zh?.[0], e.id] as [string, string])
        .filter(([l]) => l)
    )
    const violations: string[] = []
    for (const e of seed) {
      for (const syn of e.synonyms ?? []) {
        const owner = primaryLabel.get(syn)
        if (owner && owner !== e.id)
          violations.push(`${e.id} synonym "${syn}" 是 ${owner} 的主标签`)
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0)
  })

  it('跨概念高风险 synonym 不得出现（回归）', () => {
    // 每条规则记录：为什么这个词不该出现在这个条目里
    const BANNED: Record<string, string[]> = {
      o_shoes:    ['脚踝'],  // 脚踝=身体部位，不是鞋
      o_charger:  ['充电'],  // 充电=动作，充电器=物品
      pl_room:    ['房子'],  // 房子=建筑整体，房间=其中一个空间
      hy_shampoo: ['洗头'],  // 洗头=动作，洗发水=物品
    }
    const violations: string[] = []
    for (const entry of seed) {
      const banned = BANNED[entry.id]
      if (!banned) continue
      const all = [...(entry.labels?.zh ?? []), ...(entry.synonyms ?? [])]
      for (const term of banned) {
        if (all.includes(term))
          violations.push(`${entry.id} 不应含"${term}"（跨概念 synonym）`)
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0)
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
