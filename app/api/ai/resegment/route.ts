import { NextResponse } from 'next/server'
import { resegmentText } from '@/server/ai/openai-compatible'

export const runtime = 'nodejs'

interface ResegmentBody {
  text: string
  unmatchedTokens?: string[]
}

export async function POST(request: Request) {
  let body: ResegmentBody

  try {
    body = (await request.json()) as ResegmentBody
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  if (typeof body.text !== 'string' || body.text.trim().length === 0) {
    return NextResponse.json(
      { error: { message: 'text is required' } },
      { status: 400 },
    )
  }

  const tokens = await resegmentText(
    {
      text: body.text,
      unmatchedTokens: Array.isArray(body.unmatchedTokens) ? body.unmatchedTokens : [],
    },
    request.signal,
  )

  return NextResponse.json({ tokens })
}
