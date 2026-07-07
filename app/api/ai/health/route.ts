import { NextResponse } from 'next/server'
import { getServerAIConfig, getServerTTSConfig } from '@/server/ai/config'

export const runtime = 'nodejs'

export async function GET() {
  const config = getServerAIConfig()
  const ttsConfig = getServerTTSConfig()

  return NextResponse.json({
    configured: Boolean(config),
    model: config?.model ?? null,
    baseUrl: config?.baseUrl ?? null,
    ttsConfigured: Boolean(ttsConfig),
    ttsModel: ttsConfig?.model ?? null,
  })
}
