/**
 * Phase 1.5 文本→图片匹配验证页面。
 *
 * 用于开发期验证 matchTextToImages 管线效果：
 * - 分词结果可视化
 * - 每个 token 的匹配图片和匹配方式
 * - 整体匹配率和耗时指标
 *
 * 入口：/debug
 */

import { useState, useCallback } from 'react'
import { matchTextToImages, type TextToImageMatchResult, type MatchedToken } from '@/utils/text-to-image-matcher'
import { generatePlaceholderSvg } from '@/utils/generate-placeholder-svg'
import { LineIcon } from '@/components/ui/LineIcon'

const MATCH_TYPE_STYLE: Record<MatchedToken['matchType'], string> = {
  exact:    'bg-green-100 text-green-800',
  synonym:  'bg-blue-100 text-blue-800',
  lexicon:  'bg-yellow-100 text-yellow-800',
  partial:  'bg-orange-100 text-orange-800',
  missing:  'bg-slate-100 text-slate-500',
}

const MATCH_TYPE_LABEL: Record<MatchedToken['matchType'], string> = {
  exact:    '精确',
  synonym:  '同义词',
  lexicon:  '词库',
  partial:  '包含',
  missing:  '未匹配',
}

const EXAMPLE_SENTENCES = [
  // 基础需求
  '我想吃饭',
  '我想喝水谢谢',
  '我要去厕所',
  // 情感表达
  '妈妈我肚子饿了',
  '今天我很开心',
  // 身体症状（测试医疗词汇匹配）
  '我头痛不舒服',
  '我感冒了很累',
  '我发烧了咳嗽',
  '肚子疼需要吃药',
  // 医疗场景
  '帮我叫医生',
  '我需要休息',
]

function TokenCard({ match }: { match: MatchedToken }) {
  const { token, pictogram, matchType } = match
  const imgSrc = pictogram?.imageUrl ?? generatePlaceholderSvg(token)
  const isMatched = pictogram !== null

  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 w-24 flex-shrink-0 ${
      isMatched ? 'border-blue-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'
    }`}>
      <img
        src={imgSrc}
        alt={token}
        className={`w-16 h-16 object-contain rounded ${!isMatched ? 'opacity-30' : ''}`}
        onError={(e) => {
          const img = e.currentTarget
          img.src = generatePlaceholderSvg(token)
        }}
      />
      <span className="text-sm font-medium text-slate-900 truncate w-full text-center">{token}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${MATCH_TYPE_STYLE[matchType]}`}>
        {MATCH_TYPE_LABEL[matchType]}
      </span>
      {pictogram && (
        <span className="text-xs text-slate-400 truncate w-full text-center">
          {pictogram.labels.zh[0]}
        </span>
      )}
    </div>
  )
}

function MetricsBadge({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center bg-white rounded-2xl border border-slate-200 px-4 py-3 min-w-[80px]">
      <span className="text-2xl font-bold text-blue-700">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  )
}

export function MatcherDemoPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<TextToImageMatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await matchTextToImages(trimmed)
      setResult(res)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    analyze(input)
  }

  const matchedCount = result ? result.matches.filter((m) => m.pictogram !== null).length : 0
  const matchRatePct = result ? Math.round(result.matchRate * 100) : 0

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/85 text-slate-950 shadow-[0_1px_0_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/logo.png" alt="" className="size-9 rounded-xl" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold">图语家 · 匹配验证工具</h1>
            <p className="text-xs text-slate-500">Phase 1.5 — 文本→图片管线</p>
          </div>
        </div>
        <a
          href="/"
          className="text-sm text-slate-500 hover:text-slate-950 underline"
        >
          返回主界面
        </a>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">

        {/* Input */}
        <section className="apple-panel rounded-[28px] p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">输入文本</h2>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入一句话，如：我想吃饭"
              className="flex-1 border border-slate-200 rounded-2xl px-4 py-2 text-lg focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
            >
              <LineIcon name={loading ? 'loader' : 'sparkle'} className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '分析中…' : '分析'}
            </button>
          </form>

          {/* Example sentences */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_SENTENCES.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); analyze(s) }}
                className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Metrics */}
            <section className="space-y-2">
              <h2 className="font-semibold text-slate-700">指标</h2>
              <div className="flex gap-3 flex-wrap">
                <MetricsBadge
                  label="匹配率"
                  value={`${matchRatePct}%`}
                  sub={`${matchedCount}/${result.matches.length}`}
                />
                <MetricsBadge
                  label="耗时"
                  value={`${result.elapsedMs.toFixed(1)}`}
                  sub="ms"
                />
                <MetricsBadge
                  label="分词数"
                  value={String(result.segmentation.segments.length)}
                  sub={result.segmentation.engine === 'intl-segmenter' ? 'Intl' : '字符'}
                />
                <MetricsBadge
                  label="输入字符"
                  value={String(result.inputText.length)}
                  sub="chars"
                />
              </div>
            </section>

            {/* Segmentation tokens */}
            <section className="apple-panel rounded-[28px] p-4 space-y-2">
              <h2 className="font-semibold text-slate-700">分词结果</h2>
              <div className="flex flex-wrap gap-2">
                {result.segmentation.segments.map((seg, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-sm font-medium border border-blue-100"
                  >
                    {seg}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                引擎：{result.segmentation.engine}
              </p>
            </section>

            {/* Image sequence */}
            <section className="apple-panel rounded-[28px] p-4 space-y-3">
              <h2 className="font-semibold text-slate-700">图片序列</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {result.matches.map((match, i) => (
                  <TokenCard key={i} match={match} />
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                {(Object.keys(MATCH_TYPE_LABEL) as MatchedToken['matchType'][]).map((type) => (
                  <span key={type} className={`text-xs px-2 py-0.5 rounded-full ${MATCH_TYPE_STYLE[type]}`}>
                    {MATCH_TYPE_LABEL[type]}
                  </span>
                ))}
              </div>
            </section>

            {/* Unmatched tokens */}
            {result.matches.some((m) => m.pictogram === null) && (
              <section className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 space-y-2">
                <h2 className="font-semibold text-yellow-800">未匹配词条</h2>
                <p className="text-sm text-yellow-700">
                  以下词语未找到对应图片，可考虑扩充词库：
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.matches
                    .filter((m) => m.pictogram === null)
                    .map((m, i) => (
                      <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        {m.token}
                      </span>
                    ))}
                </div>
              </section>
            )}
          </>
        )}

        {!result && !loading && (
          <div className="text-center py-16 text-slate-400">
            <LineIcon name="magnifier" className="mx-auto mb-3 h-10 w-10" />
            <p>输入文本后点击「分析」，查看图片匹配结果</p>
          </div>
        )}
      </div>
    </div>
  )
}
