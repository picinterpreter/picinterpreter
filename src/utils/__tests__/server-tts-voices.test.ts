import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SERVER_TTS_VOICE_NAME,
  getServerPresetVoiceName,
  resolveServerTtsVoiceName,
} from '@/utils/server-tts-voices'

describe('server TTS voices', () => {
  it('uses Claire as the default cloud voice', () => {
    expect(DEFAULT_SERVER_TTS_VOICE_NAME).toBe('FunAudioLLM/CosyVoice2-0.5B:claire')
  })

  it('resolves blank values to the default cloud voice', () => {
    expect(resolveServerTtsVoiceName('')).toBe(DEFAULT_SERVER_TTS_VOICE_NAME)
    expect(resolveServerTtsVoiceName('   ')).toBe(DEFAULT_SERVER_TTS_VOICE_NAME)
    expect(resolveServerTtsVoiceName(undefined)).toBe(DEFAULT_SERVER_TTS_VOICE_NAME)
  })

  it('keeps explicit cloud voice values', () => {
    expect(resolveServerTtsVoiceName(getServerPresetVoiceName('alex'))).toBe(
      'FunAudioLLM/CosyVoice2-0.5B:alex',
    )
  })
})
