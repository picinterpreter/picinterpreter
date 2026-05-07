/**
 * 文本→图片序列匹配器（Phase 1.5 核心）。
 *
 * 管线：文本 → segmentText() 分词 → lexicon 查找 → Dexie 图库匹配 → 图片序列
 */

import { segmentText, type SegmentResult } from './segment-text'
import { findEntry, type LexiconEntry } from '@/data/lexicon'
import { db } from '@/db'
import type { PictogramEntry } from '@/types'

/**
 * Strategy 4 安全：含这些前缀的 token 不做包含匹配，
 * 避免 "不开心" 匹配到 "开心" 等语义反转错误。
 */
const NEGATION_PREFIXES = ['不', '没', '别', '勿', '莫', '未'] as const

type LexiconLikeEntry = {
  zh: string
  category?: string
} | null
type CandidateMatchType = 'exact' | 'synonym' | 'lexicon-synonym' | 'partial'

// 阶段间距 100，保证 semantic domain 加权只能在同阶段内改变排名，不能越级。
const MATCH_STAGE_GAP = 100
const DOMAIN_MATCH_BONUS = 40

const MATCH_STAGE_SCORE: Record<CandidateMatchType, number> = {
  exact: MATCH_STAGE_GAP * 4,
  synonym: MATCH_STAGE_GAP * 3,
  'lexicon-synonym': MATCH_STAGE_GAP * 2,
  partial: MATCH_STAGE_GAP,
}

type Candidate = {
  pictogram: PictogramEntry
  matchType: CandidateMatchType
  matchedKey?: string
  matchedLabelLength?: number
}

function parseHintList(value?: string): string[] {
  if (!value) return []
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeLexiconEntry(entry: LexiconEntry | undefined): LexiconLikeEntry {
  if (!entry) return null
  return {
    zh: entry.zh,
    category: entry.category,
  }
}

function getSemanticDomain(pictogram: PictogramEntry): string {
  return pictogram.disambiguationHints.semanticDomain ?? pictogram.categoryId
}

function buildExclusionTerms(
  token: string,
  candidate: Candidate,
  lexiconEntry: LexiconLikeEntry,
): Set<string> {
  return new Set(
    [token, candidate.matchedKey, lexiconEntry?.zh]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  )
}

function scoreCandidate(
  token: string,
  candidate: Candidate,
  lexiconEntry: LexiconLikeEntry,
): number {
  const base = MATCH_STAGE_SCORE[candidate.matchType]
  const excludedTokens = new Set(parseHintList(candidate.pictogram.disambiguationHints.excludeTokens))
  const exclusionTerms = buildExclusionTerms(token, candidate, lexiconEntry)

  for (const term of exclusionTerms) {
    if (excludedTokens.has(term)) {
      return Number.NEGATIVE_INFINITY
    }
  }

  let score = base

  if (candidate.matchType === 'partial') {
    score += candidate.matchedLabelLength ?? 0
  }

  if (lexiconEntry?.category) {
    const domain = getSemanticDomain(candidate.pictogram)
    if (domain === lexiconEntry.category) {
      score += DOMAIN_MATCH_BONUS
    }
  }

  return score
}

function pickBestCandidate(
  token: string,
  candidates: Candidate[],
  lexiconEntry: LexiconLikeEntry,
): Candidate | null {
  let best: Candidate | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const candidate of candidates) {
    const score = scoreCandidate(token, candidate, lexiconEntry)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return bestScore === Number.NEGATIVE_INFINITY ? null : best
}

export interface MatchedToken {
  /** 原始分词 */
  token: string
  /** 匹配到的图片条目，null = 未匹配 */
  pictogram: PictogramEntry | null
  /** 匹配方式 */
  matchType: 'exact' | 'synonym' | 'lexicon-synonym' | 'partial' | 'none'
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
 * 5. 都没有 → matchType = 'none'
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
    let matchType: MatchedToken['matchType'] = 'none'
    const lexiconEntry = normalizeLexiconEntry(findEntry(token))

    // Strategy 1: 精确匹配 labels.zh，同阶段允许用 category / exclusion 做重排
    const exactCandidate = pickBestCandidate(
      token,
      allPictograms
        .filter((p) => p.labels.zh.some((label) => label === token))
        .map((p) => ({ pictogram: p, matchType: 'exact' as const, matchedKey: token })),
      lexiconEntry,
    )
    if (exactCandidate) {
      matched = exactCandidate.pictogram
      matchType = exactCandidate.matchType
    }

    // Strategy 2: 匹配 synonyms，同阶段允许 exclusion 拦截错误候选
    if (!matched) {
      const synonymCandidate = pickBestCandidate(
        token,
        allPictograms
          .filter((p) => p.synonyms.includes(token))
          .map((p) => ({ pictogram: p, matchType: 'synonym' as const, matchedKey: token })),
        lexiconEntry,
      )
      if (synonymCandidate) {
        matched = synonymCandidate.pictogram
        matchType = synonymCandidate.matchType
      }
    }

    // Strategy 3: 通过 lexicon 查找同义词的主词，再匹配
    if (!matched) {
      if (lexiconEntry) {
        const lexiconCandidate = pickBestCandidate(
          token,
          allPictograms
            .filter((p) => p.labels.zh.some((label) => label === lexiconEntry.zh))
            .map((p) => ({ pictogram: p, matchType: 'lexicon-synonym' as const, matchedKey: lexiconEntry.zh })),
          lexiconEntry,
        )
        if (lexiconCandidate) {
          matched = lexiconCandidate.pictogram
          matchType = lexiconCandidate.matchType
        }
      }
    }

    // Strategy 4: 包含匹配 — token 内含有某个 label（label ≥ 2 字），取最长命中
    // 适用场景：分词引擎将 "肚子疼" 作为整体 token，但图库里只有 "肚子"
    // 安全限制：跳过否定前缀词（"不开心" 不应匹配 "开心"）
    if (!matched && token.length >= 3 && !NEGATION_PREFIXES.some((p) => token.startsWith(p))) {
      const partialCandidates: Candidate[] = []
      for (const p of allPictograms) {
        let bestLabelLength = 0
        for (const label of p.labels.zh) {
          if (label.length >= 2 && token.includes(label) && label.length > bestLabelLength) {
            bestLabelLength = label.length
          }
        }
        if (bestLabelLength > 0) {
          partialCandidates.push({
            pictogram: p,
            matchType: 'partial',
            matchedKey: p.labels.zh.find((label) => label.length === bestLabelLength && token.includes(label)) ?? token,
            matchedLabelLength: bestLabelLength,
          })
        }
      }
      const partialCandidate = pickBestCandidate(token, partialCandidates, lexiconEntry)
      if (partialCandidate) {
        matched = partialCandidate.pictogram
        matchType = partialCandidate.matchType
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
