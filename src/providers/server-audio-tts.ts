import { shouldUseServerTts } from '@/utils/tts-environment'
import type { TTSProvider, TTSRequest, TTSResult } from '@/types'

export class ServerAudioTTS implements TTSProvider {
  readonly name = 'server-audio'
  private currentAudio: HTMLAudioElement | null = null

  isAvailable(): boolean {
    return typeof window !== 'undefined'
      && typeof Audio !== 'undefined'
      && shouldUseServerTts()
  }

  async speak(req: TTSRequest): Promise<TTSResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: '云端语音不可用',
        provider: this.name,
      }
    }

    this.stop()

    const audio = new Audio()
    this.currentAudio = audio
    audio.preload = 'auto'
    audio.src = this.buildSpeechUrl(req)

    return new Promise((resolve) => {
      let settled = false

      const done = (result: TTSResult) => {
        if (settled) return
        settled = true
        audio.onended = null
        audio.onerror = null
        if (this.currentAudio === audio) {
          this.currentAudio = null
        }
        resolve(result)
      }

      audio.onended = () => done({ success: true, provider: this.name })
      audio.onerror = () => {
        done({
          success: false,
          error: '云端语音生成失败',
          provider: this.name,
        })
      }

      audio.play().catch(() => {
        done({
          success: false,
          error: '语音播放被浏览器拦截',
          provider: this.name,
        })
      })
    })
  }

  stop(): void {
    if (!this.currentAudio) return
    this.currentAudio.pause()
    this.currentAudio.removeAttribute('src')
    this.currentAudio.load()
    this.currentAudio = null
  }

  private buildSpeechUrl(req: TTSRequest): string {
    const params = new URLSearchParams()
    params.set('text', req.text)
    if (typeof req.rate === 'number') {
      params.set('rate', String(req.rate))
    }
    if (req.serverVoiceName) {
      params.set('voice', req.serverVoiceName)
    }
    return `/api/ai/tts?${params.toString()}`
  }
}
