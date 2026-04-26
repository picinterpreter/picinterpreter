import { createHash } from 'node:crypto'
import { findEntry, getEnglishFallback } from '@/data/lexicon'
import type { PictogramEntry, PictogramSource } from '@/types'

const ARASAAC_API = 'https://api.arasaac.org/v1'
const ARASAAC_STATIC = 'https://static.arasaac.org/pictograms'
const OPENSYMBOLS_API = 'https://www.opensymbols.org'
const REQUEST_TIMEOUT_MS = 8000
const MAX_QUERY_TOKENS = 12
const OPENSYMBOLS_ALLOWED_REPOS = new Set(['arasaac', 'mulberry', 'sclera'])

const SKIP_TOKENS = new Set([
  '，',
  '。',
  '！',
  '？',
  ',',
  '.',
  '!',
  '?',
  '、',
  '的',
  '了',
  '吗',
  '呢',
  '啊',
  '呀',
])

interface ArasaacApiItem {
  _id?: number
  id?: number
}

interface OpenSymbolsTokenResponse {
  access_token?: string
}

interface OpenSymbolsItem {
  id?: number
  symbol_key?: string
  name?: string
  locale?: string
  license?: string
  license_url?: string | null
  author?: string | null
  author_url?: string | null
  source_url?: string | null
  repo_key?: string | null
  image_url?: string
  details_url?: string
}

export interface RuntimePictogramSearchResult {
  token: string
  pictogram: PictogramEntry
}

function normalizeToken(token: string): string | null {
  const normalized = token.trim().replace(/^[\s,，。？！!?、]+|[\s,，。？！!?、]+$/g, '')
  if (!normalized || SKIP_TOKENS.has(normalized)) return null
  if (normalized.length > 24) return null
  return normalized
}

function uniqueTokens(tokens: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const token of tokens) {
    const normalized = normalizeToken(token)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
    if (result.length >= MAX_QUERY_TOKENS) break
  }

  return result
}

function stableId(provider: PictogramSource['provider'], originalId: string, token: string): string {
  const hash = createHash('sha1')
    .update(`${provider}:${originalId}:${token}`)
    .digest('hex')
    .slice(0, 12)
  return `runtime_${provider}_${hash}`
}

