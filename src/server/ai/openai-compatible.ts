import { getServerAIConfig } from './config'
import { getPictogramVocabularyHint } from './pictogram-vocabulary'
import { parseResegmentResponse } from '@/utils/ai-resegment'
import type { NLGRequest, NLGResponse } from '@/types'

const AI_UPSTREAM_TIMEOUT_MS = 15_000
const MAX_RESEGMENT_TOKENS = 12

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

interface ResegmentRequest {
  text: string
  unmatchedTokens: string[]
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

export async function generateSentenceCandidates(
  req: NLGRequest,
  signal?: AbortSignal,
): Promise<NLGResponse> {
  let systemPrompt = `你是一个辅助失语症患者表达的 AI 助手。
用户会给你一组图片对应的词语标签（按他们想表达的顺序排列）。
请根据这些标签生成 ${req.candidateCount} 个自然、通顺的中文短句候选。
要求：
- 句子简短明了，适合日常沟通
- 保持原始词语的语义和顺序意图
- 每个候选句风格略有不同（正式/随意/礼貌）
- 只输出句子，每行一个，不要编号或额外说明`

  const vocabulary = await getPictogramVocabularyHint(200).catch(() => '')
  if (vocabulary) {
    systemPrompt +=
      `\n\n图库中存在的词汇（部分列表，按使用频率排序）：\n${vocabulary}` +
      `\n在造句时，请优先使用以上词汇，以便患者认出对应的图片。`
  }

  const recent = req.context?.recentSentences
  if (recent && recent.length > 0) {
    systemPrompt += '\n\n本次对话近期记录（最旧→最新，供语义衔接参考）：'
    recent.forEach((sentence, index) => {
      systemPrompt += `\n  ${index + 1}. ${sentence}`
    })
    systemPrompt += '\n请在语义上与以上记录保持自然连贯，但不要简单重复。'
  }

  const userPrompt = `词语标签：${req.pictogramLabels.join('、')}`
  const data = await requestChatCompletion(
    {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    },
    signal,
  )

  const content = data.choices?.[0]?.message?.content ?? ''
  const candidates = content
    .split('\n')
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .slice(0, req.candidateCount)

  if (candidates.length === 0) {
    throw new Error('NLG returned empty response')
  }

  return {
    candidates,
    provider: 'next-server-ai',
    isOfflineFallback: false,
  }
}

export async function resegmentText(
  req: ResegmentRequest,
  signal?: AbortSignal,
): Promise<string[] | null> {
  const vocabulary = await getPictogramVocabularyHint(400).catch(() => '')
  if (!vocabulary) return null
  const vocabularySet = new Set(
    vocabulary
      .split('、')
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  )

  const systemPrompt =
    `你是一个辅助失语症患者的图片词库专家。\n` +
    `图库中所有可用词汇如下（按使用频率排序）：\n${vocabulary}\n\n` +
    `任务：\n` +
    `1. 分析给定的中文句子\n` +
    `2. 将句子中的语义成分一一映射到图库词汇\n` +
    `3. 对于图库中没有的词，用意思最接近的图库词替代\n` +
    `4. 只输出当前句子需要的词，不要输出完整词库\n` +
    `5. 最多输出 ${MAX_RESEGMENT_TOKENS} 个词\n` +
    `6. 以 JSON 数组输出，每个元素必须是上方图库词汇中的一个词，如：["吃饭","睡觉","开心"]\n` +
    `7. 只输出 JSON 数组，不要有任何其他文字`

  const userPrompt =
    req.unmatchedTokens.length > 0
      ? `句子：${req.text}\n\n以下词语未匹配到图片，请重新分析整句并替换为图库词：${req.unmatchedTokens.join('、')}`
      : `句子：${req.text}`

  try {
    const data = await requestChatCompletion(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 150,
      },
      signal,
    )

    const raw = data.choices?.[0]?.message?.content ?? ''
    const parsed = parseResegmentResponse(raw)
    if (!parsed || parsed.length > MAX_RESEGMENT_TOKENS) return null

    const tokens = parsed.filter((token) => vocabularySet.has(token))
    return tokens.length > 0 ? tokens : null
  } catch {
    return null
  }
}
