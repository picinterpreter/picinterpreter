/**
 * ARASAAC API 实时可行性验证脚本
 *
 * 验证三件事：
 * 1. 中文语言支持：/pictograms/zh/search/<词> 是否返回正确结果
 * 2. 消歧问题：搜索 "开心" 是否命中正确的情绪图而非 "开心果"
 * 3. 英文 fallback：中文命中率不够时英文搜索是否补回
 *
 * 运行方式：
 *   node --experimental-strip-types scripts/test-arasaac-api.mts
 *   或
 *   npx tsx scripts/test-arasaac-api.mts
 */

const ARASAAC_API = 'https://api.arasaac.org/v1'
const TIMEOUT_MS  = 8000

interface ArasaacPictogram {
  _id: number
  keywords?: { keyword: string; type: number; hasLocution: boolean }[]
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function searchZh(word: string): Promise<ArasaacPictogram[]> {
  const url = `${ARASAAC_API}/pictograms/zh/search/${encodeURIComponent(word)}`
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function searchEn(word: string): Promise<ArasaacPictogram[]> {
  const url = `${ARASAAC_API}/pictograms/en/search/${encodeURIComponent(word)}`
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function imageUrl(id: number): string {
  return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`
}

// ─── 测试用例 ─────────────────────────────────────────────────────────────── //

interface TestCase {
  zhWord: string
  enFallback?: string
  /**
   * 第一条结果的 keyword 不应包含此文本（用于检测消歧失败）。
   * 不区分大小写，可以是中文或英文。
   */
  forbiddenKeyword?: string
  /**
   * 期望 keyword 包含的文本（中文或英文均可）。
   * 仅当 API 返回结果时检查；中文搜索优先用中文期望值。
   */
  expectedKeyword?: string
}

const TEST_CASES: TestCase[] = [
  // 情感词 — 消歧核心案例
  // 【关键测试】"开心果"（pistachio）是已知的消歧失败案例
  { zhWord: '开心',  enFallback: 'happy',    forbiddenKeyword: '开心果' },
  { zhWord: '伤心',  enFallback: 'sad' },
  { zhWord: '害怕',  enFallback: 'afraid',   expectedKeyword: '害怕' },
  // 动作词
  { zhWord: '吃饭',  enFallback: 'eat',      expectedKeyword: '吃' },
  { zhWord: '喝水',  enFallback: 'drink' },
  { zhWord: '睡觉',  enFallback: 'sleep',    expectedKeyword: '睡觉' },
  // 身体 / 医疗
  { zhWord: '疼',    enFallback: 'pain' },
  { zhWord: '发烧',  enFallback: 'fever',    expectedKeyword: '发烧' },
  // 日常沟通
  { zhWord: '我',    enFallback: 'I',        expectedKeyword: '我' },
  { zhWord: '谢谢',  enFallback: 'thank you', expectedKeyword: '谢谢' },
]

// ─── 执行 ─────────────────────────────────────────────────────────────────── //

const OK   = '✓'
const FAIL = '✗'
const WARN = '△'

let passed = 0, warned = 0, failed = 0

console.log('\n=== ARASAAC API 中文支持验证 ===\n')

for (const tc of TEST_CASES) {
  process.stdout.write(`  ${tc.zhWord.padEnd(5)}  zh: `)

  const zhResults = await searchZh(tc.zhWord)

  if (zhResults.length === 0) {
    // 中文搜索无结果，尝试英文 fallback
    const enResults = tc.enFallback ? await searchEn(tc.enFallback) : []
    if (enResults.length > 0) {
      const id = enResults[0]._id
      const kw = enResults[0].keywords?.[0]?.keyword ?? '(no keyword)'
      console.log(`[无结果]  en fallback "${tc.enFallback}" → id=${id}  ${WARN} kw="${kw}"`)
      warned++
    } else {
      console.log(`[无结果]  en fallback 也无结果  ${FAIL}`)
      failed++
    }
    continue
  }

  const top = zhResults[0]
  const topKw = (top.keywords?.[0]?.keyword ?? '').toLowerCase()
  const id = top._id

  // 检查 forbiddenKeyword（消歧失败判定）
  if (tc.forbiddenKeyword && topKw.includes(tc.forbiddenKeyword.toLowerCase())) {
    console.log(`id=${id}  ${FAIL}  keyword="${topKw}" 包含禁止词 "${tc.forbiddenKeyword}"`)
    console.log(`         → ${imageUrl(id)}`)
    console.log(`         ！这是已知消歧失败案例，需要 exclusion 规则或 ARASAAC 源数据修正`)
    failed++
    continue
  }

  // 检查 expectedKeyword（宽松：keyword 包含期望词即可）
  const kwMatch = !tc.expectedKeyword || topKw.includes(tc.expectedKeyword.toLowerCase())

  const icon = kwMatch ? OK : WARN
  if (kwMatch) passed++; else warned++

  const detail = tc.expectedKeyword && !kwMatch
    ? `  ← 期望包含 "${tc.expectedKeyword}"`
    : ''
  console.log(`id=${id}  ${icon}  keyword="${topKw}"  (${zhResults.length} 条结果)${detail}`)

  if (!kwMatch) {
    console.log(`         → ${imageUrl(id)}`)
  }
}

console.log(`\n─────────────────────────────────`)
console.log(`  通过: ${passed}  警告: ${warned}  失败: ${failed}`)
console.log(`  总计: ${TEST_CASES.length}`)

if (failed > 0) {
  console.log(`\n  ${FAIL} 存在失败项 — 需手工审查上方图片 URL`)
  process.exit(1)
} else if (warned > 0) {
  console.log(`\n  ${WARN} 存在警告项（中文无结果走了 fallback，或 keyword 偏移）`)
  process.exit(0)
} else {
  console.log(`\n  ${OK} 全部通过`)
  process.exit(0)
}
