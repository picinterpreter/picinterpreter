import { describe, expect, it } from 'vitest'
import { isWeChatWebView, shouldUseServerTts, shouldUseWebSpeechRecognition } from '@/utils/tts-environment'

describe('tts-environment', () => {
  it('detects WeChat webviews', () => {
    expect(isWeChatWebView('Mozilla/5.0 MicroMessenger/8.0.49')).toBe(true)
  })

  it('does not match regular browsers', () => {
    expect(isWeChatWebView('Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36')).toBe(false)
  })

  it('uses server TTS in WeChat webviews only', () => {
    expect(shouldUseServerTts('Mozilla/5.0 MicroMessenger/8.0.49')).toBe(true)
    expect(shouldUseServerTts('Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36')).toBe(false)
  })

  it('does not use Web Speech recognition in WeChat webviews', () => {
    expect(shouldUseWebSpeechRecognition('Mozilla/5.0 MicroMessenger/8.0.49')).toBe(false)
    expect(shouldUseWebSpeechRecognition('Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36')).toBe(true)
  })
})
