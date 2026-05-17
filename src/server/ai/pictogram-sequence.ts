import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ToolLoopAgent, generateText, stepCountIs, tool } from 'ai'
import { z } from 'zod/v4'
import { getServerAISDKModel } from './ai-sdk-model'
import {
  arasaacRecordToPictogramEntry,
  type ArasaacRecord,
} from '@/server/pictograms/arasaac-index'
import type {
  PictogramAgentAttemptTrace,
  PictogramAgentToolTrace,
  PictogramSequenceItem,
  PictogramSequenceResponse,
  PictogramSequenceTrace,
} from '@/types'

const AI_PLAN_TIMEOUT_MS = 20_000
const AI_TOOL_LOOP_TIMEOUT_MS = 15_000
const MAX_AGENT_STEPS = 5
const MAX_AGENT_TOOL_LOOP_STEPS = 12
const MAX_SEQUENCE_ITEMS = 16
const DEFAULT_SEARCH_LIMIT = 24
const MAX_SEARCH_LIMIT = 40
const ARASAAC_SLIM_DATA_PATH = path.join(process.cwd(), 'data/arasaac-pictograms-slim.json')
const ARASAAC_FULL_DATA_PATH = path.join(process.cwd(), 'data/arasaac-pictograms.json')

interface ArasaacExport {
  records?: ArasaacRecord[]
}

export interface PictogramSearchQuery {
  name?: string
  tag?: string
  category?: string
  limit?: number
}

export interface PictogramSearchResult {
  id: string
  name: string
  tag: string
  category: string
}

export interface PictogramDetail {
  id: string
  name: string
  chineseName: string
  englishName: string
  url: string
  imageUrl300: string
  imageUrl500: string
  arasaacUrl: string
  category: string
  categories: string[]
  tag: string
  tags: string[]
  chineseKeywords: string[]
  englishKeywords: string[]
  description: string
}

const AgentSequenceSchema = z.object({
  originalText: z.string().optional(),
  finalText: z.string().optional(),
  intent: z.string().optional(),
  attempts: z.array(z.object({
    searchQueries: z.array(z.object({
      name: z.string().optional(),
      tag: z.string().optional(),
      category: z.string().optional(),
    })).optional(),
    candidateIds: z.array(z.string()).optional(),
    draftedSequence: z.array(z.string()).optional(),
    rejected: z.array(z.object({
      id: z.string(),
      reason: z.string(),
    })).optional(),
    missingConcepts: z.array(z.string()).optional(),
  })).optional(),
  sequence: z.array(z.object({
    arasaacId: z.string(),
    label: z.string(),
    imageUrl: z.string().optional(),
    arasaacUrl: z.string().optional(),
    role: z.string().optional(),
    verification: z.string().optional(),
  })).max(MAX_SEQUENCE_ITEMS),
  missingConcepts: z.array(z.string()).optional(),
})

export type AgentSequence = z.infer<typeof AgentSequenceSchema>

const SubmitPictogramSequenceInputSchema = AgentSequenceSchema.describe(
  'Submit the final verified AAC pictogram sequence.',
)

const ConceptPlanSchema = z.object({
  intent: z.string().optional(),
  finalText: z.string().optional(),
  concepts: z.array(z.object({
    label: z.string(),
    searchName: z.string().optional(),
    tag: z.string().optional(),
    category: z.string().optional(),
    role: z.string().optional(),
  })).max(MAX_SEQUENCE_ITEMS),
  missingConcepts: z.array(z.string()).optional(),
})

type ConceptPlan = z.infer<typeof ConceptPlanSchema>

export type PictogramSequenceAgentRunner = (
  text: string,
  options?: { signal?: AbortSignal },
) => Promise<AgentSequence | PictogramSequenceAgentResult | null>

export interface PictogramSequenceAgentResult {
  output: AgentSequence
  toolCalls: PictogramAgentToolTrace[]
}

export interface BuildPictogramSequenceOptions {
  runAgent?: PictogramSequenceAgentRunner
  records?: ArasaacRecord[]
  signal?: AbortSignal
}

let slimRecordsPromise: Promise<ArasaacRecord[]> | null = null
let fullRecordsPromise: Promise<ArasaacRecord[]> | null = null

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

