import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { PictogramEntry } from '@/types'

const MAX_VOCAB_CHARS = 1500

const vocabularyPromises = new Map<number, Promise<string>>()

async function loadSeedPictograms(): Promise<PictogramEntry[]> {
  const filePath = path.join(process.cwd(), 'public/seed/pictograms.json')
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw) as PictogramEntry[]
}

async function buildVocabulary(limit = 400): Promise<string> {
  const pictograms = await loadSeedPictograms()
  const sorted = [...pictograms].sort((a, b) => b.usageCount - a.usageCount).slice(0, limit)

  const seen = new Set<string>()
  const parts: string[] = []
  let total = 0

  for (const pictogram of sorted) {
    const label = pictogram.labels?.zh?.[0]?.trim()
    if (!label || seen.has(label)) continue
    if (total + label.length + 1 > MAX_VOCAB_CHARS) break
    seen.add(label)
    parts.push(label)
    total += label.length + 1
  }

  return parts.join('、')
}

export function getPictogramVocabularyHint(limit = 400): Promise<string> {
  const cached = vocabularyPromises.get(limit)
  if (cached) return cached

  const promise = buildVocabulary(limit).catch((error) => {
    vocabularyPromises.delete(limit)
    throw error
  })
  vocabularyPromises.set(limit, promise)

  return promise
}
