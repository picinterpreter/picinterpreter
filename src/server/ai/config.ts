export interface ServerAIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
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
