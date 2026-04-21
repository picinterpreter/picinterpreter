import type { TTSProvider, TTSRequest, TTSResult } from '@/types'

/** Chrome / some Android 合成卡死的兜底超时 (ms) */
const SPEAK_TIMEOUT_MS = 12_000

/**
 * Web Speech API TTS — best-effort 离线兜底。
 * 可用性取决于浏览器和操作系统。
 *
 * 改进：
 *  - 自动挑选最佳中文语音（优先 localService 高质量语音）
 *  - 加超时保护，防止 Chrome 后台 tab 时 onend 永远不触发
 */
export class WebSpeechTTS implements TTSProvider {
  readonly name = 'web-speech'

  isAvailable(): boolean {
    return 'speechSynthesis' in window
  }

  /**
   * 从已加载的语音列表中挑选最匹配的语言。
   * 优先顺序：完整匹配(zh-CN) > 根语言匹配(zh-*) > 任意匹配
   * 同优先级内：localService(离线高质量) > 远程语音
   */
  private getBestVoice(lang: string): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) return null

    const target = lang.toLowerCase()
    const root   = target.split('-')[0]   // e.g. 'zh'

    const exact   = voices.filter((v) => v.lang.toLowerCase() === target)
    const partial = voices.filter((v) => {
      const vl = v.lang.toLowerCase()
      return vl !== target && (vl.startsWith(root + '-') || vl === root)
    })

    for (const pool of [exact, partial]) {
      if (pool.length === 0) continue
      const local = pool.find((v) => v.localService)
      return local ?? pool[0]
    }
    return null
  }

  async speak(req: TTSRequest): Promise<TTSResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: '当前浏览器不支持语音合成',
        provider: this.name,
      }
    }

    return new Promise((resolve) => {
      const utterance  = new SpeechSynthesisUtterance(req.text)
      const lang       = req.lang ?? 'zh-CN'
      utterance.lang   = lang
      utterance.rate   = req.rate ?? 0.9

      // 挑选语音：优先使用用户指定的语音，否则自动选最佳中文语音
      const preferredVoice = req.voiceName
        ? window.speechSynthesis.getVoices().find((v) => v.name === req.voiceName) ?? null
        : null
      const bestVoice = preferredVoice ?? this.getBestVoice(lang)
      if (bestVoice) utterance.voice = bestVoice

      let settled = false
      const done = (result: TTSResult) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }

      // 超时保护：Chrome 后台 tab / 某些 Android 机型 onend 不触发
      const timer = setTimeout(() => {
        window.speechSynthesis.cancel()
        done({ success: true, provider: this.name })   // 视为正常完成
      }, SPEAK_TIMEOUT_MS)

      utterance.onend = () => done({ success: true, provider: this.name })

      utterance.onerror = (event) => {
        // 'interrupted' 是主动 cancel 造成的，不算错误
        if (event.error === 'interrupted') {
          done({ success: true, provider: this.name })
        } else {
          done({
            success: false,
            error: `语音合成失败: ${event.error}`,
            provider: this.name,
          })
        }
      }

      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    })
  }

  stop(): void {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel()
    }
  }
}
