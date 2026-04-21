import type { NLGProvider, NLGRequest, NLGResponse } from '@/types'

/** 主语（从长到短，避免短前缀误匹配） */
const SUBJECT_PRONOUNS = ['我们', '你们', '他们', '她们', '我', '你', '他', '她', '它']

/** 常见意愿动词（从长到短） */
const DESIRE_VERBS = ['想要', '需要', '希望', '想', '要']

/** 礼貌请求前缀 */
const POLITE_PREFIX = '请'

function startsWithAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.startsWith(p))
}

function containsAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p))
}

/**
 * 离线模板拼句 — 永远可用的兜底 NLG。
 *
 * 生成策略（避免重复前缀）：
 * 1. 原句：base + 。
 * 2. 如果 base 没有主语 → 加「我」
 * 3. 如果 base 没有主语且没有意愿动词 → 加「我想要」
 * 4. 如果 base 不以「请」开头 → 加礼貌形式「请…」
 * 5. 疑问形式：base + ，好吗？
 *
 * 所有候选最终去重后截取。
 */
export class TemplateNLG implements NLGProvider {
  readonly name = 'template'

  async generate(req: NLGRequest): Promise<NLGResponse> {
    const labels = req.pictogramLabels
    if (labels.length === 0) {
      return {
        candidates: ['（请先选择图片）'],
        provider: this.name,
        isOfflineFallback: true,
      }
    }

    const base = labels.join('')
    const hasSubject = startsWithAny(base, SUBJECT_PRONOUNS)
    const hasDesire = containsAny(base, DESIRE_VERBS)
    const isPoliteAlready = base.startsWith(POLITE_PREFIX)

    const raw: string[] = []

    // 1. 原句
    raw.push(base + '。')

    // 2. 加主语（原句已有主语则跳过）
    if (!hasSubject) {
      raw.push('我' + base + '。')
    }

    // 3. 加「我想要」（仅当原句既无主语又无意愿动词时；
    //    有主语时不插入，避免生成语义错误的句子如「我想要头痛」）
    if (!hasSubject && !hasDesire) {
      raw.push('我想要' + base + '。')
    }

    // 4. 礼貌形式（仅对动作/请求类有意义；无主语前缀时才加）
    if (!isPoliteAlready && !hasSubject) {
      raw.push(POLITE_PREFIX + base + '。')
    }

    // 5. 疑问形式
    raw.push(base + '，好吗？')

    // 去重，保持顺序
    const seen = new Set<string>()
    const candidates = raw.filter((s) => {
      if (seen.has(s)) return false
      seen.add(s)
      return true
    })

    return {
      candidates: candidates.slice(0, req.candidateCount),
      provider: this.name,
      isOfflineFallback: true,
    }
  }
}
