/**
 * useAI — 统一 AI 能力 hook
 *
 * 返回一个稳定的接口对象，内部：
 *   - 根据 Settings 实例化 AIAdapter（Key/URL 变化时自动重建）
 *   - generateSentences 自动拉取近期对话上下文并注入 LLM prompt
 *   - speak / stopSpeaking 透传 WebSpeechTTS
 */

import { useMemo, useRef } from 'react'
import { AIAdapter } from '@/providers/ai-adapter'
import { OpenAICompatibleNLG } from '@/providers/openai-compatible-nlg'
import { useSettingsStore } from '@/stores/settings-store'
import { useConversationStore } from '@/stores/conversation-store'
import { buildRecentContext } from '@/utils/nlg-context'
import { buildPictogramVocabularyHint } from '@/utils/ai-resegment'
import type { NLGRequest, NLGResponse, TTSRequest, TTSResult } from '@/types'

export interface AIInterface {
  generateSentences(req: NLGRequest): Promise<NLGResponse>
  speak(req: TTSRequest): Promise<TTSResult>
  stopSpeaking(): void
}

export function useAI(): AIInterface {
  const { nlgBaseUrl, nlgApiKey, nlgModel, ttsVoiceName } = useSettingsStore()
  const sessionId = useConversationStore((s) => s.sessionId)

  // sessionId 用 ref 追踪，避免 adapter 重建触发重新渲染
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

  const ttsVoiceNameRef = useRef(ttsVoiceName)
  ttsVoiceNameRef.current = ttsVoiceName

  const adapter = useMemo(() => {
    // 本地代理模式：baseUrl 指向 localhost/127.0.0.1 时，即使前端没填 Key 也应启用在线 NLG。
    // 真实 Key 由 server/proxy.mjs 从 .env 注入转发。
    const isLocalProxy = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(nlgBaseUrl)
    const canUseOnline = Boolean(nlgApiKey) || isLocalProxy

    const onlineNLG = canUseOnline
      ? new OpenAICompatibleNLG({
          baseUrl: nlgBaseUrl,
          apiKey: nlgApiKey, // 代理模式下为空字符串，由代理在服务端覆盖 Authorization
          model: nlgModel,
        })
      : undefined

    return new AIAdapter({ onlineNLG })
  }, [nlgBaseUrl, nlgApiKey, nlgModel])

  // 仅在 adapter 变化时重建接口对象
  return useMemo(
    (): AIInterface => ({
      generateSentences: async (req: NLGRequest): Promise<NLGResponse> => {
        // 并发拉取：近期对话上下文 + 图库词汇提示（互不依赖）
        const [context, pictogramVocabulary] = await Promise.all([
          buildRecentContext(sessionIdRef.current),
          buildPictogramVocabularyHint(200).catch(() => undefined),
        ])
        const enrichedContext = {
          ...context,
          ...(pictogramVocabulary ? { pictogramVocabulary } : {}),
        }
        return adapter.generateSentences({
          ...req,
          context: Object.keys(enrichedContext).length > 0 ? enrichedContext : undefined,
        })
      },
      speak: (req: TTSRequest): Promise<TTSResult> =>
        adapter.speak({ ...req, voiceName: ttsVoiceNameRef.current || undefined }),
      stopSpeaking: (): void => adapter.stopSpeaking(),
    }),
    [adapter],
  )
}
