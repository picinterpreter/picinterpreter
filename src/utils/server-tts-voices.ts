export const SERVER_TTS_MODEL = 'FunAudioLLM/CosyVoice2-0.5B'

export const SERVER_TTS_VOICE_OPTIONS = [
  { id: 'anna', label: 'Anna', desc: '稳重女声' },
  { id: 'bella', label: 'Bella', desc: '热情女声' },
  { id: 'claire', label: 'Claire', desc: '温柔女声' },
  { id: 'diana', label: 'Diana', desc: '活泼女声' },
  { id: 'alex', label: 'Alex', desc: '稳重男声' },
  { id: 'benjamin', label: 'Benjamin', desc: '低沉男声' },
  { id: 'charles', label: 'Charles', desc: '磁性男声' },
  { id: 'david', label: 'David', desc: '活泼男声' },
] as const

export function getServerPresetVoiceName(id: string) {
  return `${SERVER_TTS_MODEL}:${id}`
}

export const DEFAULT_SERVER_TTS_VOICE_NAME = getServerPresetVoiceName('claire')

export function resolveServerTtsVoiceName(voiceName: string | null | undefined) {
  const trimmed = voiceName?.trim()
  return trimmed || DEFAULT_SERVER_TTS_VOICE_NAME
}
