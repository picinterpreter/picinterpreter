/**
 * AI 辅助分词模块（Priority 1+2 核心）。
 *
 * 当规则式分词的匹配率低（< 0.6）或存在未匹配词时，
 * 调用 LLM 将原始文本重新映射到图库词汇，提升图片匹配成功率。
 *
 * 设计原则：
 *  - aiResegment()   : I/O 副作用（fetch），失败时返回 null，绝不抛出
 *  - parseResegmentResponse() : 纯函数，单独暴露以便单元测试
 */

// ─── 类型 ────────────────────────────────────────────────────────────────── //

export interface AiResegmentParams {
  /** 用户输入的原始文本 */
  text: string
  /** 规则分词后仍未匹配到图片的词语列表 */
  unmatchedTokens: string[]
  /** AbortSignal，用于组件卸载 / 重置时取消请求 */
  signal?: AbortSignal
}

// ─── AI 分词 ─────────────────────────────────────────────────────────────── //

/**
 * 调用 LLM，将原始文本分解为图库词汇序列。
 *
 * 成功时返回词语数组，可直接传给 `matchTextToImages` 的 `preSegmented` 选项；
 * 任何错误（网络、超时、解析失败）均返回 `null`，调用方回退到规则式结果。
 */
export async function aiResegment(params: AiResegmentParams): Promise<string[] | null> {
  const { text, unmatchedTokens, signal } = params

  try {
    const response = await fetch('/api/ai/resegment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        unmatchedTokens,
      }),
      signal,
    })

    if (!response.ok) return null

    const data = await response.json() as { tokens?: string[] | null }
    return Array.isArray(data.tokens) && data.tokens.length > 0 ? data.tokens : null
  } catch {
    // AbortError、网络错误、JSON 解析失败等均静默返回 null
    return null
  }
}

// ─── 纯解析函数（可单元测试） ─────────────────────────────────────────────── //

/**
 * 解析 LLM 返回的分词结果（纯函数，无副作用）。
 *
 * 支持以下格式：
 *   - 标准 JSON 数组：`["吃饭", "睡觉"]`
 *   - Markdown 代码块包裹：`` ```json\n["吃饭"]\n``` ``
 *   - 降级：换行分隔的词语列表
 *
 * 若无法提取有效词语，返回 `null`（调用方回退到规则式结果）。
 */
export function parseResegmentResponse(raw: string): string[] | null {
  if (!raw || raw.trim().length === 0) return null

  const trimmedRaw = raw.trim()
  const looksLikeJsonArray = /^(?:```(?:json)?\s*)?\[/.test(trimmedRaw)

  // 优先尝试提取 JSON 数组（可能被 markdown 代码块包裹）
  const jsonMatch = raw.match(/[[][\s\S]*?]/)
  if (jsonMatch) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        const tokens = parsed
          .filter((item): item is string => typeof item === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
        // JSON 解析成功就直接返回（无论有无有效词），不降级到行分割
        // 避免把解析成功但词语为空的情况错误地降级为提取 JSON 语法符号
        return tokens.length > 0 ? tokens : null
      }
    } catch {
      // JSON 解析失败（格式错误），才降级到行分割
    }
  }

  // 如果模型返回的是截断或损坏的 JSON 数组，不要把整行数组文本当成词语。
  if (looksLikeJsonArray) return null

  // 降级：按换行分割，过滤掉明显的 JSON 结构符号行，最多 30 个词
  const SKIP_RE = /^(?:\[|\]|\{|\}|,|"|\s)*$/
  const lines = raw
    .split('\n')
    .map((s) => s.replace(/^[\s\-*•·]+|[\s,，。？！]+$/g, '').trim())
    .filter((s) => s.length > 0 && !SKIP_RE.test(s))
    .slice(0, 30)

  return lines.length > 0 ? lines : null
}
