/**
 * useAI — 统一 AI 能力 hook
 *
 * 返回一个稳定的接口对象，内部：
 *   - 通过 Next.js 后端调用服务端 AI 接口
 *   - generateSentences 自动拉取近期对话上下文并注入请求体
 *   - speak / stopSpeaking 透传 WebSpeechTTS
 */

import { useMemo, useRef } from 'react'
import { AIAdapter } from '@/providers/ai-adapter'
import { ServerNLG } from '@/providers/server-nlg'
import { useSettingsStore } from '@/stores/settings-store'
import { useConversationStore } from '@/stores/conversation-store'
import { buildRecentContext } from '@/utils/nlg-context'
import type { NLGRequest, NLGResponse, TTSRequest, TTSResult } from '@/types'

export interface AIInterface {
  generateSentences(req: NLGRequest): Promise<NLGResponse>
  speak(req: TTSRequest): Promise<TTSResult>
  stopSpeaking(): void
}

export function useAI(): AIInterface {
  const ttsVoiceName = useSettingsStore((s) => s.ttsVoiceName)
  const sessionId = useConversationStore((s) => s.sessionId)

  // sessionId 用 ref 追踪，避免 adapter 重建触发重新渲染
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

  const ttsVoiceNameRef = useRef(ttsVoiceName)
  ttsVoiceNameRef.current = ttsVoiceName

  const adapter = useMemo(() => new AIAdapter({ onlineNLG: new ServerNLG() }), [])

  // 仅在 adapter 变化时重建接口对象
  return useMemo(
    (): AIInterface => ({
      generateSentences: async (req: NLGRequest): Promise<NLGResponse> => {
        const context = (await buildRecentContext(sessionIdRef.current)) ?? {}
        return adapter.generateSentences({
          ...req,
          context: Object.keys(context).length > 0 ? context : undefined,
        })
      },
      speak: (req: TTSRequest): Promise<TTSResult> =>
        adapter.speak({ ...req, voiceName: ttsVoiceNameRef.current || undefined }),
      stopSpeaking: (): void => adapter.stopSpeaking(),
    }),
    [adapter],
  )
}