function parseRecords(raw: string): ArasaacRecord[] {
  const parsed = JSON.parse(raw) as ArasaacExport | ArasaacRecord[]
  if (Array.isArray(parsed)) return parsed
  return Array.isArray(parsed.records) ? parsed.records : []
}

async function loadSlimRecords(): Promise<ArasaacRecord[]> {
  slimRecordsPromise ??= readFile(ARASAAC_SLIM_DATA_PATH, 'utf8')
    .then(parseRecords)
    .catch((error) => {
      slimRecordsPromise = null
      throw error
    })
  return slimRecordsPromise
}

async function loadFullRecords(): Promise<ArasaacRecord[]> {
  fullRecordsPromise ??= readFile(ARASAAC_FULL_DATA_PATH, 'utf8')
    .then(parseRecords)
    .catch((error) => {
      fullRecordsPromise = null
      throw error
    })
  return fullRecordsPromise
}

type OptionalRegex = RegExp | null | undefined

function compileRegex(value: string | undefined): OptionalRegex {
  const normalized = value?.trim()
  if (!normalized) return undefined

  try {
    return new RegExp(normalized.replaceAll('｜', '|'), 'iu')
  } catch {
    return null
  }
}

function matchesAny(regex: OptionalRegex, values: Array<string | undefined>): boolean {
  if (regex === undefined) return true
  if (regex === null) return false
  return values.some((value) => Boolean(value && regex.test(String(value))))
}

function pickMatchedValue(regex: OptionalRegex, values: Array<string | undefined>): string {
  if (regex === undefined || regex === null) return ''
  return values.find((value) => Boolean(value && regex.test(String(value)))) ?? ''
}

function first(values: string[] | undefined): string {
  return Array.isArray(values) ? values[0] ?? '' : ''
}

function recordNameValues(record: ArasaacRecord): string[] {
  return [
    record.chineseName,
    record.displayNameZhFallback,
    record.englishName,
    ...(record.chineseKeywords ?? []),
    ...(record.englishKeywords ?? []),
  ].filter((value): value is string => typeof value === 'string')
}

function clampSearchLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_SEARCH_LIMIT
  return Math.min(Math.max(Math.trunc(limit ?? DEFAULT_SEARCH_LIMIT), 1), MAX_SEARCH_LIMIT)
}

export async function searchPictograms(
  query: PictogramSearchQuery,
  options: { records?: ArasaacRecord[] } = {},
): Promise<PictogramSearchResult[]> {
  const records = options.records ?? await loadSlimRecords()
  const name = compileRegex(query.name)
  const tag = compileRegex(query.tag)
  const category = compileRegex(query.category)
  const limit = clampSearchLimit(query.limit)

  const results: PictogramSearchResult[] = []

  for (const record of records) {
    if (!matchesAny(name, recordNameValues(record))) continue
    if (!matchesAny(tag, record.tagsEn ?? [])) continue
    if (!matchesAny(category, record.categoriesEn ?? [])) continue

    results.push({
      id: String(record.id),
      name: pickMatchedValue(name, recordNameValues(record)) ||
        record.chineseName ||
        record.displayNameZhFallback ||
        record.englishName ||
        '',
      tag: pickMatchedValue(tag, record.tagsEn ?? []) || first(record.tagsEn),
      category: pickMatchedValue(category, record.categoriesEn ?? []) || first(record.categoriesEn),
    })

    if (results.length >= limit) break
  }

  return results
}

function describeRecord(record: ArasaacRecord): string {
  const name = record.chineseName || record.displayNameZhFallback || record.englishName || `ARASAAC ${record.id}`
  const tags = (record.tagsEn ?? []).slice(0, 6).join(', ')
  const categories = (record.categoriesEn ?? []).slice(0, 4).join(', ')

  return [
    `Picture label: ${name}.`,
    categories ? `Categories: ${categories}.` : '',
    tags ? `Tags: ${tags}.` : '',
  ].filter(Boolean).join(' ')
}

