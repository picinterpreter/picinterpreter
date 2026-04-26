import { NextResponse } from 'next/server'
import { searchRuntimePictograms } from '@/server/pictograms/aac-search'

export const runtime = 'nodejs'

interface SearchBody {
  tokens?: unknown
}

export async function POST(request: Request) {
  let body: SearchBody

  try {
    body = (await request.json()) as SearchBody
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  if (!Array.isArray(body.tokens)) {
    return NextResponse.json(
      { error: { message: 'tokens is required' } },
      { status: 400 },
    )
  }

  const tokens = body.tokens.filter((token): token is string => typeof token === 'string')
  if (tokens.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const results = await searchRuntimePictograms(tokens)
  return NextResponse.json({ results })
}
