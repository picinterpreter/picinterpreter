/**
 * 对话会话 Store
 *
 * 职责：
 *   - 维护 sessionId（30 分钟无活动后自动开新会话）
 *   - 提供 recordExpression()，统一写入 db.expressions
 *
 * 设计：持久化 sessionId 和 lastActivityAt，方便用户短时间重开 app 续接同一会话。
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createExpression } from '@/repositories/expressions-repository'

/** 30 分钟无活动 → 开新会话 */
const SESSION_IDLE_MS = 30 * 60 * 1000

/** recordExpression 的入参（不含 id / sessionId / createdAt / isFavorite） */
export interface RecordInput {
  direction: 'express' | 'receive'
  pictogramIds: string[]
  pictogramLabels: string[]
  candidateSentences: string[]
  selectedSentence: string | null
  /** receive 方向的原始输入文本 */
  inputText?: string
}

interface ConversationState {
  sessionId: string
  lastActivityAt: number

  /**
   * 刷新活动时间戳。
   * 若距上次活动已超 30 分钟，则自动生成新 sessionId 开启新会话。
   */
  touchActivity: () => void

  /**
   * 记录一次对话事件并写入 IndexedDB。
   * 同时调用 touchActivity() 更新会话时间。
   */
  recordExpression: (input: RecordInput) => Promise<void>
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      sessionId: crypto.randomUUID(),
      lastActivityAt: Date.now(),

      touchActivity: () => {
        const now = Date.now()
        const { lastActivityAt } = get()
        if (now - lastActivityAt > SESSION_IDLE_MS) {
          // 长时间未用，开始新会话
          set({ sessionId: crypto.randomUUID(), lastActivityAt: now })
        } else {
          set({ lastActivityAt: now })
        }
      },

      recordExpression: async (input) => {
        const { sessionId, touchActivity } = get()
        touchActivity()
        await createExpression({
          sessionId,
          direction: input.direction,
          pictogramIds: input.pictogramIds,
          pictogramLabels: input.pictogramLabels,
          candidateSentences: input.candidateSentences,
          selectedSentence: input.selectedSentence,
          inputText: input.inputText,
        })
      },
    }),
    { name: 'tuyujia-conversation-session' },
  ),
)
