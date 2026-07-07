export interface ServerAIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export interface ServerTTSConfig {
  apiKey: string
  baseUrl: string
  model: string
  voice: string
  responseFormat: 'mp3' | 'opus' | 'wav' | 'pcm'
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function defaultTtsModel(baseUrl: string): string {
  return baseUrl.includes('siliconflow')
    ? 'FunAudioLLM/CosyVoice2-0.5B'
    : 'gpt-4o-mini-tts'
}

function defaultTtsVoice(baseUrl: string): string {
  return baseUrl.includes('siliconflow')
    ? 'FunAudioLLM/CosyVoice2-0.5B:anna'
    : 'coral'
}

function parseTtsResponseFormat(value: string): ServerTTSConfig['responseFormat'] {
  return value === 'opus' || value === 'wav' || value === 'pcm' ? value : 'mp3'
}

export function getServerAIConfig(): ServerAIConfig | null {
  const apiKey = process.env.AI_API_KEY?.trim() ?? ''
  if (!apiKey) return null

  const baseUrl = trimTrailingSlash(
    process.env.AI_BASE_URL?.trim() || 'https://api.openai.com/v1',
  )
  const model = process.env.AI_MODEL?.trim() || 'gpt-4o-mini'

  return { apiKey, baseUrl, model }
}

export function getServerTTSConfig(): ServerTTSConfig | null {
  const apiKey = process.env.AI_TTS_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || ''
  if (!apiKey) return null

  const baseUrl = trimTrailingSlash(
    process.env.AI_TTS_BASE_URL?.trim()
      || process.env.AI_BASE_URL?.trim()
      || 'https://api.openai.com/v1',
  )
  const model = process.env.AI_TTS_MODEL?.trim() || defaultTtsModel(baseUrl)
  const voice = process.env.AI_TTS_VOICE?.trim() || defaultTtsVoice(baseUrl)
  const responseFormat = parseTtsResponseFormat(
    process.env.AI_TTS_RESPONSE_FORMAT?.trim() || 'mp3',
  )

  return { apiKey, baseUrl, model, voice, responseFormat }
}
