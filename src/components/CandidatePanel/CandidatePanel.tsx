/**
 * CandidatePanel — 候选句自动轮流播报面板
 *
 * 流程：
 *   1. 生成中 → 骨架屏
 *   2. 生成完 → 立即开始 TTS，按序播报 3 句，每句播完高亮下一句
 *   3. 全部播完 → 显示"收藏 / 重播 / 完成"；可点击任意句单独重播
 *   「停止播报」按钮随时可中断
 */

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useConversationStore } from '@/stores/conversation-store'
import { useAI } from '@/hooks/use-ai'
import { addSavedPhraseIfMissing } from '@/repositories/saved-phrases-repository'
import { shouldDeferTtsAutoplay } from '@/utils/tts-environment'
import { LineIcon } from '@/components/ui/LineIcon'

type Phase = 'generating' | 'playing' | 'done' | 'error'
const GENERATION_WATCHDOG_MS = 20_000

export function CandidatePanel() {
  const showCandidatePanel = useAppStore((s) => s.showCandidatePanel)
  const selectedPictograms = useAppStore((s) => s.selectedPictograms)
  const candidateSentences = useAppStore((s) => s.candidateSentences)
  const isGenerating = useAppStore((s) => s.isGenerating)
  const setCandidates = useAppStore((s) => s.setCandidates)
  const clearCandidates = useAppStore((s) => s.clearCandidates)
  const setIsGenerating = useAppStore((s) => s.setIsGenerating)
  const setShowCandidatePanel = useAppStore((s) => s.setShowCandidatePanel)
  const clearSelection = useAppStore((s) => s.clearSelection)

  const ttsRate = useSettingsStore((s) => s.ttsRate)
  const recordExpression = useConversationStore((s) => s.recordExpression)
  const ai = useAI()
  const deferTtsAutoplay = shouldDeferTtsAutoplay()

  const [phase, setPhase] = useState<Phase>('generating')
  const [playIndex, setPlayIndex] = useState(0)    // 当前播报到第几句（done 阶段表示「选中句」）
  const [saved, setSaved] = useState(false)
  const [ttsError, setTtsError] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [isOfflineFallback, setIsOfflineFallback] = useState(false)
  const [isPlayingOne, setIsPlayingOne] = useState(false)  // 单句重播进行中
  const [generationAttempt, setGenerationAttempt] = useState(0)
  const stoppedRef = useRef(false)
  /**
   * 每次发起新的播报都会递增此计数器。
   * playSentences 在循环中检查 runId 是否仍然匹配，
   * 若不匹配则说明已被更新的调用抢占，直接退出，不再更新 UI。
   */
  const playRunRef = useRef(0)

  // ── 步骤1：面板打开后生成句子 ───────────────────────────────────────── //
  useEffect(() => {
    if (!showCandidatePanel) return
    if (selectedPictograms.length === 0) return
    if (candidateSentences.length > 0) return  // 已有句子时不重复生成

    stoppedRef.current = false
    setPhase('generating')
    setPlayIndex(0)
    setSaved(false)
    setTtsError(false)
    setGenerationError(null)
    setIsOfflineFallback(false)
    let active = true
    const watchdogId = window.setTimeout(() => {
      if (!active) return
      active = false
      setGenerationError('生成超时，请重试')
      setPhase('error')
      setIsGenerating(false)
    }, GENERATION_WATCHDOG_MS)

    async function generate() {
      setIsGenerating(true)
      try {
        const labels = selectedPictograms.map((p) => p.labels.zh[0])
        const result = await ai.generateSentences({ pictogramLabels: labels, candidateCount: 3 })
        if (active) {
          window.clearTimeout(watchdogId)
          if (result.candidates.length === 0) {
            setGenerationError('未能生成候选句，请重试')
            setPhase('error')
          } else {
            setIsOfflineFallback(result.isOfflineFallback)
            setCandidates(result.candidates)
          }
        }
      } catch (err) {
        if (active) {
          window.clearTimeout(watchdogId)
          setGenerationError(err instanceof Error ? err.message : '生成失败，请检查网络或 API 配置')
          setPhase('error')
        }
      } finally {
        if (active) setIsGenerating(false)
      }
    }
    generate()
    return () => {
      active = false
      window.clearTimeout(watchdogId)
      setIsGenerating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCandidatePanel, selectedPictograms, generationAttempt])

  // ── 步骤2：句子就绪后开始自动轮流播报 ─────────────────────────────── //
  useEffect(() => {
    if (candidateSentences.length === 0) return
    if (isGenerating) return
    if (phase === 'done') return

    if (deferTtsAutoplay) {
      playRunRef.current += 1
      stoppedRef.current = true
      ai.stopSpeaking()
      setTtsError(false)
      setIsPlayingOne(false)
      setPlayIndex(0)
      setPhase('done')
      return
    }

    setPhase('playing')
    setPlayIndex(0)
    stoppedRef.current = false

    const runId = ++playRunRef.current
    playSentences(0, runId)

    return () => {
      // 递增使旧 runId 失效，让正在运行的 playSentences 自行退出，不再更新 UI
      playRunRef.current = runId + 1
      ai.stopSpeaking()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateSentences])

  async function playSentences(startIdx: number, runId: number) {
    setTtsError(false)
    for (let i = startIdx; i < candidateSentences.length; i++) {
      if (stoppedRef.current || playRunRef.current !== runId) break
      setPlayIndex(i)
      const result = await ai.speak({ text: candidateSentences[i], lang: 'zh-CN', rate: ttsRate })
      if (!result.success && playRunRef.current === runId) {
        setTtsError(true)
      }
      if (stoppedRef.current || playRunRef.current !== runId) break
      // 句间停顿 500ms
      await new Promise<void>((r) => setTimeout(r, 500))
    }
    if (!stoppedRef.current && playRunRef.current === runId) {
      setPhase('done')
    }
  }

  /**
   * 点击某句单独重播（playing 或 done 阶段均可）。
   * 通过递增 playRunRef 使正在运行的 playSentences 失效，
   * 然后以新 runId 播放选中句，完成后进入 done 阶段。
   */
  async function handlePlayOne(index: number) {
    if (phase !== 'done' && phase !== 'playing') return

    // 取消当前轮播（不需要等待 80ms，runId 检查会在 await 后立即生效）
    const runId = ++playRunRef.current
    ai.stopSpeaking()

    setIsPlayingOne(true)
    setPlayIndex(index)
    setSaved(false)
    setTtsError(false)

    const result = await ai.speak({ text: candidateSentences[index], lang: 'zh-CN', rate: ttsRate })

    // 检查此次播放仍有效（未被更新的点击抢占）
    if (playRunRef.current === runId) {
      setIsPlayingOne(false)
      if (!result.success) setTtsError(true)
      setPhase('done')
    }
  }

  function handleStop() {
    stoppedRef.current = true
    ai.stopSpeaking()
    setPhase('done')
  }

  function handleReplay() {
    if (candidateSentences.length === 0) return
    const runId = ++playRunRef.current
    stoppedRef.current = false
    setPhase('playing')
    setPlayIndex(0)
    setSaved(false)
    playSentences(0, runId)
  }

  async function handleSaveFavorite() {
    if (saved || candidateSentences.length === 0) return
    // 保存当前选中/停留的那句
    const sentence = candidateSentences[playIndex] ?? candidateSentences[0]
    setSaved(true)
    await addSavedPhraseIfMissing(sentence, selectedPictograms.map((p) => p.id))
  }

  function handleBack() {
    ai.stopSpeaking()
    stoppedRef.current = true
    clearCandidates()
    setShowCandidatePanel(false)
  }

  function handleDismiss() {
    ai.stopSpeaking()
    stoppedRef.current = true
    setIsGenerating(false)
    setShowCandidatePanel(false)
  }

  /** 在不清空图片选择的情况下重新发起生成（网络错误后使用） */
  function handleRetry() {
    clearCandidates()   // 重置 candidateSentences → 触发步骤1 useEffect 重新生成
    setGenerationError(null)
    setPhase('generating')
    setGenerationAttempt((attempt) => attempt + 1)
  }

  function handleDone() {
    ai.stopSpeaking()
    stoppedRef.current = true

    // 记录本次患者表达（selectedSentence = 当前播报/选中的句子）
    if (candidateSentences.length > 0) {
      const selectedSentence = candidateSentences[playIndex] ?? candidateSentences[0]
      recordExpression({
        direction: 'express',
        pictogramIds: selectedPictograms.map((p) => p.id),
        pictogramLabels: selectedPictograms.map((p) => p.labels.zh[0]),
        candidateSentences,
        selectedSentence,
      })
    }

    setShowCandidatePanel(false)
    clearSelection()
  }

  if (!showCandidatePanel) return null

  const panel = (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-panel-title"
      aria-live="polite"
      className="candidate-sheet-in radius-sheet flex max-h-[86dvh] w-full flex-col overflow-hidden border-t border-slate-200 bg-white sm:max-h-[82dvh]"
    >
      <div className="flex shrink-0 justify-center pt-2" aria-hidden="true">
        <span className="h-1.5 w-10 rounded-full bg-slate-200" />
      </div>

      {/* 头部 */}
      <div className="mb-1 shrink-0 px-4 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <h2 id="candidate-panel-title" className="text-lg font-semibold text-slate-950">
            {phase === 'generating' && '正在生成…'}
            {phase === 'playing' && `播报中 ${playIndex + 1} / ${candidateSentences.length}`}
            {phase === 'done' && (deferTtsAutoplay ? '选择播报' : '播报完成')}
            {phase === 'error' && '生成失败'}
          </h2>
          <button
            onClick={handleBack}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="返回修改图片选择"
          >
            <LineIcon name="arrowLeft" className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">返回修改</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <div className="mx-auto w-full max-w-5xl">
          {isOfflineFallback && (phase === 'playing' || phase === 'done') && (
            <div className="mb-2 flex justify-center" aria-label="离线模式">
              <LineIcon name="sparkle" className="h-5 w-5 text-slate-400" />
            </div>
          )}

          {/* TTS 不可用提示（非阻断，仅提示） */}
          {ttsError && (phase === 'playing' || phase === 'done') && (
            <div className="mb-3 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
              无法播报
            </div>
          )}

          {/* 生成中骨架屏 */}
          {phase === 'generating' && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {/* 生成失败 */}
          {phase === 'error' && (
            <div className="py-6 text-center space-y-3">
              <LineIcon name="alert" className="mx-auto h-10 w-10 text-rose-500" />
              <p className="text-base text-slate-600">{generationError ?? '生成失败'}</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={handleRetry}
                  className="apple-press flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-2.5 text-base font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <LineIcon name="refresh" className="h-5 w-5 shrink-0" />
                  <span className="whitespace-nowrap">重试</span>
                </button>
                <button
                  onClick={handleBack}
                  className="apple-press flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-slate-100 px-6 py-2.5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <LineIcon name="arrowLeft" className="h-5 w-5 shrink-0" />
                  <span className="whitespace-nowrap">返回修改</span>
                </button>
              </div>
            </div>
          )}

          {/* 播报中 — 点击任意句可打断并单独重播 */}
          {phase === 'playing' && candidateSentences.length > 0 && (
            <div role="list" aria-label="候选句列表" className="space-y-2.5">
              {candidateSentences.map((sentence, i) => {
                const isActive = i === playIndex
                const isPast   = i < playIndex
                return (
                  <button
                    key={i}
                    role="listitem"
                    onClick={() => handlePlayOne(i)}
                    disabled={isPlayingOne}
                    aria-label={`候选句 ${i + 1}：${sentence}${isActive ? '（正在播报）' : ''}`}
                    aria-pressed={isActive}
                    className={`apple-press radius-card w-full flex items-center gap-3 border px-4 py-3.5 text-left transition-colors
                      disabled:cursor-not-allowed
                      ${isActive
                        ? 'border-slate-950 bg-white'
                        : isPast
                          ? 'border-slate-200 bg-white/70 opacity-70 hover:bg-white'
                          : 'border-slate-200 bg-white/55 opacity-55 hover:bg-white'
                      }`}
                  >
                    <span className="text-xl shrink-0" aria-hidden="true">
                      {isActive ? <LineIcon name="sound" className="h-5 w-5" /> : isPast ? <LineIcon name="check" className="h-5 w-5" /> : <LineIcon name="play" className="h-5 w-5" />}
                    </span>
                    <span className={`text-xl flex-1 leading-snug ${isActive ? 'font-semibold text-slate-950' : 'text-slate-600'}`}>
                      {sentence}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* 完成 — 句子可点击单独重播 */}
          {phase === 'done' && candidateSentences.length > 0 && (
            <div role="list" aria-label="候选句列表" className="space-y-2.5">
              {candidateSentences.map((sentence, i) => {
                const isSelected = i === playIndex
                return (
                  <button
                    key={i}
                    role="listitem"
                    onClick={() => handlePlayOne(i)}
                    disabled={isPlayingOne}
                    aria-label={`候选句 ${i + 1}：${sentence}，点击重播`}
                    aria-pressed={isSelected && isPlayingOne}
                    className={`apple-press radius-card w-full flex items-center gap-3 border px-4 py-3.5 text-left transition-colors
                      disabled:cursor-not-allowed
                      ${isSelected
                        ? 'border-slate-950 bg-white'
                        : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                  >
                    <span className="text-xl shrink-0" aria-hidden="true">
                      {isSelected && isPlayingOne ? <LineIcon name="sound" className="h-5 w-5" /> : isSelected ? <LineIcon name="check" className="h-5 w-5" /> : <LineIcon name="play" className="h-5 w-5" />}
                    </span>
                    <span className={`text-xl flex-1 leading-snug ${isSelected ? 'font-semibold text-slate-950' : 'text-slate-600'}`}>
                      {sentence}
                    </span>
                    {isSelected && isPlayingOne && <LineIcon name="sound" className="h-4 w-4 shrink-0 text-slate-400" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮行 */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto w-full max-w-5xl">
          {phase === 'playing' && (
            <button
              onClick={handleStop}
              className="apple-press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-rose-700"
            >
              <LineIcon name="stop" className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">停止播报</span>
            </button>
          )}

          {phase === 'done' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                onClick={deferTtsAutoplay ? () => handlePlayOne(playIndex) : handleReplay}
                disabled={isPlayingOne}
                className="apple-press flex min-h-[48px] min-w-0 items-center justify-center gap-2 rounded-full bg-slate-100 px-3 py-3 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                <LineIcon name={deferTtsAutoplay ? 'sound' : 'refresh'} className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">{deferTtsAutoplay ? '播报' : '全部重播'}</span>
              </button>
              <button
                onClick={handleSaveFavorite}
                disabled={saved}
                className={`apple-press flex min-h-[48px] min-w-0 items-center justify-center gap-2 rounded-full px-3 py-3 text-base font-semibold transition-colors
                  ${saved
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
              >
                <LineIcon name={saved ? 'check' : 'star'} className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">{saved ? '已收藏' : '收藏此句'}</span>
              </button>
              <button
                onClick={handleDone}
                className="apple-press col-span-2 flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-lg font-semibold text-white transition-colors hover:bg-slate-800 sm:col-span-1 sm:min-h-[48px] sm:text-base"
              >
                <LineIcon name="check" className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">完成</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/35" role="presentation">
      <button
        type="button"
        aria-label="关闭候选句播报面板"
        className="absolute inset-0 cursor-default"
        onClick={handleDismiss}
      />
      <div className="relative z-10 w-full">
        {panel}
      </div>
    </div>
  )
}
