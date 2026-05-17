import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { findEntry } from '@/data/lexicon'
import type { PictogramEntry, PictogramSequenceItem, PictogramSequenceMatchType } from '@/types'

const ARASAAC_DATA_PATH = path.join(process.cwd(), 'data/arasaac-pictograms.json')
const NEGATION_PREFIXES = ['不', '没', '别', '勿', '莫', '未'] as const

const LOCAL_NORMALIZATIONS: Record<string, string[]> = {
  热热: ['加热'],
  热一下: ['加热'],
  加热一下: ['加热'],
  温一下: ['加热'],
  热一热: ['加热'],
  冷藏: ['放进冰箱', '冰箱'],
  冰柜: ['冰箱'],
  冷冻箱: ['冰箱'],
  喝掉: ['喝'],
  饮用: ['喝'],
}

interface ArasaacExport {
  metadata?: {
    count?: number
  }
  records?: ArasaacRecord[]
}

export interface ArasaacRecord {
  id: number
  chineseName?: string
  englishName?: string
  displayNameZhFallback?: string
  imageUrl300?: string
  imageUrl500?: string
  arasaacUrlZh?: string
  arasaacUrlEn?: string
  categoriesZh?: string[]
  categoriesEn?: string[]
  tagsZh?: string[]
  tagsEn?: string[]
  chineseKeywords?: string[]
  englishKeywords?: string[]
}

interface IndexedRecord {
  record: ArasaacRecord
  zhNames: string[]
  enNames: string[]
  categories: string[]
  tags: string[]
  searchTerms: string[]
}

export interface ArasaacIndex {
  records: IndexedRecord[]
  search(token: string): PictogramSequenceItem
}

interface ScoredMatch {
  record: IndexedRecord
  normalizedToken: string
  matchType: PictogramSequenceMatchType
  confidence: number
}

let indexPromise: Promise<ArasaacIndex> | null = null

