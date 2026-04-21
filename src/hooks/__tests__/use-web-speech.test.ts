/**
 * useWebSpeech の純ロジックテスト (pure logic tests).
 *
 * SpeechRecognition is a browser API unavailable in jsdom.
 * We test only the error-message mapping logic extracted here,
 * which mirrors the onerror handler inside use-web-speech.ts.
 */
import { describe, it, expect } from 'vitest'

// ─── Mirror of the onerror message mapping in use-web-speech.ts ─────────── //

type SpeechErrorCode =
  | 'not-allowed'
  | 'no-speech'
  | 'aborted'
  | 'network'
  | 'audio-capture'
  | string

function mapSpeechError(errorCode: SpeechErrorCode): string | null {
  if (errorCode === 'not-allowed') return '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
  if (errorCode === 'no-speech')   return '未检测到语音，请重试'
  if (errorCode === 'aborted')     return null   // deliberate stop, no UI error
  return '语音识别失败，请重试'
}

// ─── tests ───────────────────────────────────────────────────────────────── //

describe('mapSpeechError', () => {
  it('returns permission denied message for not-allowed', () => {
    expect(mapSpeechError('not-allowed')).toContain('麦克风权限')
  })

  it('returns no-speech message', () => {
    expect(mapSpeechError('no-speech')).toContain('未检测到语音')
  })

  it('returns null for aborted (deliberate stop — no error to show)', () => {
    expect(mapSpeechError('aborted')).toBeNull()
  })

  it('returns generic message for unknown error codes', () => {
    expect(mapSpeechError('network')).toContain('语音识别失败')
    expect(mapSpeechError('audio-capture')).toContain('语音识别失败')
    expect(mapSpeechError('service-not-allowed')).toContain('语音识别失败')
  })
})

// ─── availability detection ──────────────────────────────────────────────── //

describe('ASR availability detection', () => {
  it('is unavailable when neither SpeechRecognition nor webkitSpeechRecognition exist', () => {
    // In jsdom test environment, neither API exists
    const available =
      (typeof window !== 'undefined' &&
        (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window))) ??
      false
    expect(available).toBe(false)
  })
})
