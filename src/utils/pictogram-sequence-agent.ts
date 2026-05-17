import type { PictogramEntry, PictogramSequenceResponse } from '@/types'

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

function isPictogramSequenceResponse(value: unknown): value is PictogramSequenceResponse {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<PictogramSequenceResponse>
  return (
    Array.isArray(result.items) &&
    Array.isArray(result.missingTokens) &&
    typeof result.attempts === 'number'
  )
}

export function pictogramsFromSequenceResult(result: PictogramSequenceResponse): PictogramEntry[] {
  const byId = new Map<string, PictogramEntry>()

  for (const item of result.items) {
    if (item.pictogram && isPictogramEntry(item.pictogram)) {
      byId.set(item.pictogram.id, item.pictogram)
    }
  }

  return Array.from(byId.values())
}

export async function requestPictogramSequence(
  text: string,
  signal?: AbortSignal,
): Promise<PictogramSequenceResponse | null> {
  try {
    const response = await fetch('/api/ai/pictogram-sequence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal,
    })

    if (!response.ok) return null

    const data = await response.json() as unknown
    if (!isPictogramSequenceResponse(data)) return null

    return data
  } catch {
    return null
  }
}
