import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useAI } from '@/hooks/use-ai'
import { resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { db } from '@/db'
import { addSavedPhraseIfMissing } from '@/repositories/saved-phrases-repository'
import type { PictogramEntry } from '@/types'

/**
 * PlaybackOverlay — 常用语全屏播报。
 *
 * 此组件仅从 SavedPhrasesDrawer 触发（startPlayback），
 * 因此不负责记录对话事件（由 CandidatePanel 负责记录表达流程中的事件）。
 */
export function PlaybackOverlay() {
  const showPlayback = useAppStore((s) => s.showPlayback)
  const playbackSentence = useAppStore((s) => s.playbackSentence)
  const playbackPictogramIds = useAppStore((s) => s.playbackPictogramIds)
  const stopPlayback = useAppStore((s) => s.stopPlayback)
  const setTtsAvailable = useAppStore((s) => s.setTtsAvailable)
  const selectedPictograms = useAppStore((s) => s.selectedPictograms)
  const ttsRate = useSettingsStore((s) => s.ttsRate)

  // 从 DB 加载播报配套的图片（仅当有 ID 时触发）
  const playbackPictograms = useLiveQuery(
    () =>
      playbackPictogramIds.length > 0
        ? db.pictograms.bulkGet(playbackPictogramIds).then((items) =>
            items.filter((p): p is NonNullable<typeof p> => p !== undefined),
          )
        : Promise.resolve([] as PictogramEntry[]),
    [playbackPictogramIds],
  )

  const ai = useAI()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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

  // 每次播放新句子时重置本地状态
  useEffect(() => {
    setSaved(false)
    setTtsError(null)
  }, [playbackSentence])

  // 句子或速率变化时自动播报
  useEffect(() => {
    if (!showPlayback || !playbackSentence) return
    speak()
    return () => {
      ai.stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPlayback, playbackSentence, ttsRate])

  // NOTE: Must remain a plain function declaration — it relies on
  // closing over the latest playbackSentence/ttsRate per render.
  function speak() {
    ai.stopSpeaking()
    const gen = ++speakGenRef.current
    setIsSpeaking(true)
    setTtsError(null)
    ai.speak({ text: playbackSentence, lang: 'zh-CN', rate: ttsRate }).then((result) => {
      if (!mountedRef.current || gen !== speakGenRef.current) return
      setIsSpeaking(false)
      setTtsAvailable(result.success)
      if (!result.success) {
        setTtsError(result.error ?? '语音播报不可用')
      }
    })
  }

  // Escape 键关闭播报
  useEffect(() => {
    if (!showPlayback) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        ai.stopSpeaking()
        stopPlayback()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ai, showPlayback, stopPlayback])

  if (!showPlayback) return null

  function handleReplay() {
    speak()
  }

  async function handleFavorite() {
    if (saved) return
    setSaved(true)
    await addSavedPhraseIfMissing(playbackSentence, selectedPictograms.map((p) => p.id))
  }

  function handleDone() {
    ai.stopSpeaking()
    stopPlayback()
    // 常用语播报完成后不清空暂存区，保留用户当前选择
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="playback-sentence"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
    >
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
        {/* 配套图片行（来自收藏短语的图片 ID） */}
        {(playbackPictograms?.length ?? 0) > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {playbackPictograms!.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <img
                  src={resolveImageSrc(p.imageUrl, p.labels.zh[0], '#2563EB')}
                  alt={p.labels.zh[0]}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border border-blue-100 bg-blue-50 p-1"
                />
                <span className="text-sm text-gray-600 max-w-[72px] truncate">{p.labels.zh[0]}</span>
              </div>
            ))}
          </div>
        )}

        <p id="playback-sentence" className="text-3xl md:text-4xl font-bold text-gray-900 leading-relaxed mb-8">
          {playbackSentence}
        </p>

        {isSpeaking && (
          <p className="text-xl text-blue-600 mb-6 animate-pulse">
            🔊 正在播报...
          </p>
        )}

        {ttsError && (
          <p className="text-lg text-amber-600 mb-6">
            ⚠ {ttsError}<br />
            <span className="text-base text-gray-500">请朗读上方句子</span>
          </p>
        )}

        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={handleReplay}
            disabled={isSpeaking}
            aria-label="重新播报"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white text-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[52px]"
          >
            🔁 重播
          </button>
          <button
            onClick={handleFavorite}
            disabled={isSpeaking || saved}
            aria-label={saved ? '已收藏' : '收藏此句'}
            className={`px-6 py-3 rounded-xl text-white text-lg font-medium transition-colors min-h-[52px] disabled:opacity-50
              ${saved ? 'bg-amber-300 cursor-default' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {saved ? '✓ 已收藏' : '⭐ 收藏'}
          </button>
          <button
            onClick={handleDone}
            aria-label="播报完成，关闭"
            className="px-6 py-3 rounded-xl bg-green-600 text-white text-lg font-medium hover:bg-green-700 transition-colors min-h-[52px]"
          >
            ✓ 完成
          </button>
        </div>
      </div>
    </div>
  )
}
