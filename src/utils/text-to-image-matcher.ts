/**
 * 文本→图片序列匹配器（Phase 1.5 核心）。
 *
 * 管线：文本 → segmentText() 分词 → lexicon 查找 → Dexie 图库匹配 → 图片序列
 */

import { segmentText, type SegmentResult } from './segment-text'
import { findEntry } from '@/data/lexicon'
import { db } from '@/db'
import type { PictogramEntry } from '@/types'

/**
 * Strategy 4 安全：含这些前缀的 token 不做包含匹配，
 * 避免 "不开心" 匹配到 "开心" 等语义反转错误。
 */
const NEGATION_PREFIXES = ['不', '没', '别', '勿', '莫', '未'] as const

export interface MatchedToken {
  /** 原始分词 */
  token: string
  /** 匹配到的图片条目，null = 未匹配 */
  pictogram: PictogramEntry | null
  /** 匹配方式 */
  matchType: 'exact' | 'synonym' | 'lexicon' | 'partial' | 'missing'
}

export interface TextToImageMatchResult {
  /** 输入文本 */
  inputText: string
  /** 分词结果 */
  segmentation: SegmentResult
  /** 每个 token 的匹配结果 */
  matches: MatchedToken[]
  /** 匹配成功率 (0-1) */
  matchRate: number
  /** 耗时 (ms) */
  elapsedMs: number
}

export interface MatchTextOptions {
  /**
   * 跳过 segmentText()，直接使用传入的 token 列表。
   * 用于 AI 辅助重分词：LLM 返回的词序列直接进入匹配管线。
   */
  preSegmented?: string[]
}

/**
 * 将文本转换为图片序列。
 *
 * 匹配策略：
 * 1. 用 token 精确匹配 pictogram.labels.zh
 * 2. 用 token 匹配 pictogram.synonyms
 * 3. 用 lexicon 查找同义词，再匹配 pictogram.labels.zh
 * 4. 包含匹配：token 包含某个 label（label ≥ 2 字），取最长匹配
 * 5. 都没有 → matchType = 'missing'
 *
 * 当 `options.preSegmented` 存在时，跳过分词步骤直接使用该词列表。
 */
export async function matchTextToImages(
  text: string,
  options?: MatchTextOptions,
): Promise<TextToImageMatchResult> {
  const startTime = performance.now()

  const segmentation: SegmentResult = options?.preSegmented
    ? { segments: options.preSegmented, engine: 'intl-segmenter' }
    : segmentText(text)

  const matches: MatchedToken[] = []

  // 预加载所有图片条目（MVP 数据量小，全加载可行）
  const allPictograms = await db.pictograms.toArray()

  for (const token of segmentation.segments) {
    let matched: PictogramEntry | null = null
    let matchType: MatchedToken['matchType'] = 'missing'

    // Strategy 1: 精确匹配 labels.zh
    matched = allPictograms.find((p) =>
      p.labels.zh.some((label) => label === token),
    ) ?? null
    if (matched) {
      matchType = 'exact'
    }

    // Strategy 2: 匹配 synonyms
    if (!matched) {
      matched = allPictograms.find((p) =>
        p.synonyms.includes(token),
      ) ?? null
      if (matched) {
        matchType = 'synonym'
      }
    }

    // Strategy 3: 通过 lexicon 查找同义词的主词，再匹配
    if (!matched) {
      const entry = findEntry(token)
      if (entry) {
        matched = allPictograms.find((p) =>
          p.labels.zh.some((label) => label === entry.zh),
        ) ?? null
        if (matched) {
          matchType = 'lexicon'
        }
      }
    }

    // Strategy 4: 包含匹配 — token 内含有某个 label（label ≥ 2 字），取最长命中
    // 适用场景：分词引擎将 "肚子疼" 作为整体 token，但图库里只有 "肚子"
    // 安全限制：跳过否定前缀词（"不开心" 不应匹配 "开心"）
    if (!matched && token.length >= 3 && !NEGATION_PREFIXES.some((p) => token.startsWith(p))) {
      let bestLabel = ''
      let bestPictogram: PictogramEntry | null = null
      outer: for (const p of allPictograms) {
        for (const label of p.labels.zh) {
          if (
            label.length >= 2 &&
            label.length > bestLabel.length &&
            token.includes(label)
          ) {
            bestLabel = label
            bestPictogram = p
            // 已匹配到与 token 等长的 label，无需继续
            if (bestLabel.length === token.length) break outer
          }
        }
      }
      if (bestPictogram) {
        matched = bestPictogram
        matchType = 'partial'
      }
    }

    matches.push({ token, pictogram: matched, matchType })
  }

  const matchedCount = matches.filter((m) => m.pictogram !== null).length
  const matchRate = matches.length > 0 ? matchedCount / matches.length : 0
  const elapsedMs = performance.now() - startTime

  return {
    inputText: text,
    segmentation,
    matches,
    matchRate,
    elapsedMs,
  }
}
