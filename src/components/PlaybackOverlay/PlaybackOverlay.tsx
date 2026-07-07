import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useAI } from '@/hooks/use-ai'
import { resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { shouldDeferTtsAutoplay } from '@/utils/tts-environment'
import { db } from '@/db'
import { addSavedPhraseIfMissing } from '@/repositories/saved-phrases-repository'
import { LineIcon } from '@/components/ui/LineIcon'
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
  const [hasSpoken, setHasSpoken] = useState(false)

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
    setHasSpoken(false)
  }, [playbackSentence])

  // 句子或速率变化时自动播报
  useEffect(() => {
    if (!showPlayback || !playbackSentence) return
    if (shouldDeferTtsAutoplay()) return
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
    setHasSpoken(true)
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
      className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-xl sm:p-6"
    >
      <div className="apple-panel radius-panel w-full max-w-lg p-5 text-center sm:p-8">
        {/* 配套图片行（来自收藏短语的图片 ID） */}
        {(playbackPictograms?.length ?? 0) > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {playbackPictograms!.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <img
                  src={resolveImageSrc(p.imageUrl, p.labels.zh[0], '#2563EB')}
                  alt={p.labels.zh[0]}
                  className="w-16 h-16 rounded-2xl border border-slate-200 bg-white object-contain p-1 sm:h-20 sm:w-20"
                />
                <span className="text-sm text-slate-600 max-w-[72px] truncate">{p.labels.zh[0]}</span>
              </div>
            ))}
          </div>
        )}

        <p id="playback-sentence" className="text-2xl font-semibold text-slate-950 leading-relaxed mb-6 sm:text-3xl md:text-4xl sm:mb-8">
          {playbackSentence}
        </p>

        {isSpeaking && (
          <div className="mb-6 flex items-center justify-center gap-2 text-xl text-slate-600 animate-pulse" aria-label="正在播报">
            <LineIcon name="sound" className="h-5 w-5" />
          </div>
        )}

        {ttsError && (
          <div className="mb-6 flex items-center justify-center gap-2 text-lg text-amber-700" role="alert">
            <LineIcon name="alert" className="h-5 w-5" />
            <span>无法播报</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
          <button
            onClick={handleReplay}
            disabled={isSpeaking}
            aria-label={hasSpoken ? '重新播报' : '播报'}
            className="apple-press flex min-h-[52px] min-w-0 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-3 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:opacity-50 sm:gap-2 sm:px-6 sm:text-lg"
          >
            <LineIcon name={hasSpoken ? 'refresh' : 'sound'} className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">{hasSpoken ? '重播' : '播报'}</span>
          </button>
          <button
            onClick={handleFavorite}
            disabled={isSpeaking || saved}
            aria-label={saved ? '已收藏' : '收藏此句'}
            className={`apple-press flex min-h-[52px] min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-3 text-base font-semibold transition-colors disabled:opacity-50 sm:gap-2 sm:px-6 sm:text-lg
              ${saved ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
          >
            <LineIcon name={saved ? 'check' : 'star'} className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">{saved ? '已收藏' : '收藏'}</span>
          </button>
          <button
            onClick={handleDone}
            aria-label="播报完成，关闭"
            className="apple-press flex min-h-[52px] min-w-0 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-3 py-3 text-base font-semibold text-white transition-colors hover:bg-slate-800 sm:gap-2 sm:px-6 sm:text-lg"
          >
            <LineIcon name="check" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">完成</span>
          </button>
        </div>
      </div>
    </div>
  )
}
