/**
 * V1 词图消歧核心：ConceptExclusion + ConceptAlias 评分层。
 *
 * 当前定位：
 * - 这是 Phase 2 预留的 concept-centered 规则模块
 * - 现阶段运行时 matcher 仍以 `PictogramEntry.disambiguationHints` 为 V1 生效规则源
 * - 不应让两套规则在运行时同时生效，避免维护漂移
 *
 * 职责：
 * - 把候选概念列表中因输入 token 明确错误的条目移除（hard-block）或降权（soft-penalty）
 * - 把 alias 命中的概念以低于精确匹配的分数加入候选列表
 *
 * 对应开发清单 Step 4（issue #15）。
 */

export type ExclusionType = 'hard-block' | 'soft-penalty'
export type MatchReason = 'exact' | 'alias' | 'keyword' | 'partial'

export interface ConceptExclusion {
  conceptId: string
  /** 当 inputToken 等于此值时，触发本规则 */
  excludedText: string
  exclusionType: ExclusionType
}

export interface ConceptAlias {
  conceptId: string
  alias: string
}

export interface ScoredCandidate {
  conceptId: string
  score: number
  matchReason: MatchReason
}

const SCORE_EXACT = 100
const SCORE_ALIAS = 90    // 低于精确匹配
const SOFT_PENALTY = 40

export { SCORE_EXACT, SCORE_ALIAS, SOFT_PENALTY }

/**
 * 对候选列表应用排除规则。
 *
 * hard-block  : 从列表中完全移除。
 * soft-penalty: 分数减去 SOFT_PENALTY 常量。
 */
export function applyExclusions(
  candidates: ScoredCandidate[],
  inputToken: string,
  exclusions: ConceptExclusion[],
): ScoredCandidate[] {
  return candidates
    .filter((c) => {
      const rule = exclusions.find(
        (e) => e.conceptId === c.conceptId && e.excludedText === inputToken,
      )
      return !(rule?.exclusionType === 'hard-block')
    })
    .map((c) => {
      const rule = exclusions.find(
        (e) => e.conceptId === c.conceptId && e.excludedText === inputToken,
      )
      if (rule?.exclusionType === 'soft-penalty') {
        return { ...c, score: c.score - SOFT_PENALTY }
      }
      return c
    })
}

/**
 * 从 alias 表中找到匹配 inputToken 的概念，返回 alias 候选列表。
 * 调用方负责把返回结果合并进主候选池，并按 score 排序。
 */
export function scoreAliasMatches(
  inputToken: string,
  aliases: ConceptAlias[],
): ScoredCandidate[] {
  return aliases
    .filter((a) => a.alias === inputToken)
    .map((a) => ({
      conceptId: a.conceptId,
      score: SCORE_ALIAS,
      matchReason: 'alias' as const,
    }))
}

/**
 * 合并候选池：主候选 + alias 候选，去重（conceptId），保留最高分。
 * 结果按 score 降序排列。
 */
export function mergeCandidates(
  primary: ScoredCandidate[],
  fromAliases: ScoredCandidate[],
): ScoredCandidate[] {
  const map = new Map<string, ScoredCandidate>()
  for (const c of [...primary, ...fromAliases]) {
    const existing = map.get(c.conceptId)
    if (!existing || c.score > existing.score) {
      map.set(c.conceptId, c)
    }
  }
  return [...map.values()].sort((a, b) => b.score - a.score)
}