function detailFromRecord(record: ArasaacRecord): PictogramDetail {
  return {
    id: String(record.id),
    name: record.chineseName || record.displayNameZhFallback || record.englishName || '',
    chineseName: record.chineseName || record.displayNameZhFallback || '',
    englishName: record.englishName || '',
    url: record.imageUrl300 || record.imageUrl500 || '',
    imageUrl300: record.imageUrl300 || '',
    imageUrl500: record.imageUrl500 || '',
    arasaacUrl: record.arasaacUrlZh || record.arasaacUrlEn || '',
    category: first(record.categoriesEn),
    categories: record.categoriesEn ?? [],
    tag: first(record.tagsEn),
    tags: record.tagsEn ?? [],
    chineseKeywords: record.chineseKeywords ?? [],
    englishKeywords: record.englishKeywords ?? [],
    description: describeRecord(record),
  }
}

export async function getPictogramDetail(
  id: string,
  options: { records?: ArasaacRecord[] } = {},
): Promise<PictogramDetail | null> {
  const normalizedId = normalizeTerm(id)
  if (!normalizedId) return null

  const records = options.records ?? await loadFullRecords()
  const record = records.find((item) => String(item.id) === normalizedId)
  return record ? detailFromRecord(record) : null
}

async function getRecordMap(records?: ArasaacRecord[]): Promise<Map<string, ArasaacRecord>> {
  const source = records ?? await loadFullRecords()
  const map = new Map<string, ArasaacRecord>()

  for (const record of source) {
    map.set(String(record.id), record)
  }

  return map
}

function agentInstructions(): string {
  return (
    `你是图语家的 AAC 图片序列 agent，服务对象是失语症患者。\n` +
    `你的任务是把照护者输入的一整句中文，转成患者能仅靠图片理解的 ARASAAC 图片序列。\n\n` +
    `核心规则：\n` +
    `- 先理解整句意图，禁止机械分词、逐字切词或输出 token list。\n` +
    `- 每次最多做 ${MAX_AGENT_STEPS} 轮搜索/验证/修正；如果仍有无法表达的意义，放进 missingConcepts。\n` +
    `- 必须用 searchPictograms 搜索候选图片，再用 getPictogramDetail 验证最终选择的每个 arasaacId。\n` +
    `- 永远不要发明 ARASAAC id；不要因为字面匹配就保留错误图片。\n` +
    `- 图片序列要少而清楚，但必须保留关键演员、动作、对象、地点、时间顺序、风险、症状和是否为问题。\n` +
    `- 抽象照护意图要换成可见动作或实际结果；除非真的有交付物，不要用“给”代替照护动作。\n` +
    `- 医疗、急救和症状相关句子要尽量保留风险或症状。\n` +
    `- 最终 sequence 只放验证过、适合原句语境的图片；不要使用 placeholder。\n` +
    `- 完成搜索和验证后，必须调用 submitPictogramSequence 提交最终结果。\n\n` +
    `输出要求：\n` +
    `- originalText 使用用户原句。\n` +
    `- finalText 是语义等价但更适合图片表达的短句。\n` +
    `- sequence 中 label 是患者可见的短名词或动词；role 简短说明该图片在句意中的作用；verification 简述为什么该图片适合。\n` +
    `- missingConcepts 列出没有合适图片承载的重要意义。\n` +
    `- 如果工具调用不可用，才输出一个 JSON object，不要 Markdown，不要代码块，不要额外解释。`
  )
}

function createPictogramSequenceAgent() {
  const model = getServerAISDKModel()
  if (!model) {
    throw new Error('AI_API_KEY is not configured')
  }

  return new ToolLoopAgent({
    id: 'arasaac-pictogram-sequence',
    model,
    instructions: agentInstructions(),
    tools: {
      searchPictograms: tool({
        description:
          'Search ARASAAC pictograms. Use name for concrete objects/actions/people/places/time/symptoms/body parts, and tag/category for domains such as health, food, bathroom, clothing, sleep, weather, or household items.',
        inputSchema: z.object({
          name: z.string().optional().describe('Regex over Chinese name, English name, and keywords. Fullwidth ｜ is accepted as |.'),
          tag: z.string().optional().describe('Regex over English tags.'),
          category: z.string().optional().describe('Regex over English categories.'),
          limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
        }),
        execute: (input) => searchPictograms(input),
      }),
      getPictogramDetail: tool({
        description:
          'Get full metadata for one ARASAAC pictogram id. Call this for every final id before using it in the sequence.',
        inputSchema: z.object({
          id: z.string().describe('ARASAAC numeric id returned by searchPictograms.'),
        }),
        execute: (input) => getPictogramDetail(input.id),
      }),
      submitPictogramSequence: tool({
        description:
          'Submit the final verified AAC pictogram sequence after searching and checking details. Use this when the final answer is ready.',
        inputSchema: SubmitPictogramSequenceInputSchema,
      }),
    },
    stopWhen: stepCountIs(MAX_AGENT_TOOL_LOOP_STEPS),
    temperature: 0.1,
    maxOutputTokens: 900,
  })
}

