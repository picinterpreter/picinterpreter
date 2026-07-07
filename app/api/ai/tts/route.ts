import { NextResponse } from 'next/server'
import { synthesizeSpeech } from '@/server/ai/text-to-speech'

export const runtime = 'nodejs'

const MAX_TTS_TEXT_LENGTH = 300

interface TTSBody {
  text?: unknown
  rate?: unknown
}

function parseRate(value: unknown): number | undefined {
  const numeric = typeof value === 'string' ? Number(value) : value
  return typeof numeric === 'number' && Number.isFinite(numeric) ? numeric : undefined
}

function validateText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text || text.length > MAX_TTS_TEXT_LENGTH) return null
  return text
}

function audioResponse(audio: Awaited<ReturnType<typeof synthesizeSpeech>>) {
  return new Response(audio.data, {
    headers: {
      'Content-Type': audio.contentType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const text = validateText(url.searchParams.get('text'))

  if (!text) {
    return NextResponse.json(
      { error: { message: 'text is required' } },
      { status: 400 },
    )
  }

  try {
    const audio = await synthesizeSpeech(
      { text, rate: parseRate(url.searchParams.get('rate')) },
      request.signal,
    )
    return audioResponse(audio)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS request failed'
    const status = message.includes('not configured')
      ? 503
      : message.toLowerCase().includes('timeout')
        ? 504
        : 502
    return NextResponse.json({ error: { message } }, { status })
  }
}

export async function POST(request: Request) {
  let body: TTSBody

  try {
    body = (await request.json()) as TTSBody
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const text = validateText(body.text)
  if (!text) {
    return NextResponse.json(
      { error: { message: 'text is required' } },
      { status: 400 },
    )
  }

  try {
    const audio = await synthesizeSpeech(
      { text, rate: parseRate(body.rate) },
      request.signal,
    )
    return audioResponse(audio)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS request failed'
    const status = message.includes('not configured')
      ? 503
      : message.toLowerCase().includes('timeout')
        ? 504
        : 502
    return NextResponse.json({ error: { message } }, { status })
  }
}