function normalizeTerm(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[\s,，。？！!?、；;："“”‘’'()（）[\]【】]+|[\s,，。？！!?、；;："“”‘’'()（）[\]【】]+$/g, '')
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = normalizeTerm(value ?? '')
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

function isSafeForContainedMatch(token: string): boolean {
  if (token.length < 3) return false
  return !NEGATION_PREFIXES.some((prefix) => token.startsWith(prefix))
}

function getCandidateTokens(token: string): Array<{ value: string, isNormalized: boolean }> {
  const normalized = normalizeTerm(token)
  const candidates: Array<{ value: string, isNormalized: boolean }> = []
  const seen = new Set<string>()

  function add(value: string, isNormalized: boolean) {
    const clean = normalizeTerm(value)
    if (!clean || seen.has(clean)) return
    seen.add(clean)
    candidates.push({ value: clean, isNormalized })
  }

  add(normalized, false)

  const lexiconEntry = findEntry(normalized)
  if (lexiconEntry && lexiconEntry.zh !== normalized) {
    add(lexiconEntry.zh, true)
  }

  for (const mapped of LOCAL_NORMALIZATIONS[normalized] ?? []) {
    add(mapped, true)
  }

  return candidates
}

function categoryFromRecord(record: IndexedRecord): PictogramEntry['categoryId'] {
  const terms = [...record.categories, ...record.tags, ...record.enNames].join(' ').toLowerCase()

  if (/\bverb\b|usual verbs|movement|routine|action/.test(terms)) return 'actions'
  if (/\bfood\b|feeding|beverage|gastronomy|cookery|meat|soup|fruit|vegetable/.test(terms)) return 'food'
  if (/health|medicine|medical|body sensation|physiotherapy/.test(terms)) return 'medical'
  if (/person|professional|family|people/.test(terms)) return 'people'
  if (/object|appliance|utensil|household|clothes|material/.test(terms)) return 'objects'
  if (/place|building|room|home|monument|school|hospital/.test(terms)) return 'places'
  if (/time|unit of time|calendar/.test(terms)) return 'time'
  if (/animal|bird|insect|fish|mammal|reptile/.test(terms)) return 'animals'
  if (/colour|color/.test(terms)) return 'colors'

  return 'daily'
}

function toPictogramEntry(indexed: IndexedRecord): PictogramEntry {
  const record = indexed.record
  const zhLabels = uniqueStrings([
    record.chineseName,
    record.displayNameZhFallback,
    ...(record.chineseKeywords ?? []),
  ])
  const enLabels = uniqueStrings([
    record.englishName,
    ...(record.englishKeywords ?? []),
  ])

  return {
    id: `arasaac_${record.id}`,
    imageUrl: record.imageUrl500 || record.imageUrl300 || '',
    labels: {
      zh: zhLabels.length > 0 ? zhLabels : [`ARASAAC ${record.id}`],
      en: enLabels,
    },
    categoryId: categoryFromRecord(indexed),
    synonyms: zhLabels.slice(1),
    disambiguationHints: {},
    source: {
      provider: 'arasaac',
      name: 'ARASAAC',
      originalId: String(record.id),
      license: 'CC BY-NC-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      author: 'Sergio Palao',
      authorUrl: 'https://arasaac.org/',
      sourceUrl: record.arasaacUrlZh || record.arasaacUrlEn || 'https://arasaac.org/',
      repoKey: 'arasaac',
    },
    usageCount: 0,
  }
}

export function arasaacRecordToPictogramEntry(record: ArasaacRecord): PictogramEntry {
  return toPictogramEntry(indexRecord(record))
}

function indexRecord(record: ArasaacRecord): IndexedRecord {
  const zhNames = uniqueStrings([
    record.chineseName,
    record.displayNameZhFallback,
    ...(record.chineseKeywords ?? []),
  ])
  const enNames = uniqueStrings([
    record.englishName,
    ...(record.englishKeywords ?? []),
  ])
  const categories = uniqueStrings([...(record.categoriesZh ?? []), ...(record.categoriesEn ?? [])])
  const tags = uniqueStrings([...(record.tagsZh ?? []), ...(record.tagsEn ?? [])])

  return {
    record,
    zhNames,
    enNames,
    categories,
    tags,
    searchTerms: uniqueStrings([...zhNames, ...enNames, ...categories, ...tags]),
  }
}

function scoreRecord(indexed: IndexedRecord, token: string, isNormalized: boolean): ScoredMatch | null {
  const normalizedToken = normalizeTerm(token)
  if (!normalizedToken) return null

  const exactName = indexed.zhNames.some((term) => term === normalizedToken)
  if (exactName) {
    return {
      record: indexed,
      normalizedToken,
      matchType: isNormalized ? 'ai-normalized' : 'exact',
      confidence: isNormalized ? 0.93 : 1,
    }
  }

  const exactKeyword = indexed.searchTerms.some((term) => term === normalizedToken)
  if (exactKeyword) {
    return {
      record: indexed,
      normalizedToken,
      matchType: isNormalized ? 'ai-normalized' : 'keyword',
      confidence: isNormalized ? 0.9 : 0.96,
    }
  }

  const canContain = isSafeForContainedMatch(normalizedToken)
  if (!canContain) return null

  const containedName = indexed.zhNames
    .filter((term) => term.length >= 2 && (term.includes(normalizedToken) || normalizedToken.includes(term)))
    .sort((a, b) => b.length - a.length)[0]

  if (containedName) {
    return {
      record: indexed,
      normalizedToken: containedName,
      matchType: isNormalized ? 'ai-normalized' : 'synonym',
      confidence: isNormalized ? 0.76 : 0.8,
    }
  }

  return null
}

function betterMatch(a: ScoredMatch | null, b: ScoredMatch | null): ScoredMatch | null {
  if (!a) return b
  if (!b) return a
  if (b.confidence !== a.confidence) return b.confidence > a.confidence ? b : a
  const aLen = a.record.zhNames[0]?.length ?? 0
  const bLen = b.record.zhNames[0]?.length ?? 0
  return bLen > aLen ? b : a
}

export function createArasaacIndex(records: ArasaacRecord[]): ArasaacIndex {
  const byId = new Map<number, ArasaacRecord>()
  for (const record of records) {
    if (!Number.isFinite(record.id) || byId.has(record.id)) continue
    byId.set(record.id, record)
  }

  const indexedRecords = Array.from(byId.values()).map(indexRecord)

  return {
    records: indexedRecords,
    search(token: string) {
      const originalToken = normalizeTerm(token)
      let best: ScoredMatch | null = null

      for (const candidate of getCandidateTokens(originalToken)) {
        for (const indexed of indexedRecords) {
          best = betterMatch(best, scoreRecord(indexed, candidate.value, candidate.isNormalized))
        }
      }

      if (!best) {
        return {
          token: originalToken,
          normalizedToken: originalToken,
          pictogram: null,
          matchType: 'none',
          confidence: 0,
        }
      }

      return {
        token: originalToken,
        normalizedToken: best.normalizedToken,
        pictogram: toPictogramEntry(best.record),
        matchType: best.matchType,
        confidence: best.confidence,
      }
    },
  }
}

export async function loadArasaacRecords(filePath = ARASAAC_DATA_PATH): Promise<ArasaacRecord[]> {
  const raw = await readFile(filePath, 'utf8')
  const data = JSON.parse(raw) as ArasaacExport
  return Array.isArray(data.records) ? data.records : []
}

export async function getArasaacIndex(): Promise<ArasaacIndex> {
  indexPromise ??= loadArasaacRecords().then(createArasaacIndex).catch((error) => {
    indexPromise = null
    throw error
  })
  return indexPromise
}
