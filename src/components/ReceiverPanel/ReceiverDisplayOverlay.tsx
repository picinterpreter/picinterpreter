/**
 * ReceiverDisplayOverlay — 全屏展示接收端图片序列。
 *
 * 当家属 / 护工将话语转为图片后，全屏展示给患者理解。
 * 同时自动播报原始文本，并在完成时记录到对话历史。
 */

import { useEffect, useRef, useState } from 'react'
import { useAI } from '@/hooks/use-ai'
import { useConversationStore } from '@/stores/conversation-store'
import { useSettingsStore } from '@/stores/settings-store'
import { resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { LineIcon } from '@/components/ui/LineIcon'
import type { PictogramEntry } from '@/types'

export interface DisplayItem {
  /** 稳定 key（ReceiverPanel 生成的 UUID） */
  id: string
  /** 原始分词 */
  token: string
  /** 已匹配的图片（非 null，调用方保证） */
  pictogram: PictogramEntry
}

interface Props {
  items: DisplayItem[]
  inputText: string
  onDone: () => void
  onBack: () => void
}

export function ReceiverDisplayOverlay({ items, inputText, onDone, onBack }: Props) {
  const ai = useAI()
  const recordExpression = useConversationStore((s) => s.recordExpression)
  const ttsRate = useSettingsStore((s) => s.ttsRate)

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ttsError, setTtsError] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  /**
   * mountedRef: 防止组件卸载后 TTS promise 回调更新 state。
   * speakGenRef: 防止快速连按「重播」时旧回调覆盖新回调的 isSpeaking。
   */
  const mountedRef = useRef(true)
  const speakGenRef = useRef(0)

  // 组件卸载时标记 + 停止 TTS
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      ai.stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 进入全屏后自动播报一次
  useEffect(() => {
    if (inputText) speakText()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape 键返回编辑
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  function speakText() {
    ai.stopSpeaking()
    const gen = ++speakGenRef.current
    setIsSpeaking(true)
    setTtsError(false)
    ai.speak({ text: inputText, lang: 'zh-CN', rate: ttsRate }).then((result) => {
      // 若组件已卸载或已被新一轮播放抢占，则忽略
      if (!mountedRef.current || gen !== speakGenRef.current) return
      setIsSpeaking(false)
      if (!result.success) setTtsError(true)
    })
  }

  async function handleDone() {
    ai.stopSpeaking()
    setSaveError(null)
    if (!recorded) {
      try {
        await recordExpression({
          direction: 'receive',
          pictogramIds: items.map((item) => item.pictogram.id),
          pictogramLabels: items.map((item) => item.pictogram.labels.zh[0]),
          candidateSentences: [],
          selectedSentence: null,
          inputText,
        })
        setRecorded(true)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : '记录失败，请重试')
        return // 记录失败时不关闭覆盖层
      }
    }
    onDone()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="图片序列展示"
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
    >
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="apple-press flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="返回修改图片"
        >
          <LineIcon name="arrowLeft" className="h-4 w-4" />
          返回修改
        </button>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <LineIcon name="sound" className="h-5 w-5 text-white/80 animate-pulse" />
          )}
          {ttsError && !isSpeaking && (
            <span className="text-amber-300 text-sm">无法播报</span>
          )}
        </div>

        <button
          onClick={speakText}
          disabled={isSpeaking}
          className="apple-press flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40"
          aria-label="重播语音"
        >
          <LineIcon name="refresh" className="h-4 w-4" />
          重播
        </button>
      </div>

      {/* 图片序列 — 垂直居中，横排，支持换行 */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto py-4">
        <div className="flex flex-wrap gap-4 justify-center">
          {items.map((item) => (
            <div
              key={item.id}
            className="flex flex-col items-center gap-2 bg-white/95 rounded-[26px] p-3 w-24 sm:w-28 shadow-[0_18px_45px_rgba(0,0,0,0.24)]"
            >
              <img
                src={resolveImageSrc(item.pictogram.imageUrl, item.token, '#7c3aed')}
                alt={item.pictogram.labels.zh[0]}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              />
              <span className="text-sm sm:text-base font-semibold text-slate-900 text-center leading-tight">
                {item.pictogram.labels.zh[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 保存失败提示 */}
      {saveError && (
        <div className="mx-4 mb-2 px-4 py-2 rounded-2xl bg-rose-500/15 border border-rose-400/40 text-rose-100 text-sm text-center">
          {saveError}
        </div>
      )}

      {/* 完成按钮 */}
      <div className="p-4">
        <button
          onClick={handleDone}
          className="apple-press flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-xl font-semibold text-slate-950 shadow-lg transition-colors hover:bg-slate-100"
        >
          <LineIcon name="check" className="h-6 w-6" />
          完成
        </button>
      </div>
    </div>
  )
}
