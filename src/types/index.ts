// ===== 图库相关 =====

/** 图片分类 */
export interface Category {
  id: string
  name: string
  icon: string
  sortOrder: number
  /**
   * 链接到其他分类的 ID 列表（可选）。
   * 当用户浏览本分类时，被链接分类的图片也会自动显示。
   * 类似 Obsidian 的双向链接 / 虚拟文件夹概念。
   */
  linkedCategoryIds?: string[]
}

/** 图片条目 */
export interface PictogramEntry {
  id: string
  imageUrl: string
  labels: {
    zh: string[]
    en: string[]
  }
  categoryId: string
  synonyms: string[]
  disambiguationHints: Record<string, string>
  emotionTag?: string
  usageCount: number
  lastUsedAt?: number
}

// ===== 表达相关 =====

/**
 * 一次对话事件（双向）。
 *
 * direction='express'：患者用图片表达，AI 生成候选句
 * direction='receive'：把他人说的话转成图片序列（接收/理解方向，Phase 2）
 *
 * sessionId 把同一次对话的多轮归为一组，供 LLM 上下文管理使用。
 * pictogramLabels 冗余存储当时的文字标签，防止图库更新后标签丢失。
 */
export interface Expression {
  id: string

  /** 对话会话 ID，同一会话内多轮使用同一 ID */
  sessionId: string
  /** 表达方向 */
  direction: 'express' | 'receive'

  /** 选中的图片 ID 列表（有序） */
  pictogramIds: string[]
  /** 对应的中文标签（冗余，防图库变更） */
  pictogramLabels: string[]

  /** AI 生成的候选句（express 方向） */
  candidateSentences: string[]
  /** 最终选定 / 播报的句子 */
  selectedSentence: string | null

  /** 原始输入文本（receive 方向） */
  inputText?: string

  createdAt: number
  updatedAt?: number
  deletedAt?: number | null
  serverVersion?: number | null
  lastModifiedByDeviceId?: string | null
  isFavorite: boolean
}

/** 常用表达（收藏） */
export interface SavedPhrase {
  id: string
  sentence: string
  pictogramIds: string[]
  usageCount: number
  createdAt?: number
  lastUsedAt: number
  updatedAt?: number
  deletedAt?: number | null
  serverVersion?: number | null
  lastModifiedByDeviceId?: string | null
}

// ===== Phase 1.5 预留 =====

/** 文本→图片序列记录 */
export interface TextToImageResult {
  id: string
  inputText: string
  tokens: string[]
  matchedPictograms: Array<{
    token: string
    pictogramId: string | null
    confidence: number
    alternatives: string[]
  }>
  createdAt: number
}

// ===== Provider 类型 =====

export interface NLGRequest {
  pictogramLabels: string[]
  context?: {
    recentSentences?: string[]
    scene?: string
    /**
     * 预留给服务端/客户端扩展的词汇提示字段。
     */
    pictogramVocabulary?: string
  }
  candidateCount: number
}

export interface NLGResponse {
  candidates: string[]
  provider: string
  isOfflineFallback: boolean
}

export interface NLGProvider {
  readonly name: string
  generate(req: NLGRequest): Promise<NLGResponse>
}

export interface TTSRequest {
  text: string
  lang?: string
  rate?: number
  /** 首选语音名称（来自 speechSynthesis.getVoices()）。留空则自动选择最佳中文语音。 */
  voiceName?: string
}

export interface TTSResult {
  success: boolean
  error?: string
  provider: string
}

export interface TTSProvider {
  readonly name: string
  speak(req: TTSRequest): Promise<TTSResult>
  stop(): void
  isAvailable(): boolean
}

export interface ASRResult {
  text: string
  confidence: number
  provider: string
  isOfflineFallback: boolean
}

export interface ASRProvider {
  readonly name: string
  recognize(audio: Blob): Promise<ASRResult>
  isAvailable(): boolean
}

// ===== Sync / Cloud Persistence =====

export type SyncEntityType = 'expression' | 'saved_phrase'
export type SyncOperation = 'upsert' | 'delete'

export interface BootstrapRequest {
  installId: string
  platform?: string
  appVersion?: string
}

export interface BootstrapResponse {
  deviceId: string
  userId: string
  isAnonymous: boolean
  lastPulledChangeId: number
}

export interface SyncState {
  id: 'main'
  installId: string
  deviceId: string | null
  userId: string | null
  lastPulledChangeId: number
  lastBootstrapAt?: number
  lastSyncAt?: number
  lastError?: string | null
}

export interface SyncOutboxItem {
  id: string
  entityType: SyncEntityType
  operation: SyncOperation
  recordId: string
  baseVersion: number | null
  payload: Expression | SavedPhrase | null
  createdAt: number
}

export interface SyncMutation {
  mutationId: string
  entityType: SyncEntityType
  operation: SyncOperation
  recordId: string
  baseVersion: number | null
  payload: Expression | SavedPhrase | null
}

export interface SyncPushRequest {
  mutations: SyncMutation[]
}

export interface SyncPushResult {
  mutationId: string
  entityType: SyncEntityType
  recordId: string
  accepted: boolean
  conflicted: boolean
  deleted: boolean
  serverVersion: number | null
  changeId: number | null
  record: Expression | SavedPhrase | null
}

export interface SyncPushResponse {
  results: SyncPushResult[]
}

export interface SyncPullChange {
  changeId: number
  entityType: SyncEntityType
  operation: SyncOperation
  recordId: string
  recordVersion: number
  record: Expression | SavedPhrase | null
}

export interface SyncPullResponse {
  changes: SyncPullChange[]
  nextChangeId: number
  hasMore: boolean
}
