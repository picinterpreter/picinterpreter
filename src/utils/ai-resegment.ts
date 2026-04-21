/**
 * AI 辅助分词模块（Priority 1+2 核心）。
 *
 * 当规则式分词的匹配率低（< 0.6）或存在未匹配词时，
 * 调用 LLM 将原始文本重新映射到图库词汇，提升图片匹配成功率。
 *
 * 设计原则：
 *  - aiResegment()   : I/O 副作用（DB + fetch），失败时返回 null，绝不抛出
 *  - parseResegmentResponse() : 纯函数，单独暴露以便单元测试
 *  - buildPictogramVocabularyHint() : DB 只读，可被 NLG 管线复用
 */

import { db } from '@/db'

// ─── 类型 ────────────────────────────────────────────────────────────────── //

export interface AiResegmentParams {
  /** 用户输入的原始文本 */
  text: string
  /** 规则分词后仍未匹配到图片的词语列表 */
  unmatchedTokens: string[]
  /** OpenAI 兼容 endpoint 的 base URL（不含 /chat/completions）*/
  baseUrl: string
  /** API Key（本地代理模式可为空字符串） */
  apiKey: string
  /** 模型名称 */
  model: string
  /** AbortSignal，用于组件卸载 / 重置时取消请求 */
  signal?: AbortSignal
}

// ─── 词汇提示构建 ────────────────────────────────────────────────────────── //

/**
 * 从图库中取使用频率最高的 `limit` 个图片的主标签，
 * 拼成顿号分隔的词汇提示字符串，供 LLM 参考。
 *
 * - 按 usageCount 降序，高频词排在前面
 * - 去重（多个图片共享同一主标签时只保留一次）
 * - 总字符数不超过 MAX_VOCAB_CHARS，避免撑爆 LLM 上下文
 */
const MAX_VOCAB_CHARS = 1500

export async function buildPictogramVocabularyHint(limit = 400): Promise<string> {
  const pictograms = await db.pictograms
    .orderBy('usageCount')
    .reverse()
    .limit(limit)
    .toArray()

  const seen = new Set<string>()
  const parts: string[] = []
  let total = 0

  for (const p of pictograms) {
    const label = p.labels?.zh?.[0]
    if (typeof label !== 'string' || label.length === 0) continue
    if (seen.has(label)) continue
    seen.add(label)
    // +1 for the '、' separator
    if (total + label.length + 1 > MAX_VOCAB_CHARS) break
    parts.push(label)
    total += label.length + 1
  }

  return parts.join('、')
}

// ─── AI 分词 ─────────────────────────────────────────────────────────────── //

/**
 * 调用 LLM，将原始文本分解为图库词汇序列。
 *
 * 成功时返回词语数组，可直接传给 `matchTextToImages` 的 `preSegmented` 选项；
 * 任何错误（网络、超时、解析失败）均返回 `null`，调用方回退到规则式结果。
 */
export async function aiResegment(params: AiResegmentParams): Promise<string[] | null> {
  const { text, unmatchedTokens, baseUrl, apiKey, model, signal } = params

  let vocabulary: string
  try {
    vocabulary = await buildPictogramVocabularyHint(400)
  } catch {
    return null
  }

  if (!vocabulary) return null

  const systemPrompt =
    `你是一个辅助失语症患者的图片词库专家。\n` +
    `图库中所有可用词汇如下（按使用频率排序）：\n${vocabulary}\n\n` +
    `任务：\n` +
    `1. 分析给定的中文句子\n` +
    `2. 将句子中的语义成分一一映射到图库词汇\n` +
    `3. 对于图库中没有的词，用意思最接近的图库词替代\n` +
    `4. 以 JSON 数组输出，每个元素是一个图库词，如：["吃饭","睡觉","开心"]\n` +
    `5. 只输出 JSON 数组，不要有任何其他文字`

  const userPrompt =
    unmatchedTokens.length > 0
      ? `句子：${text}\n\n以下词语未匹配到图片，请重新分析整句并替换为图库词：${unmatchedTokens.join('、')}`
      : `句子：${text}`

  try {
    const url = `${baseUrl}/chat/completions`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 150,
      }),
      signal,
    })

    if (!response.ok) return null

    const data = await response.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    return parseResegmentResponse(raw)
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

  // 降级：按换行分割，过滤掉明显的 JSON 结构符号行，最多 30 个词
  const SKIP_RE = /^(?:\[|\]|\{|\}|,|"|\s)*$/
  const lines = raw
    .split('\n')
    .map((s) => s.replace(/^[\s\-*•·]+|[\s,，。？！]+$/g, '').trim())
    .filter((s) => s.length > 0 && !SKIP_RE.test(s))
    .slice(0, 30)

  return lines.length > 0 ? lines : null
}