function buildEntry(params: {
  provider: PictogramSource['provider']
  token: string
  originalId: string
  imageUrl: string
  source: Omit<PictogramSource, 'provider' | 'originalId'>
  enLabel?: string
}): PictogramEntry {
  const entry = findEntry(params.token)
  const zhLabel = entry?.zh ?? params.token
  const synonyms = new Set<string>(entry?.synonyms ?? [])
  if (zhLabel !== params.token) synonyms.add(params.token)

  return {
    id: stableId(params.provider, params.originalId, zhLabel),
    imageUrl: params.imageUrl,
    labels: {
      zh: [zhLabel],
      en: [params.enLabel ?? entry?.en ?? ''].filter((label) => label.length > 0),
    },
    categoryId: entry?.category ?? 'daily',
    synonyms: Array.from(synonyms),
    disambiguationHints: {},
    source: {
      provider: params.provider,
      originalId: params.originalId,
      ...params.source,
    },
    usageCount: 0,
    lastUsedAt: Date.now(),
  }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    if (!response.ok) return null
    return response.json() as Promise<T>
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function searchArasaacLocale(originalToken: string, query: string, locale: 'zh' | 'en') {
  const url = `${ARASAAC_API}/pictograms/${locale}/search/${encodeURIComponent(query)}`
  const data = await fetchJsonWithTimeout<ArasaacApiItem[]>(url)
  if (!Array.isArray(data) || data.length === 0) return null

  const id = data[0]._id ?? data[0].id
  if (!id) return null

  return buildEntry({
    provider: 'arasaac',
    token: originalToken,
    originalId: String(id),
    imageUrl: `${ARASAAC_STATIC}/${id}/${id}_300.png`,
    source: {
      name: 'ARASAAC',
      license: 'CC BY-NC-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      author: 'Sergio Palao',
      authorUrl: 'https://arasaac.org/',
      sourceUrl: 'https://arasaac.org/',
      repoKey: 'arasaac',
    },
    enLabel: locale === 'en' ? query : getEnglishFallback(originalToken),
  })
}

async function searchArasaac(token: string): Promise<PictogramEntry | null> {
  const zhResult = await searchArasaacLocale(token, token, 'zh')
  if (zhResult) return zhResult

  const enFallback = getEnglishFallback(token)
  if (!enFallback) return null

  return searchArasaacLocale(token, enFallback, 'en')
}

async function getOpenSymbolsAccessToken(): Promise<string | null> {
  const secret = process.env.OPENSYMBOLS_SECRET?.trim()
  if (!secret) return null

  const url = `${OPENSYMBOLS_API}/api/v2/token?secret=${encodeURIComponent(secret)}`
  const data = await fetchJsonWithTimeout<OpenSymbolsTokenResponse>(url, { method: 'POST' })
  return data?.access_token ?? null
}

async function searchOpenSymbolsLocale(
  originalToken: string,
  query: string,
  locale: 'zh' | 'en',
  accessToken: string,
): Promise<PictogramEntry | null> {
  const url = new URL('/api/v2/symbols', OPENSYMBOLS_API)
  url.searchParams.set('q', query)
  url.searchParams.set('locale', locale)
  url.searchParams.set('safe', '1')

  const data = await fetchJsonWithTimeout<OpenSymbolsItem[]>(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!Array.isArray(data) || data.length === 0) return null

  const hit = data.find((item) =>
    item.image_url &&
    typeof item.repo_key === 'string' &&
    OPENSYMBOLS_ALLOWED_REPOS.has(item.repo_key),
  ) ?? null
  if (!hit?.image_url) return null

  const originalId = hit.symbol_key ?? String(hit.id ?? hit.image_url)
  const detailsUrl = hit.details_url?.startsWith('http')
    ? hit.details_url
    : hit.details_url
      ? `${OPENSYMBOLS_API}${hit.details_url}`
      : hit.source_url ?? OPENSYMBOLS_API

  return buildEntry({
    provider: 'opensymbols',
    token: originalToken,
    originalId,
    imageUrl: hit.image_url,
    source: {
      name: `OpenSymbols${hit.repo_key ? ` / ${hit.repo_key}` : ''}`,
      license: hit.license ?? 'Open license',
      licenseUrl: hit.license_url ?? null,
      author: hit.author ?? null,
      authorUrl: hit.author_url ?? null,
      sourceUrl: detailsUrl,
      repoKey: hit.repo_key ?? null,
    },
    enLabel: locale === 'en' ? hit.name ?? query : getEnglishFallback(originalToken),
  })
}

async function searchOpenSymbols(token: string): Promise<PictogramEntry | null> {
  const accessToken = await getOpenSymbolsAccessToken()
  if (!accessToken) return null

  const zhResult = await searchOpenSymbolsLocale(token, token, 'zh', accessToken)
  if (zhResult) return zhResult

  const enFallback = getEnglishFallback(token) ?? token
  if (enFallback === token) return searchOpenSymbolsLocale(token, token, 'en', accessToken)

  return searchOpenSymbolsLocale(token, enFallback, 'en', accessToken)
}

async function searchOne(token: string): Promise<PictogramEntry | null> {
  return (await searchArasaac(token)) ?? (await searchOpenSymbols(token))
}

export async function searchRuntimePictograms(tokens: string[]): Promise<RuntimePictogramSearchResult[]> {
  const queryTokens = uniqueTokens(tokens)
  const results: RuntimePictogramSearchResult[] = []

  for (const token of queryTokens) {
    const pictogram = await searchOne(token)
    if (pictogram) {
      results.push({ token, pictogram })
    }
  }

  return results
}
