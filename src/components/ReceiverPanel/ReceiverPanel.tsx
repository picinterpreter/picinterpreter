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
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import type { PictogramEntry } from '@/types'
import type { MatchedToken } from '@/utils/text-to-image-matcher'
import { ReceiverDisplayOverlay, type DisplayItem } from './ReceiverDisplayOverlay'

// ─── 类型 ────────────────────────────────────────────────────────────────── //

/**
 * 阶段流转：
 *   idle → matching → (ai-refining?) → review
 *   ai-refining 仅在匹配率 < 0.6 或存在未匹配词时触发。
 */
type Phase = 'idle' | 'matching' | 'ai-refining' | 'review'

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
  none:              'bg-gray-100 text-gray-400',
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
  const setActiveMode = useAppStore((s) => s.setActiveMode)
  const [phase, setPhase] = useState<Phase>('idle')
  const [inputText, setInputText] = useState('')
  const [items, setItems] = useState<EditableItem[]>([])

  // AbortController ref：在组件卸载 / 重置时取消正在进行的 AI fetch 请求
  const aiAbortRef = useRef<AbortController | null>(null)
  useEffect(() => () => { aiAbortRef.current?.abort() }, [])

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
  async function doMatch(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    // 取消上一次未完成的 AI 请求（快速重复提交、重置等）
    aiAbortRef.current?.abort()

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
      const unmatchedTokens = result.matches
        .filter((m) => m.pictogram === null)
        .map((m) => m.token)
      const needsAiFallback = result.matchRate < 0.6 || unmatchedTokens.length > 0

      if (needsAiFallback) {
        setPhase('ai-refining')

        const ctrl = new AbortController()
        aiAbortRef.current = ctrl

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
    aiAbortRef.current?.abort()
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

  // 当前正在换图的 item（用于弹窗标题）
  const swapItem = items.find((item) => item.id === swapItemId)

  // ── 渲染 ─────────────────────────────────────────────────────────────── //
  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      <div className="sticky top-0 z-10 flex min-h-12 items-center justify-between border-b border-stone-300 bg-[#2d2d2d] px-3 text-white">
        <button
          onClick={() => setActiveMode('express')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-2xl"
          aria-label="返回主界面"
          title="返回主界面"
        >
          ←
        </button>
        <p className="truncate px-3 text-sm font-medium">接收模式</p>
        <div className="min-w-11" aria-hidden="true" />
      </div>

      {/* ── 输入阶段 ──────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            输入家人 / 护工想说的内容，自动转为图片序列展示给患者。
          </p>

          {matchError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              ⚠ {matchError}
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
              placeholder={isListening ? '正在聆听…' : '输入一句话，如：今天吃什么'}
              readOnly={isListening}
              className={`flex-1 border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors
                ${isListening
                  ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-purple-400'
                }`}
              autoFocus
              aria-live="polite"
              aria-busy={isListening}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isListening}
              className="px-5 py-3 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-purple-700 transition-colors min-h-[44px]"
            >
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
              className={`w-full py-3 rounded-xl border-2 text-base font-medium flex items-center justify-center gap-2 transition-all min-h-[44px]
                ${isListening
                  ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                  : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
            >
              {isListening
                ? <><span className="text-xl">🔴</span> 聆听中，点击停止</>
                : <><span className="text-xl">🎤</span> 开始录音</>
              }
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center">
              浏览器识别需要 Chrome / Edge
            </p>
          )}

          {/* ASR 错误提示 */}
          {asrError && (
            <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              ⚠ {asrError}
            </div>
          )}

          {/* 示例短语 */}
          <div>
            <p className="text-xs text-gray-400 mb-2">常见示例：</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => { setInputText(phrase); doMatch(phrase) }}
                  className="text-sm px-3 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-full text-purple-700 transition-colors"
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
            <p className="text-gray-500">正在匹配图片…</p>
          </div>
        </div>
      )}

      {/* ── AI 辅助优化中（匹配率不足时自动触发） ──────────────────────── */}
      {phase === 'ai-refining' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 font-medium">AI 正在优化匹配…</p>
            <p className="text-xs text-gray-400">部分词语未找到图片，正在用 AI 重新分析</p>
          </div>
        </div>
      )}

      {/* ── 审查 / 编辑阶段 ───────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">

          {/* 原始输入 + 重新输入按钮 */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-400">原始输入</p>
              <p className="text-base text-gray-800 font-medium break-words">{inputText}</p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 rounded-lg shrink-0 min-h-[44px]"
            >
              重新输入
            </button>
          </div>

          {/* 匹配统计 + 操作提示 */}
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>
              共 {items.length} 个词，已匹配 {matchedCount} 个图片
            </p>
            {unmatchedCount > 0 && (
              <p className="text-amber-600">
                {unmatchedCount} 个词未找到图片，点击卡片左侧「?」可手动选图
              </p>
            )}
            {matchedCount === 0 && (
              <p className="text-red-600 font-medium">
                无可展示图片，请点击「?」手动选图或重新输入
              </p>
            )}
          </div>

          {/* 词条卡片列表 */}
          <div className="space-y-2">
            {items.map((item, index) => {
              const hasImage = item.pictogram !== null
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 ${
                    hasImage
                      ? 'border-purple-200 bg-white'
                      : 'border-dashed border-gray-200 bg-gray-50'
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
                        className="w-12 h-12 object-contain rounded-lg group-hover:opacity-70 transition-opacity"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xl group-hover:bg-purple-50 group-hover:border-purple-300 transition-colors">
                        ?
                      </div>
                    )}
                    <span className="text-xs text-gray-400 mt-0.5 group-hover:text-purple-500 transition-colors leading-none">
                      换图
                    </span>
                  </button>

                  {/* 词条 + 标签 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-800 truncate">{item.token}</p>
                    {hasImage && (
                      <p className="text-xs text-gray-400 truncate">{item.pictogram!.labels.zh[0]}</p>
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
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      aria-label="向前移动"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => handleMoveRight(index)}
                      disabled={index === items.length - 1}
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      aria-label="向后移动"
                    >
                      →
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label={`删除「${item.token}」`}
                    >
                      ×
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
            className="w-full py-3.5 rounded-xl bg-purple-600 text-white text-lg font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors min-h-[48px] shadow"
          >
            展示给患者 ▶
          </button>
        </div>
      )}

      {/* ── 换图弹窗 ──────────────────────────────────────────────────── */}
      {swapItemId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="swap-dialog-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-end"
          onClick={() => setSwapItemId(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-4 max-h-[72vh] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="swap-dialog-title" className="text-base font-semibold text-gray-800">
                替换「{swapItem?.token ?? '…'}」的图片
              </h3>
              <button
                onClick={() => setSwapItemId(null)}
                className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
                aria-label="关闭换图"
              >
                ✕
              </button>
            </div>
            <input
              type="search"
              value={swapQuery}
              onChange={(e) => setSwapQuery(e.target.value)}
              placeholder="搜索图片…"
              className="border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400"
              autoFocus
            />
            <div className="overflow-y-auto grid grid-cols-4 gap-2 pb-2">
              {(swapResults ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectSwap(p)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 border-gray-100 hover:border-purple-400 hover:bg-purple-50 transition-colors active:scale-95"
                >
                  <img
                    src={resolveImageSrc(p.imageUrl, p.labels.zh[0], '#7c3aed')}
                    alt={p.labels.zh[0]}
                    className="w-12 h-12 object-contain"
                  />
                  <span className="text-xs text-center text-gray-700 truncate w-full leading-tight">
                    {p.labels.zh[0]}
                  </span>
                </button>
              ))}
              {(swapResults ?? []).length === 0 && debouncedSwapQuery.trim() && (
                <div className="col-span-4 text-center py-8 text-gray-400 text-sm">
                  没有找到「{debouncedSwapQuery}」
                </div>
              )}
              {(swapResults ?? []).length === 0 && !debouncedSwapQuery.trim() && swapItemId !== null && (
                <div className="col-span-4 text-center py-8 text-gray-400 text-sm">
                  正在加载…
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
