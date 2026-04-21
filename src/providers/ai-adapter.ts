import type {
  NLGProvider,
  NLGRequest,
  NLGResponse,
  TTSProvider,
  TTSRequest,
  TTSResult,
} from '@/types'
import { TemplateNLG } from './template-nlg'
import { WebSpeechTTS } from './web-speech-tts'

export interface AIAdapterConfig {
  onlineNLG?: NLGProvider
  cloudTTS?: TTSProvider
}

/**
 * 统一 AI 调度层。
 * 按优先级尝试在线 provider，失败自动降级到离线兜底。
 */
export class AIAdapter {
  private readonly nlgProviders: NLGProvider[]
  private readonly ttsProviders: TTSProvider[]

  constructor(config: AIAdapterConfig = {}) {
    this.nlgProviders = [
      config.onlineNLG,
      new TemplateNLG(),
    ].filter((p): p is NLGProvider => p != null)

    this.ttsProviders = [
      config.cloudTTS,
      new WebSpeechTTS(),
    ].filter((p): p is TTSProvider => p != null)
  }

  async generateSentences(req: NLGRequest): Promise<NLGResponse> {
    for (const provider of this.nlgProviders) {
      try {
        return await provider.generate(req)
      } catch {
        continue
      }
    }
    // TemplateNLG 不会失败，但防御性兜底
    return {
      candidates: [req.pictogramLabels.join('') + '。'],
      provider: 'emergency-fallback',
      isOfflineFallback: true,
    }
  }

  async speak(req: TTSRequest): Promise<TTSResult> {
    for (const provider of this.ttsProviders) {
      if (!provider.isAvailable()) continue
      try {
        const result = await provider.speak(req)
        if (result.success) return result
      } catch {
        continue
      }
    }
    return {
      success: false,
      error: '没有可用的语音合成服务',
      provider: 'none',
    }
  }

  stopSpeaking(): void {
    for (const provider of this.ttsProviders) {
      provider.stop()
    }
  }
}