function extractSubmittedSequence(
  steps: Array<{
    toolCalls: Array<{
      toolName: string
      input: unknown
    }>
  }>,
): AgentSequence | null {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const submitCall = [...steps[index].toolCalls]
      .reverse()
      .find((call) => call.toolName === 'submitPictogramSequence')
    if (!submitCall) continue

    const parsed = AgentSequenceSchema.safeParse(submitCall.input)
    if (parsed.success) return parsed.data
  }

  return null
}

export function parseAgentSequenceText(raw: string): AgentSequence | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  const source = fenced?.[1]?.trim() ?? trimmed
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start < 0 || end <= start) return null

  try {
    return AgentSequenceSchema.parse(JSON.parse(source.slice(start, end + 1)))
  } catch {
    return null
  }
}

function parseConceptPlanText(raw: string): ConceptPlan | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  const source = fenced?.[1]?.trim() ?? trimmed
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start < 0 || end <= start) return null

  try {
    return ConceptPlanSchema.parse(JSON.parse(source.slice(start, end + 1)))
  } catch {
    return null
  }
}

function hasHan(value: string): boolean {
  return /\p{Script=Han}/u.test(value)
}

function searchNameRegex(...values: Array<string | undefined>): string {
  const terms = uniqueStrings(
    values.flatMap((value) =>
      (value ?? '')
        .split(/[\s,，、/]+/u)
        .map((item) => item.trim()),
    ),
  )
  const hanTerms = terms.filter(hasHan)
  return (hanTerms.length > 0 ? hanTerms : terms).join('|')
}

function preferredSearchResult(
  results: PictogramSearchResult[],
  concept: ConceptPlan['concepts'][number],
  usedIds: Set<string> = new Set(),
): PictogramSearchResult | undefined {
  const preferredNames = new Set(
    searchNameRegex(concept.searchName, concept.label)
      .split('|')
      .map((value) => normalizeTerm(value))
      .filter((value) => value.length > 0),
  )
  const preferredHanNames = [...preferredNames].filter(hasHan)

  return results.find((result) =>
    !usedIds.has(result.id) &&
    preferredHanNames.some((name) => result.name.includes(name))
  ) ??
    results.find((result) => !usedIds.has(result.id) && preferredNames.has(result.name)) ??
    results.find((result) => !usedIds.has(result.id)) ??
    results[0]
}

async function generateConceptPlan(
  text: string,
  signal?: AbortSignal,
): Promise<ConceptPlan | null> {
  const model = getServerAISDKModel()
  if (!model) throw new Error('AI_API_KEY is not configured')

  const result = await generateText({
    model,
    prompt:
      `把中文照护句转成 AAC 图片概念。先理解整句，不要机械分词。\n` +
      `只输出 JSON，不要 Markdown。格式：{"intent":"","finalText":"","concepts":[{"label":"","searchName":"","tag":"","category":"","role":""}],"missingConcepts":[]}\n` +
      `concepts 最多 ${MAX_SEQUENCE_ITEMS} 个，searchName 要具体可见，tag/category 只在有把握时填英文。\n` +
      `按患者看图能理解的顺序排列；询问需求时优先用“需要/想要”再接动作和对象。\n` +
      `句子：${text}`,
    temperature: 0.1,
    maxOutputTokens: 350,
    abortSignal: signal,
    timeout: { totalMs: AI_PLAN_TIMEOUT_MS },
  })

  return parseConceptPlanText(result.text)
}

function truncateForTrace(value: string, maxLength = 120): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

