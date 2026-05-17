import { NextResponse } from 'next/server'
import { buildPictogramSequence } from '@/server/ai/pictogram-sequence'

export const runtime = 'nodejs'

interface PictogramSequenceBody {
  text?: unknown
}

export async function POST(request: Request) {
  let body: PictogramSequenceBody

  try {
    body = (await request.json()) as PictogramSequenceBody
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

  try {
    const result = await buildPictogramSequence(body.text.trim(), {
      signal: request.signal,
    })

    if (!result) {
      return NextResponse.json(
        { error: { message: 'pictogram sequence unavailable' } },
        { status: 503 },
      )
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: { message: 'pictogram sequence failed' } },
      { status: 502 },
    )
  }
}
