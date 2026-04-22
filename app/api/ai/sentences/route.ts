import { NextResponse } from 'next/server'
import { generateSentenceCandidates } from '@/server/ai/openai-compatible'
import type { NLGRequest } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: NLGRequest

  try {
    body = (await request.json()) as NLGRequest
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  if (!Array.isArray(body.pictogramLabels) || body.pictogramLabels.length === 0) {
    return NextResponse.json(
      { error: { message: 'pictogramLabels is required' } },
      { status: 400 },
    )
  }

  try {
    const result = await generateSentenceCandidates(body, request.signal)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed'
    const status = message.includes('not configured')
      ? 503
      : message.toLowerCase().includes('timeout')
        ? 504
        : 502
    return NextResponse.json({ error: { message } }, { status })
  }
}
