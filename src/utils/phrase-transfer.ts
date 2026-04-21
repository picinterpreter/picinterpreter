/**
 * phrase-transfer — 常用语 JSON 导出 / 导入的纯逻辑层。
 *
 * 导出格式：
 * {
 *   version: 1,
 *   appId: "tuyujia",
 *   exportedAt: "2026-04-18T10:00:00.000Z",
 *   phrases: SavedPhrase[]
 * }
 *
 * 导入合并策略：
 *   - 已存在相同 id → 跳过（保留本地版本）
 *   - 不存在 id → 写入
 *   - 返回 { added, skipped } 统计，供 UI 展示
 *
 * 所有函数均为纯函数或接受外部依赖注入，方便单元测试。
 */

import type { SavedPhrase } from '@/types'

// ─── 导出格式 ────────────────────────────────────────────────────────────── //

export interface PhrasesExport {
  version: 1
  appId: 'tuyujia'
  exportedAt: string   // ISO 8601
  phrases: SavedPhrase[]
}

/**
 * 将短语列表序列化为导出对象（不含 IO 操作）。
 */
export function buildPhrasesExport(phrases: SavedPhrase[]): PhrasesExport {
  return {
    version: 1,
    appId: 'tuyujia',
    exportedAt: new Date().toISOString(),
    phrases,
  }
}

// ─── 导入验证 ────────────────────────────────────────────────────────────── //

export type ImportParseResult =
  | { ok: true; phrases: SavedPhrase[] }
  | { ok: false; error: string }

/**
 * 解析并校验导入的 JSON 字符串，返回已校验的 SavedPhrase 列表。
 * 不访问 DB — 仅做结构验证。
 */
export function parsePhrasesImport(jsonText: string): ImportParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { ok: false, error: '文件格式无效，不是合法的 JSON' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: '文件内容无效' }
  }

  const obj = parsed as Record<string, unknown>

  if (obj.appId !== 'tuyujia') {
    return { ok: false, error: '不是图语家的导出文件' }
  }

  if (obj.version !== 1) {
    return { ok: false, error: `不支持的文件版本：${obj.version}` }
  }

  if (!Array.isArray(obj.phrases)) {
    return { ok: false, error: '文件中没有短语列表' }
  }

  const valid: SavedPhrase[] = []
  for (let i = 0; i < obj.phrases.length; i++) {
    const raw = obj.phrases[i]
    // Guard: must be a plain object — null, primitives, and arrays all fail
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { ok: false, error: `第 ${i + 1} 条数据格式有误` }
    }
    const p = raw as Record<string, unknown>
    if (
      typeof p.id !== 'string' ||
      typeof p.sentence !== 'string' ||
      !Array.isArray(p.pictogramIds) ||
      typeof p.usageCount !== 'number' ||
      typeof p.lastUsedAt !== 'number'
    ) {
      return { ok: false, error: `第 ${i + 1} 条数据格式有误` }
    }
    valid.push({
      id: p.id,
      sentence: p.sentence,
      pictogramIds: (p.pictogramIds as unknown[]).filter(
        (x): x is string => typeof x === 'string',
      ),
      usageCount: p.usageCount,
      lastUsedAt: p.lastUsedAt,
    })
  }

  return { ok: true, phrases: valid }
}

// ─── 合并逻辑 ────────────────────────────────────────────────────────────── //

export interface MergeResult {
  toAdd: SavedPhrase[]
  skippedCount: number
}

/**
 * 计算要写入的新短语和跳过数量。
 *
 * @param incoming   从文件解析出的短语列表
 * @param existingIds  本地已有的 id 集合
 */
export function mergePhrases(
  incoming: SavedPhrase[],
  existingIds: Set<string>,
): MergeResult {
  const toAdd: SavedPhrase[] = []
  let skippedCount = 0

  for (const phrase of incoming) {
    if (existingIds.has(phrase.id)) {
      skippedCount++
    } else {
      toAdd.push(phrase)
    }
  }

  return { toAdd, skippedCount }
}