function cleanOptional(value: string | undefined): string | undefined {
  const normalized = normalizeTerm(value ?? '')
  return normalized.length > 0 ? normalized : undefined
}

function conceptSearchQueries(concept: ConceptPlan['concepts'][number]): PictogramSearchQuery[] {
  const name = cleanOptional(searchNameRegex(concept.searchName, concept.label))
  const tag = cleanOptional(concept.tag)
  const category = cleanOptional(concept.category)
  const queries: PictogramSearchQuery[] = []

  if (name && (tag || category)) {
    queries.push({ name, tag, category, limit: 8 })
  }
  if (name) {
    queries.push({ name, limit: 8 })
  }
  if (tag || category) {
    queries.push({ tag, category, limit: 8 })
  }

  return queries
}

export async function sequenceFromConceptPlan(
  text: string,
  plan: ConceptPlan,
  options: {
    slimRecords?: ArasaacRecord[]
    fullRecords?: ArasaacRecord[]
  } = {},
): Promise<PictogramSequenceAgentResult | null> {
  if (plan.concepts.length === 0) return null

  const toolCalls: PictogramAgentToolTrace[] = []
  const sequence: AgentSequence['sequence'] = []
  const searchQueries: NonNullable<AgentSequence['attempts']>[number]['searchQueries'] = []
  const candidateIds: string[] = []
  const draftedSequence: string[] = []
  const missingConcepts = [...(plan.missingConcepts ?? [])]
  const usedIds = new Set<string>()
  let traceStep = 1

  toolCalls.push({
    step: traceStep,
    toolName: 'planPictogramConcepts',
    input: { text: truncateForTrace(text) },
    outputSummary: [
      plan.intent ? `意图：${plan.intent}` : '',
      plan.finalText ? `图片句：${plan.finalText}` : '',
      `概念：${plan.concepts.map((concept) => concept.label).join('、')}`,
    ].filter(Boolean).join('；'),
    resultCount: plan.concepts.length,
  })

  for (const concept of plan.concepts) {
    const label = normalizeTerm(concept.label)
    if (!label) continue

    draftedSequence.push(label)

    let selectedCandidate: PictogramSearchResult | undefined
    for (const query of conceptSearchQueries(concept)) {
      searchQueries.push({
        name: query.name,
        tag: query.tag,
        category: query.category,
      })

      const searchResults = await searchPictograms(query, { records: options.slimRecords })
      const searchSummary = summarizeToolOutput('searchPictograms', searchResults)
      toolCalls.push({
        step: traceStep + 1,
        toolName: 'searchPictograms',
        input: summarizeInput(query),
        outputSummary: searchSummary.outputSummary,
        resultCount: searchSummary.resultCount,
        ids: searchSummary.ids,
      })
      traceStep += 1

      for (const result of searchResults) {
        candidateIds.push(result.id)
      }

      selectedCandidate = preferredSearchResult(searchResults, concept, usedIds)
      if (selectedCandidate && !usedIds.has(selectedCandidate.id)) break
      selectedCandidate = undefined
    }

    if (!selectedCandidate) {
      missingConcepts.push(concept.label)
      continue
    }

    const detail = await getPictogramDetail(selectedCandidate.id, { records: options.fullRecords })
    const detailSummary = summarizeToolOutput('getPictogramDetail', detail)
    toolCalls.push({
      step: traceStep + 1,
      toolName: 'getPictogramDetail',
      input: { id: selectedCandidate.id },
      outputSummary: detailSummary.outputSummary,
      resultCount: detailSummary.resultCount,
      ids: detailSummary.ids,
    })
    traceStep += 1

    if (!detail) {
      missingConcepts.push(concept.label)
      continue
    }

    usedIds.add(detail.id)
    sequence.push({
      arasaacId: detail.id,
      label: label || detail.name,
      imageUrl: detail.imageUrl500 || detail.imageUrl300,
      arasaacUrl: detail.arasaacUrl,
      role: concept.role,
      verification: `${detail.name} 与「${label}」匹配`,
    })

    if (sequence.length >= MAX_SEQUENCE_ITEMS) break
  }

  return {
    output: {
      originalText: text,
      finalText: plan.finalText,
      intent: plan.intent,
      attempts: [{
        searchQueries,
        candidateIds: uniqueStrings(candidateIds),
        draftedSequence,
        rejected: [],
        missingConcepts,
      }],
      sequence,
      missingConcepts,
    },
    toolCalls,
  }
}

