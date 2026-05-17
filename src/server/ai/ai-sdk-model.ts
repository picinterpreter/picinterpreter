import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import { getServerAIConfig } from './config'

export function getServerAISDKModel(): LanguageModel | null {
  const config = getServerAIConfig()
  if (!config) return null

  const provider = createOpenAICompatible({
    name: 'openai-compatible',
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  })

  return provider.chatModel(config.model)
}
