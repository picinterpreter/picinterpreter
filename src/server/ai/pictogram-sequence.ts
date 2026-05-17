import { getServerAIConfig } from './config'
import { getArasaacIndex, type ArasaacIndex } from '@/server/pictograms/arasaac-index'
import type { PictogramSequenceItem, PictogramSequenceResponse } from '@/types'

const AI_UPSTREAM_TIMEOUT_MS = 15_000
const MAX_ATTEMPTS = 3
const MAX_SEQUENCE_TOKENS = 16

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export interface TokenGenerationRequest {
  text: string
  attempt: number
  previousItems: PictogramSequenceItem[]
  missingTokens: string[]
}

type TokenGenerator = (request: TokenGenerationRequest, signal?: AbortSignal) => Promise<string[] | null>

export interface BuildPictogramSequenceOptions {
  index?: ArasaacIndex
  generateTokens?: TokenGenerator
  signal?: AbortSignal
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`AI upstream timeout after ${timeoutMs}ms`))
  }, timeoutMs)

  const abortFromCaller = () => {
    controller.abort(signal?.reason)
  }

  if (signal) {
    if (signal.aborted) {
      abortFromCaller()
    } else {
      signal.addEventListener('abort', abortFromCaller, { once: true })
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortFromCaller)
    },
  }
}

async function requestChatCompletion(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ChatCompletionResponse> {
  const config = getServerAIConfig()
  if (!config) {
    throw new Error('AI_API_KEY is not configured')
  }

  const timeout = withTimeout(signal, AI_UPSTREAM_TIMEOUT_MS)
  let response: Response

  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        ...body,
      }),
      signal: timeout.signal,
    })
  } catch (error) {
    timeout.cleanup()
    if (timeout.signal.aborted && !signal?.aborted) {
      throw new Error(`AI upstream timeout after ${AI_UPSTREAM_TIMEOUT_MS / 1000}s`)
    }
    throw error
  }

  timeout.cleanup()

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI upstream error ${response.status}: ${text}`)
  }

  return response.json() as Promise<ChatCompletionResponse>
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .replace(/^[\s,，。？！!?、；;："“”‘’'()（）[\]【】]+|[\s,，。？！!?、；;："“”‘’'()（）[\]【】]+$/g, '')
}

function compactTokens(tokens: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const token of tokens) {
    const normalized = normalizeToken(token)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
    if (result.length >= MAX_SEQUENCE_TOKENS) break
  }

  return result
}

export function parsePictogramTokenResponse(raw: string): string[] | null {
  const match = raw.trim().match(/^\s*(?:```(?:json)?\s*)?(\[[\s\S]*?])\s*(?:```)?\s*$/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[1]) as unknown
    if (!Array.isArray(parsed)) return null

    const tokens = compactTokens(parsed.filter((item): item is string => typeof item === 'string'))
    return tokens.length > 0 ? tokens : null
  } catch {
    return null
  }
}

function getSystemPrompt() {
  return (
    `你是图语家的 AAC 图片序列 agent，服务对象是失语症患者。\n` +
    `任务是把照护者的一句话拆成患者容易理解的核心图片词序列。\n\n` +
    `规则：\n` +
    `- 保留关键语义：对象、动作、地点、状态、重要否定或缺失概念。\n` +
    `- 删除助词、语气词、长解释和低价值连接词。\n` +
    `- 把口语表达改成更可视化的基础词，例如“热热”改成“加热”。\n` +
    `- 如果句子里有“没喝完、剩下、还有”等概念，应保留为一个短词；后续系统会判断图库是否有图。\n` +
    `- 最多输出 ${MAX_SEQUENCE_TOKENS} 个词。\n` +
    `- 只输出 JSON 字符串数组，不要编号，不要解释。`
  )
}

function getUserPrompt(request: TokenGenerationRequest) {
  if (request.attempt === 1) {
    return `句子：${request.text}`
  }

  const matched = request.previousItems
    .filter((item) => item.pictogram)
    .map((item) => `${item.token}=>${item.pictogram?.labels.zh[0]}`)
    .join('、') || '无'

  return (
    `原句：${request.text}\n` +
    `已找到图片：${matched}\n` +
    `未找到图片：${request.missingTokens.join('、')}\n\n` +
    `请只重写整句的图片词序列。未找到的词请换成更基础、更可视化的近义词；如果这个概念本身很重要且没有替代词，可以继续保留它。仍然只输出 JSON 数组。`
  )
}

export async function generatePictogramTokens(
  request: TokenGenerationRequest,
  signal?: AbortSignal,
): Promise<string[] | null> {
  const data = await requestChatCompletion(
    {
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: getUserPrompt(request) },
      ],
      temperature: request.attempt === 1 ? 0.2 : 0.1,
      max_tokens: 180,
    },
    signal,
  )

  const raw = data.choices?.[0]?.message?.content ?? ''
  return parsePictogramTokenResponse(raw)
}

function matchTokens(index: ArasaacIndex, tokens: string[]): PictogramSequenceItem[] {
  return tokens.map((token) => index.search(token))
}

function missingTokensFrom(items: PictogramSequenceItem[]): string[] {
  return items
    .filter((item) => item.pictogram === null)
    .map((item) => item.token)
}

function isFullyMatched(items: PictogramSequenceItem[]): boolean {
  return items.length > 0 && items.every((item) => item.pictogram !== null)
}

export async function buildPictogramSequence(
  text: string,
  options: BuildPictogramSequenceOptions = {},
): Promise<PictogramSequenceResponse | null> {
  const index = options.index ?? await getArasaacIndex()
  const generateTokens = options.generateTokens ?? generatePictogramTokens

  let bestItems: PictogramSequenceItem[] = []
  let bestMissing: string[] = []
  let attempts = 0

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt
    const tokens = await generateTokens({
      text,
      attempt,
      previousItems: bestItems,
      missingTokens: bestMissing,
    }, options.signal)

    if (!tokens || tokens.length === 0) {
      return bestItems.length > 0
        ? { items: bestItems, missingTokens: bestMissing, attempts }
        : null
    }

    const items = matchTokens(index, compactTokens(tokens))
    const missingTokens = missingTokensFrom(items)

    if (bestItems.length === 0 || missingTokens.length <= bestMissing.length) {
      bestItems = items
      bestMissing = missingTokens
    }

    if (isFullyMatched(items)) {
      return { items, missingTokens: [], attempts }
    }
  }

  return {
    items: bestItems,
    missingTokens: bestMissing,
    attempts,
  }
}