async function runPlannedToolAgent(
  text: string,
  signal?: AbortSignal,
): Promise<PictogramSequenceAgentResult | null> {
  const plan = await generateConceptPlan(text, signal)
  if (!plan) return null
  return sequenceFromConceptPlan(text, plan)
}

function summarizeInput(input: unknown): Record<string, string | number | boolean> {
  if (!input || typeof input !== 'object') return {}

  const result: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value
    }
  }

  return result
}

function summarizeToolOutput(toolName: string, output: unknown) {
  if (toolName === 'searchPictograms' && Array.isArray(output)) {
    const ids = output
      .map((item) => item && typeof item === 'object' && 'id' in item ? String(item.id) : '')
      .filter((id) => id.length > 0)
    const labels = output
      .slice(0, 4)
      .map((item) => {
        if (!item || typeof item !== 'object') return ''
        const name = 'name' in item ? String(item.name) : ''
        const id = 'id' in item ? String(item.id) : ''
        return name && id ? `${name}(${id})` : name || id
      })
      .filter((label) => label.length > 0)

    return {
      outputSummary: labels.length > 0
        ? `找到 ${output.length} 个候选：${labels.join('、')}`
        : `找到 ${output.length} 个候选`,
      resultCount: output.length,
      ids,
    }
  }

  if (toolName === 'getPictogramDetail') {
    if (!output || typeof output !== 'object') {
      return {
        outputSummary: '未找到图片详情',
        resultCount: 0,
        ids: [],
      }
    }

    const id = 'id' in output ? String(output.id) : ''
    const name = 'name' in output ? String(output.name) : ''
    const category = 'category' in output ? String(output.category) : ''

    return {
      outputSummary: `验证 ${name || id}${category ? `，分类 ${category}` : ''}`,
      resultCount: 1,
      ids: id ? [id] : [],
    }
  }

  return {
    outputSummary: '工具已返回结果',
    resultCount: undefined,
    ids: undefined,
  }
}

function traceToolCallsFromSteps(
  steps: Array<{
    stepNumber: number
    toolResults: Array<{
      toolName: string
      input: unknown
      output: unknown
    }>
  }>,
): PictogramAgentToolTrace[] {
  return steps.flatMap((step) =>
    step.toolResults.map((result) => {
      const summary = summarizeToolOutput(result.toolName, result.output)
      return {
        step: step.stepNumber + 1,
        toolName: result.toolName,
        input: summarizeInput(result.input),
        outputSummary: summary.outputSummary,
        resultCount: summary.resultCount,
        ids: summary.ids,
      }
    }),
  )
}

