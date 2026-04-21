/**
 * NLG 上下文构建工具
 *
 * 从 db.expressions 中读取近期对话记录，
 * 格式化为 NLGRequest['context']，供 LLM 生成更连贯的候选句。
 *
 * 未来可在此处扩展：
 *   - 跨 session 长期记忆摘要
 *   - 情绪/场景标签
 *   - 照护者回应记录（receive 方向）
 */

import { db } from '@/db'
import type { NLGRequest } from '@/types'

export interface ContextOptions {
  /** 最多取几条记录（默认 5） */
  limit?: number
  /** 只取多少毫秒内的记录（默认 30 分钟） */
  withinMs?: number
}

/**
 * 构建 LLM 上下文。
 *
 * 只取 **本次 session** 内的 expressions，按时间正序排列，
 * 提取 selectedSentence 作为对话历史供 LLM 参考。
 *
 * 这样不同对话场景互不串话，新建对话 = 新建 sessionId = 干净上下文。
 */
export async function buildRecentContext(
  sessionId: string,
  options: ContextOptions = {},
): Promise<NLGRequest['context']> {
  if (!sessionId) return undefined

  const { limit = 5, withinMs = SESSION_WINDOW_MS } = options
  const cutoff = Date.now() - withinMs

  // sessionId 已建索引（Dexie v2），先按 session 过滤再按时间筛窗口
  const sessionRecords = await db.expressions
    .where('sessionId')
    .equals(sessionId)
    .toArray()

  if (sessionRecords.length === 0) return undefined

  // 过滤时间窗口 + 按时间正序（最旧 → 最新） + 截取最后 limit 条
  const recent = sessionRecords
    .filter((e) => e.createdAt > cutoff)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-limit)

  // 只取有 selectedSentence 的条目作为有效对话轮次
  const recentSentences = recent
    .filter((e) => e.selectedSentence != null && e.selectedSentence.trim() !== '')
    .map((e) => e.selectedSentence!)

  if (recentSentences.length === 0) return undefined

  return { recentSentences }
}

/** 与 SESSION_IDLE_MS 保持一致（同一窗口内的对话才算上下文） */
const SESSION_WINDOW_MS = 30 * 60 * 1000
