import { db } from '@/db'
import type { PictogramEntry } from '@/types'

interface RuntimePictogramSearchResponse {
  results?: Array<{
    token?: string
    pictogram?: PictogramEntry
  }>
}

function uniqueTokens(tokens: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const token of tokens) {
    const normalized = token.trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

function isPictogramEntry(value: unknown): value is PictogramEntry {
  if (!value || typeof value !== 'object') return false
  const pictogram = value as Partial<PictogramEntry>
  return (
    typeof pictogram.id === 'string' &&
    typeof pictogram.imageUrl === 'string' &&
    typeof pictogram.categoryId === 'string' &&
    Array.isArray(pictogram.labels?.zh) &&
    Array.isArray(pictogram.labels?.en) &&
    Array.isArray(pictogram.synonyms)
  )
}

export async function searchAndStoreMissingPictograms(
  tokens: string[],
  signal?: AbortSignal,
): Promise<PictogramEntry[]> {
  const queryTokens = uniqueTokens(tokens)
  if (queryTokens.length === 0) return []

  const response = await fetch('/api/pictograms/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tokens: queryTokens }),
    signal,
  })

  if (!response.ok) return []

  const data = (await response.json()) as RuntimePictogramSearchResponse
  const pictograms = (data.results ?? [])
    .map((result) => result.pictogram)
    .filter(isPictogramEntry)

  if (pictograms.length === 0) return []

  await db.pictograms.bulkPut(pictograms)
  return pictograms
}
