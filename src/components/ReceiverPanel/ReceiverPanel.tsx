/**
 * ReceiverPanel — 接收端主流程
 *
 * 家属 / 护工输入文字（或语音）→ 自动转为图片序列 → 编辑（换图 / 删除 / 排序）→ 全屏展示给患者。
 *
 * 阶段：
 *   idle      文字输入 + 语音输入（Web Speech API）
 *   matching  匹配中（转圈）
 *   review    图片列表 + 编辑操作 + 换图弹窗
 *   [display] ReceiverDisplayOverlay 覆盖层
 */

import { useEffect, useRef, useState } from 'react'
import { useWebSpeech } from '@/hooks/use-web-speech'
import { useLiveQuery } from 'dexie-react-hooks'
import { matchTextToImages } from '@/utils/text-to-image-matcher'
import { aiResegment } from '@/utils/ai-resegment'
import { resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { searchAndStoreMissingPictograms } from '@/utils/runtime-pictogram-search'
import { db } from '@/db'
import type { PictogramEntry } from '@/types'
import type { MatchedToken, TextToImageMatchResult } from '@/utils/text-to-image-matcher'
import { ReceiverDisplayOverlay, type DisplayItem } from './ReceiverDisplayOverlay'
import { LineIcon } from '@/components/ui/LineIcon'

// ─── 类型 ────────────────────────────────────────────────────────────────── //

/**
 * 阶段流转：
 *   idle → matching → (ai-refining?) → (image-searching?) → review
 *   ai-refining 仅在匹配率 < 0.6 或存在未匹配词时触发。
 */
type Phase = 'idle' | 'matching' | 'ai-refining' | 'image-searching' | 'review'

/**
 * 'manual' = 用户手动通过「换图」选取的图片，区别于自动匹配的几种类型。
 */
type ItemMatchType = MatchedToken['matchType'] | 'manual'

interface EditableItem {
  /** 稳定 React key，贯穿整个编辑生命周期 */
  id: string
  token: string
  pictogram: PictogramEntry | null
  matchType: ItemMatchType
}

// ─── 常量 ────────────────────────────────────────────────────────────────── //

const EXAMPLE_PHRASES = [
  // 日常关怀
  '今天吃什么',
  '需要喝水吗',
  '需要去厕所吗',
  // 身体询问
  '你感觉怎么样',
  '你头晕吗',
  '你发烧了吗',
  '感觉恶心吗',
  // 医疗场景
  '需要吃药吗',
  '医生来看你了',
  '我们要去医院',
]

const MATCH_TYPE_BADGE: Record<ItemMatchType, string> = {
  exact:             'bg-green-100 text-green-700',
  synonym:           'bg-blue-100 text-blue-700',
  'lexicon-synonym': 'bg-yellow-100 text-yellow-700',
  partial:           'bg-orange-100 text-orange-700',
  manual:            'bg-purple-100 text-purple-700',
  none:              'bg-slate-100 text-slate-400',
}

const MATCH_TYPE_LABEL: Record<ItemMatchType, string> = {
  exact:             '精确',
  synonym:           '同义词',
  'lexicon-synonym': '词库',
  partial:           '包含',
  manual:            '手动选图',
  none:              '未匹配',
}

// ─── 主组件 ──────────────────────────────────────────────────────────────── //

export function ReceiverPanel() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [inputText, setInputText] = useState('')
  const [items, setItems] = useState<EditableItem[]>([])

  // AbortController ref：在组件卸载 / 重置时取消正在进行的 AI/补图请求
  const pendingRequestRef = useRef<AbortController | null>(null)
  useEffect(() => () => { pendingRequestRef.current?.abort() }, [])

  // 匹配世代计数器：每次 doMatch 调用自增，用于防止旧请求完成后覆盖新状态
  const matchGenRef = useRef(0)

  // ── 语音输入 ──────────────────────────────────────────────────────────── //
  // Web Speech API（浏览器内置，无需代理）
  const webSpeech = useWebSpeech()
  const isListening = webSpeech.isListening
  const interimText = webSpeech.interimText
  const asrError = webSpeech.error
  const startListening = webSpeech.startListening
  const stopListening = webSpeech.stopListening

  const [matchError, setMatchError] = useState<string | null>(null)

  // 换图弹窗：用 item.id（稳定 UUID）而非数组下标，避免下标漂移问题
  const [swapItemId, setSwapItemId] = useState<string | null>(null)
  const [swapQuery, setSwapQuery] = useState('')
  const [debouncedSwapQuery, setDebouncedSwapQuery] = useState('')

  // 全屏展示弹窗
  const [showDisplay, setShowDisplay] = useState(false)

  // ── 防抖：250ms 后才更新 liveQuery 依赖，避免全表扫描频繁触发 ─────── //
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSwapQuery(swapQuery), 250)
    return () => clearTimeout(timer)
  }, [swapQuery])

  // ── Escape 关闭换图弹窗 ──────────────────────────────────────────────── //
  useEffect(() => {
    if (swapItemId === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSwapItemId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [swapItemId])

  // ── 换图搜索（liveQuery 始终挂载，swapItemId 控制激活） ─────────────── //
  const swapResults = useLiveQuery(async (): Promise<PictogramEntry[]> => {
    if (swapItemId === null) return []
    const q = debouncedSwapQuery.trim()
    if (!q) {
      return db.pictograms.orderBy('usageCount').reverse().limit(24).toArray()
    }
    return db.pictograms
      .filter(
        (p) =>
          p.labels.zh.some((l) => l.includes(q)) ||
          p.synonyms.some((s) => s.includes(q)),
      )
      .limit(24)
      .toArray()
  }, [swapItemId, debouncedSwapQuery])

  // ── 文本匹配 ─────────────────────────────────────────────────────────── //
  function getUnmatchedTokens(result: TextToImageMatchResult): string[] {
    return result.matches
      .filter((m) => m.pictogram === null)
      .map((m) => m.token)
  }

  async function doMatch(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    // 取消上一次未完成的 AI / 补图请求（快速重复提交、重置等）
    pendingRequestRef.current?.abort()

    // 世代令牌：本次调用结束前若世代已更新，说明有新的 doMatch 或 reset 发生
    const gen = ++matchGenRef.current

    setPhase('matching')
    setMatchError(null)

    try {
      // Step 1: 规则式分词 + 图片匹配
      let result = await matchTextToImages(trimmed)

      // 检查世代：是否已被新请求或 reset 取代
      if (matchGenRef.current !== gen) return

      if (result.matches.length === 0) {
        setMatchError('未能识别任何词语，请重新输入')
        setPhase('idle')
        return
      }

      // Step 2: 若匹配率低或有未匹配词，且 AI 已配置，触发 AI 辅助重分词
      const unmatchedTokens = getUnmatchedTokens(result)
      const needsAiFallback = result.matchRate < 0.6 || unmatchedTokens.length > 0

      if (needsAiFallback) {
        setPhase('ai-refining')

        const ctrl = new AbortController()
        pendingRequestRef.current = ctrl

        const aiTokens = await aiResegment({
          text: trimmed,
          unmatchedTokens,
          signal: ctrl.signal,
        })

        // 双重检查：AbortController（取消 fetch）+ 世代计数器（取消状态提交）
        if (ctrl.signal.aborted || matchGenRef.current !== gen) return

        // 若 AI 返回有效词列表，重新匹配；结果更差则沿用规则式结果
        if (aiTokens && aiTokens.length > 0) {
          const aiResult = await matchTextToImages(trimmed, { preSegmented: aiTokens })
          if (matchGenRef.current !== gen) return
          if (aiResult.matchRate >= result.matchRate) {
            result = aiResult
          }
        }
      }

      const stillUnmatchedTokens = getUnmatchedTokens(result)
      if (stillUnmatchedTokens.length > 0) {
        setPhase('image-searching')

        const ctrl = new AbortController()
        pendingRequestRef.current = ctrl

        const addedPictograms = await searchAndStoreMissingPictograms(stillUnmatchedTokens, ctrl.signal)
        if (ctrl.signal.aborted || matchGenRef.current !== gen) return

        if (addedPictograms.length > 0) {
          const repairedResult = await matchTextToImages(trimmed, {
            preSegmented: result.segmentation.segments,
          })
          if (matchGenRef.current !== gen) return
          if (repairedResult.matchRate >= result.matchRate) {
            result = repairedResult
          }
        }
      }

      setItems(
        result.matches.map((m) => ({
          id: crypto.randomUUID(),
          token: m.token,
          pictogram: m.pictogram,
          matchType: m.matchType,
        })),
      )
      setPhase('review')
    } catch (err) {
      if (matchGenRef.current !== gen) return
      setMatchError(err instanceof Error ? err.message : '分析失败，请重试')
      setPhase('idle')
    }
  }

  // ── 编辑操作（均为不可变更新） ───────────────────────────────────────── //
  function handleDelete(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  function handleMoveLeft(index: number) {
    if (index === 0) return
    setItems((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function handleMoveRight(index: number) {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function handleOpenSwap(itemId: string) {
    setSwapItemId(itemId)
    setSwapQuery('')
    setDebouncedSwapQuery('')
  }

  /** 换图确认：以 id 定位，打上 'manual' 标签 */
  function handleSelectSwap(pictogram: PictogramEntry) {
    if (swapItemId === null) return
    setItems((prev) =>
      prev.map((item) =>
        item.id === swapItemId
          ? { ...item, pictogram, matchType: 'manual' as const }
          : item,
      ),
    )
    setSwapItemId(null)
    setSwapQuery('')
  }

  function handleReset() {
    pendingRequestRef.current?.abort()
    matchGenRef.current++ // 使任何正在进行的 doMatch 放弃提交状态
    setPhase('idle')
    setItems([])
    setInputText('')
    setMatchError(null)
  }

  // ── 计算展示用的 matched items ────────────────────────────────────────── //
  const displayItems: DisplayItem[] = items
    .filter((item): item is EditableItem & { pictogram: PictogramEntry } =>
      item.pictogram !== null,
    )
    .map((item) => ({
      id: item.id,
      token: item.token,
      pictogram: item.pictogram,
    }))

  const unmatchedCount = items.filter((item) => item.pictogram === null).length
  const matchedCount = displayItems.length

  // ── 渲染 ─────────────────────────────────────────────────────────────── //
  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

      {/* ── 输入阶段 ──────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="p-4 space-y-4">
          {matchError && (
            <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
              未识别
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); doMatch(inputText) }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={isListening ? interimText || inputText : inputText}
              onChange={(e) => { if (!isListening) setInputText(e.target.value) }}
              placeholder={isListening ? '聆听中' : '输入'}
              readOnly={isListening}
              className={`flex-1 border rounded-2xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors
                ${isListening
                  ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-300'
                  : 'border-slate-200 focus:ring-purple-400'
                }`}
              autoFocus
              aria-live="polite"
              aria-busy={isListening}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isListening}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
            >
              <LineIcon name="arrowRight" className="h-5 w-5" />
              转换
            </button>
          </form>

          {/* 语音输入按钮 */}
          {webSpeech.isAvailable ? (
            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  stopListening()
                } else {
                  setInputText('')
                  startListening((finalText) => {
                    if (phase !== 'idle') return
                    setInputText(finalText)
                    doMatch(finalText)
                  })
                }
              }}
              aria-label={isListening ? '停止录音' : '开始语音输入'}
              className={`w-full py-3 rounded-2xl border-2 text-base font-medium flex items-center justify-center gap-2 transition-all min-h-[44px]
                ${isListening
                  ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              {isListening
                ? <><LineIcon name="stop" className="h-5 w-5" /> 停止</>
                : <><LineIcon name="mic" className="h-5 w-5" /> 录音</>
              }
            </button>
          ) : (
            <LineIcon name="sound" className="mx-auto h-5 w-5 text-slate-300" />
          )}

          {/* ASR 错误提示 */}
          {asrError && (
            <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              无法录音
            </div>
          )}

          {/* 示例短语 */}
          <div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => { setInputText(phrase); doMatch(phrase) }}
                  className="text-sm px-3 py-1.5 bg-white hover:bg-slate-50 rounded-full text-slate-700 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] transition-colors"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 匹配中 ────────────────────────────────────────────────────── */}
      {phase === 'matching' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500">匹配中</p>
          </div>
        </div>
      )}

      {/* ── AI 辅助优化中（匹配率不足时自动触发） ──────────────────────── */}
      {phase === 'ai-refining' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <LineIcon name="sparkle" className="mx-auto h-5 w-5 text-slate-400" />
          </div>
        </div>
      )}

      {/* ── 专用 AAC 图库补图 ─────────────────────────────────────────── */}
      {phase === 'image-searching' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500">补图中</p>
          </div>
        </div>
      )}

      {/* ── 审查 / 编辑阶段 ───────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">

          {/* 原始输入 + 重新输入按钮 */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base text-slate-900 font-medium break-words">{inputText}</p>
            </div>
            <button
              onClick={handleReset}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-gray-600"
            >
              <LineIcon name="refresh" className="h-4 w-4" />
              重新输入
            </button>
          </div>

          {/* 匹配统计 + 操作提示 */}
          <div className="flex gap-1" aria-label={`已匹配 ${matchedCount} 张图片`}>
            {Array.from({ length: Math.max(matchedCount, 1) }).slice(0, 8).map((_, idx) => (
              <span key={idx} className={`h-1.5 w-6 rounded-full ${matchedCount > 0 ? 'bg-slate-900' : 'bg-rose-400'}`} />
            ))}
            {unmatchedCount > 0 && <span className="h-1.5 w-6 rounded-full bg-amber-400" />}
          </div>

          {/* 词条卡片列表 */}
          <div className="space-y-2">
            {items.map((item, index) => {
              const hasImage = item.pictogram !== null
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 ${
                    hasImage
                      ? 'border-purple-200 bg-white'
                      : 'border-dashed border-gray-200 bg-slate-50'
                  }`}
                >
                  {/* 图片缩略图（点击换图） */}
                  <button
                    onClick={() => handleOpenSwap(item.id)}
                    className="flex flex-col items-center w-16 shrink-0 group min-h-[60px] justify-center"
                    aria-label={`替换「${item.token}」的图片`}
                    title="点击换图"
                  >
                    {hasImage ? (
                      <img
                        src={resolveImageSrc(item.pictogram!.imageUrl, item.token, '#7c3aed')}
                        alt={item.pictogram!.labels.zh[0]}
                        className="w-12 h-12 object-contain rounded-xl group-hover:opacity-70 transition-opacity"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xl group-hover:bg-purple-50 group-hover:border-purple-300 transition-colors">
                        ?
                      </div>
                    )}
                    <span className="text-xs text-slate-400 mt-0.5 group-hover:text-purple-500 transition-colors leading-none">
                      换
                    </span>
                  </button>

                  {/* 词条 + 标签 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-slate-900 truncate">{item.token}</p>
                    {hasImage && (
                      <p className="text-xs text-slate-400 truncate">{item.pictogram!.labels.zh[0]}</p>
                    )}
                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${MATCH_TYPE_BADGE[item.matchType]}`}>
                      {MATCH_TYPE_LABEL[item.matchType]}
                    </span>
                  </div>

                  {/* 排序 + 删除按钮（min 44px touch targets） */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleMoveLeft(index)}
                      disabled={index === 0}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-gray-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      aria-label="向前移动"
                    >
                      <LineIcon name="arrowLeft" className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleMoveRight(index)}
                      disabled={index === items.length - 1}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-gray-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      aria-label="向后移动"
                    >
                      <LineIcon name="arrowRight" className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label={`删除「${item.token}」`}
                    >
                      <LineIcon name="trash" className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 展示给患者 */}
          <button
            onClick={() => setShowDisplay(true)}
            disabled={matchedCount === 0}
            className="apple-press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-slate-950 py-3.5 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-40"
          >
            <LineIcon name="eye" className="h-5 w-5" />
            展示给患者
          </button>
        </div>
      )}

      {/* ── 换图弹窗 ──────────────────────────────────────────────────── */}
      {swapItemId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="swap-dialog-title"
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xl flex items-end"
          onClick={() => setSwapItemId(null)}
        >
          <div
            className="w-full bg-white rounded-t-[32px] p-4 max-h-[72vh] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="swap-dialog-title" className="text-base font-semibold text-slate-900">
                换图
              </h3>
              <button
                onClick={() => setSwapItemId(null)}
                className="text-slate-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
                aria-label="关闭换图"
              >
                <LineIcon name="close" className="h-5 w-5" />
              </button>
            </div>
            <input
              type="search"
              value={swapQuery}
              onChange={(e) => setSwapQuery(e.target.value)}
              placeholder="搜索"
              className="border border-slate-200 rounded-2xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400"
              autoFocus
            />
            <div className="overflow-y-auto grid grid-cols-4 gap-2 pb-2">
              {(swapResults ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectSwap(p)}
                  className="flex flex-col items-center gap-1 p-2 rounded-2xl border-2 border-slate-100 hover:border-purple-400 hover:bg-purple-50 transition-colors active:scale-95"
                >
                  <img
                    src={resolveImageSrc(p.imageUrl, p.labels.zh[0], '#7c3aed')}
                    alt={p.labels.zh[0]}
                    className="w-12 h-12 object-contain"
                  />
                  <span className="text-xs text-center text-slate-700 truncate w-full leading-tight">
                    {p.labels.zh[0]}
                  </span>
                </button>
              ))}
              {(swapResults ?? []).length === 0 && debouncedSwapQuery.trim() && (
                <div className="col-span-4 text-center py-8 text-slate-400 text-sm">
                  未找到
                </div>
              )}
              {(swapResults ?? []).length === 0 && !debouncedSwapQuery.trim() && swapItemId !== null && (
                <div className="col-span-4 text-center py-8 text-slate-400 text-sm">
                  加载中
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 全屏展示覆盖层 ────────────────────────────────────────────── */}
      {showDisplay && (
        <ReceiverDisplayOverlay
          items={displayItems}
          inputText={inputText}
          onBack={() => setShowDisplay(false)}
          onDone={() => {
            setShowDisplay(false)
            handleReset()
          }}
        />
      )}
    </div>
  )
}
