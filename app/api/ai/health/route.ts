import { NextResponse } from 'next/server'
import { getServerAIConfig } from '@/server/ai/config'

export const runtime = 'nodejs'

export async function GET() {
  const config = getServerAIConfig()

  return NextResponse.json({
    configured: Boolean(config),
    model: config?.model ?? null,
    baseUrl: config?.baseUrl ?? null,
  })
}
