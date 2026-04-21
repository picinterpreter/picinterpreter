/**
 * ARASAAC 图片搜索 Provider。
 *
 * 用途：导入工具 / 补图工具，不作为离线核心运行时。
 * 搜索策略（来自 PicInterpreter v4.2 踩坑经验）：
 *   1. 先用中文在 ARASAAC 中文库搜
 *   2. 没结果 → 用 lexicon.ts 的英文 fallback 搜英文库
 *   3. 还是没结果 → 返回 null
 *
 * 所有超时都用 AbortController，不使用非标准的 fetch timeout。
 */

import { getEnglishFallback } from '@/data/lexicon'

const ARASAAC_API = 'https://api.arasaac.org/v1'
const ARASAAC_STATIC = 'https://static.arasaac.org/pictograms'
const REQUEST_TIMEOUT_MS = 8000

export interface ArasaacResult {
  /** ARASAAC 图片 ID */
  pictogramId: number
  /** 图片 URL (300px) */
  imageUrl: string
  /** 实际搜索的关键词 */
  searchedWord: string
  /** 搜索使用的语言 */
  searchedLocale: 'zh' | 'en'
}

async function fetchWithTimeout(url: string, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

async function searchArasaac(word: string, locale: 'zh' | 'en'): Promise<ArasaacResult | null> {
  try {
    const url = `${ARASAAC_API}/pictograms/${locale}/search/${encodeURIComponent(word)}`
    const response = await fetchWithTimeout(url)

    if (!response.ok) return null

    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const id = data[0]._id as number
    return {
      pictogramId: id,
      imageUrl: `${ARASAAC_STATIC}/${id}/${id}_300.png`,
      searchedWord: word,
      searchedLocale: locale,
    }
  } catch {
    return null
  }
}

/**
 * 搜索 ARASAAC 图片。
 *
 * @param zhWord 中文词
 * @returns 图片元数据，或 null
 */
export async function searchPictogram(zhWord: string): Promise<ArasaacResult | null> {
  // Step 1: 中文库搜索
  const zhResult = await searchArasaac(zhWord, 'zh')
  if (zhResult) return zhResult

  // Step 2: 英文 fallback
  const enWord = getEnglishFallback(zhWord)
  if (enWord) {
    const enResult = await searchArasaac(enWord, 'en')
    if (enResult) return enResult
  }

  return null
}

/**
 * 批量搜索并下载图片元数据。
 * 用于生成种子数据或补充图库。
 *
 * @param words 中文词列表
 * @param onProgress 进度回调
 * @returns 搜索结果映射
 */
export async function batchSearchPictograms(
  words: string[],
  onProgress?: (done: number, total: number, current: string) => void,
): Promise<Map<string, ArasaacResult | null>> {
  const results = new Map<string, ArasaacResult | null>()

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    onProgress?.(i, words.length, word)

    const result = await searchPictogram(word)
    results.set(word, result)

    // ARASAAC API 限流保护：每次请求间隔 200ms
    if (i < words.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  onProgress?.(words.length, words.length, 'done')
  return results
}