async function runToolLoopPictogramSequenceAgent(
  text: string,
  options: { signal?: AbortSignal } = {},
): Promise<PictogramSequenceAgentResult | null> {
  const agent = createPictogramSequenceAgent()
  let result: Awaited<ReturnType<typeof agent.generate>>

  try {
    result = await agent.generate({
      prompt: `照护者原句：${text}`,
      abortSignal: options.signal,
      timeout: { totalMs: AI_TOOL_LOOP_TIMEOUT_MS },
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw error
  }

  const output = extractSubmittedSequence(result.steps) ?? parseAgentSequenceText(result.text)
  if (!output) {
    const toolNames = result.steps
      .flatMap((step) => step.toolCalls.map((call) => call.toolName))
      .join(',')
    throw new Error(`pictogram sequence agent returned unparsable JSON: ${result.text.slice(0, 300)} tools=${toolNames}`)
  }

  return {
    output,
    toolCalls: traceToolCallsFromSteps(result.steps),
  }
}

export async function runPictogramSequenceAgent(
  text: string,
  options: { signal?: AbortSignal } = {},
): Promise<PictogramSequenceAgentResult | null> {
  if (process.env.AI_AGENT_STRATEGY === 'tool-loop') {
    return runToolLoopPictogramSequenceAgent(text, options)
  }

  return runPlannedToolAgent(text, options.signal)
}

function mergeMissingConcepts(values: string[]): string[] {
  return uniqueStrings(values).slice(0, MAX_SEQUENCE_ITEMS)
}

function tokenFromSequenceItem(label: string, record: ArasaacRecord): string {
  return normalizeTerm(label) ||
    record.chineseName ||
    record.displayNameZhFallback ||
    record.englishName ||
    `ARASAAC ${record.id}`
}

function normalizeAttemptTrace(attempts: AgentSequence['attempts']): PictogramAgentAttemptTrace[] {
  return (attempts ?? []).map((attempt) => ({
    searchQueries: attempt.searchQueries ?? [],
    candidateIds: attempt.candidateIds ?? [],
    draftedSequence: attempt.draftedSequence ?? [],
    rejected: attempt.rejected ?? [],
    missingConcepts: attempt.missingConcepts ?? [],
  }))
}

function buildTrace(
  output: AgentSequence,
  toolCalls: PictogramAgentToolTrace[] = [],
): PictogramSequenceTrace | undefined {
  const hasTrace =
    Boolean(output.intent) ||
    Boolean(output.finalText) ||
    (output.attempts?.length ?? 0) > 0 ||
    output.sequence.length > 0 ||
    (output.missingConcepts?.length ?? 0) > 0 ||
    toolCalls.length > 0

  if (!hasTrace) return undefined

  return {
    intent: output.intent,
    finalText: output.finalText,
    attempts: normalizeAttemptTrace(output.attempts),
    verifications: output.sequence.map((item) => ({
      arasaacId: item.arasaacId,
      label: item.label,
      role: item.role,
      verification: item.verification,
    })),
    missingConcepts: output.missingConcepts ?? [],
    toolCalls,
  }
}

export async function sequenceResponseFromAgentOutput(
  output: AgentSequence,
  options: {
    records?: ArasaacRecord[]
    attempts?: number
    toolCalls?: PictogramAgentToolTrace[]
  } = {},
): Promise<PictogramSequenceResponse | null> {
  const parsed = AgentSequenceSchema.safeParse(output)
  if (!parsed.success) return null

  const recordMap = await getRecordMap(options.records)
  const seenIds = new Set<string>()
  const items: PictogramSequenceItem[] = []
  const missing = [...(parsed.data.missingConcepts ?? [])]

  for (const sequenceItem of parsed.data.sequence) {
    const arasaacId = normalizeTerm(sequenceItem.arasaacId)
    if (!arasaacId || seenIds.has(arasaacId)) continue
    seenIds.add(arasaacId)

    const record = recordMap.get(arasaacId)
    if (!record) {
      missing.push(normalizeTerm(sequenceItem.label) || `ARASAAC ${arasaacId}`)
      continue
    }

    const token = tokenFromSequenceItem(sequenceItem.label, record)
    const normalizedToken = record.chineseName || record.displayNameZhFallback || token

    items.push({
      token,
      normalizedToken,
      pictogram: arasaacRecordToPictogramEntry(record),
      matchType: 'ai-normalized',
      confidence: 0.95,
    })

    if (items.length >= MAX_SEQUENCE_ITEMS) break
  }

  if (items.length === 0 && missing.length === 0) return null

  return {
    items,
    missingTokens: mergeMissingConcepts(missing),
    attempts: options.attempts ?? Math.max(parsed.data.attempts?.length ?? 0, 1),
    trace: buildTrace(parsed.data, options.toolCalls),
  }
}

function normalizeAgentResult(
  result: AgentSequence | PictogramSequenceAgentResult,
): PictogramSequenceAgentResult {
  if ('output' in result && 'toolCalls' in result) return result
  return {
    output: result,
    toolCalls: [],
  }
}

export async function buildPictogramSequence(
  text: string,
  options: BuildPictogramSequenceOptions = {},
): Promise<PictogramSequenceResponse | null> {
  const runAgent = options.runAgent ?? runPictogramSequenceAgent
  const agentResult = await runAgent(text, { signal: options.signal })
  if (!agentResult) return null

  const { output, toolCalls } = normalizeAgentResult(agentResult)

  return sequenceResponseFromAgentOutput(output, {
    records: options.records,
    attempts: output.attempts?.length,
    toolCalls,
  })
}
