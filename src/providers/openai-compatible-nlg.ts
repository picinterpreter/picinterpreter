import type { NLGProvider, NLGRequest, NLGResponse } from '@/types'

export interface OpenAICompatibleConfig {
  baseUrl: string
  apiKey: string
  model: string
}

/**
 * OpenAI-compatible NLG provider.
 * 支持 OpenAI / Qwen / DeepSeek / 其他兼容端点。
 */
export class OpenAICompatibleNLG implements NLGProvider {
  readonly name = 'openai-compatible'

  private readonly config: OpenAICompatibleConfig

  constructor(config: OpenAICompatibleConfig) {
    this.config = config
  }

  async generate(req: NLGRequest): Promise<NLGResponse> {
    // ── 系统提示：基础指令 ───────────────────────────────────────────────── //
    let systemPrompt = `你是一个辅助失语症患者表达的 AI 助手。
用户会给你一组图片对应的词语标签（按他们想表达的顺序排列）。
请根据这些标签生成 ${req.candidateCount} 个自然、通顺的中文短句候选。
要求：
- 句子简短明了，适合日常沟通
- 保持原始词语的语义和顺序意图
- 每个候选句风格略有不同（正式/随意/礼貌）
- 只输出句子，每行一个，不要编号或额外说明`

    // ── 注入图库词汇提示（有则附加，引导 LLM 选用图片中已有的词）────────── //
    const vocab = req.context?.pictogramVocabulary
    if (vocab) {
      systemPrompt +=
        `\n\n图库中存在的词汇（部分列表，按使用频率排序）：\n${vocab}` +
        `\n在造句时，请优先使用以上词汇，以便患者认出对应的图片。`
    }

    // ── 注入近期对话上下文（有则附加，无则不影响） ───────────────────────── //
    const recent = req.context?.recentSentences
    if (recent && recent.length > 0) {
      systemPrompt += `\n\n本次对话近期记录（最旧→最新，供语义衔接参考）：`
      recent.forEach((s, i) => {
        systemPrompt += `\n  ${i + 1}. ${s}`
      })
      systemPrompt += `\n请在语义上与以上记录保持自然连贯，但不要简单重复。`
    }

    const userPrompt = `词语标签：${req.pictogramLabels.join('、')}`

    const url = `${this.config.baseUrl}/chat/completions`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`NLG API error ${response.status}: ${text}`)
    }

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content ?? ''
    const candidates = content
      .split('\n')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .slice(0, req.candidateCount)

    if (candidates.length === 0) {
      throw new Error('NLG returned empty response')
    }

    return {
      candidates,
      provider: this.name,
      isOfflineFallback: false,
    }
  }
}
