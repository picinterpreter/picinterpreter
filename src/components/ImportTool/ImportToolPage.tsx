/**
 * ARASAAC 批量导入工具页面。
 *
 * 用途：用 lexicon.ts 的词条搜索 ARASAAC API，生成含真实图片 URL 的
 *       pictograms.json，替换占位 SVG。
 *
 * 入口：/import
 * 流程：
 *   1. 展示 lexicon 全部词条
 *   2. 点击「开始导入」逐词搜索 ARASAAC（含进度条）
 *   3. 搜索完成后预览结果，标记成功/失败
 *   4. 点击「导出 JSON」下载 pictograms.json（直接替换 public/seed/）
 */

import { useState, useCallback, useRef } from 'react'
import { LEXICON, type LexiconEntry } from '@/data/lexicon'
import { searchPictogram, type ArasaacResult } from '@/utils/arasaac-provider'
import { LineIcon } from '@/components/ui/LineIcon'

interface ImportRow {
  entry: LexiconEntry
  status: 'pending' | 'searching' | 'found' | 'not_found' | 'error'
  result: ArasaacResult | null
  error?: string
}

function slugify(zh: string) {
  // 生成稳定的英文 id，用 en 字段
  return zh
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function buildPictogramEntry(row: ImportRow) {
  const { entry, result } = row
  return {
    id: `p_${slugify(entry.en || entry.zh)}`,
    imageUrl: result
      ? result.imageUrl
      : `/seed/images/${slugify(entry.en || entry.zh)}.svg`,
    arasaacId: result?.pictogramId ?? null,
    labels: { zh: [entry.zh], en: [entry.en] },
    categoryId: entry.category,
    synonyms: entry.synonyms,
    disambiguationHints: {},
    usageCount: 0,
  }
}

const STATUS_STYLE: Record<ImportRow['status'], string> = {
  pending: 'text-slate-400',
  searching: 'text-blue-500 animate-pulse',
  found: 'text-green-600',
  not_found: 'text-yellow-600',
  error: 'text-red-600',
}
const STATUS_LABEL: Record<ImportRow['status'], string> = {
  pending: '等待',
  searching: '搜索中',
  found: '找到',
  not_found: '未找到',
  error: '错误',
}

export function ImportToolPage() {
  const [rows, setRows] = useState<ImportRow[]>(() =>
    LEXICON.map((entry) => ({ entry, status: 'pending', result: null }))
  )
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const abortRef = useRef(false)

  const updateRow = useCallback((index: number, patch: Partial<ImportRow>) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }, [])

  const startImport = useCallback(async () => {
    abortRef.current = false
    setRunning(true)
    setDone(false)
    // reset all to pending
    setRows(LEXICON.map((entry) => ({ entry, status: 'pending', result: null })))

    for (let i = 0; i < LEXICON.length; i++) {
      if (abortRef.current) break
      updateRow(i, { status: 'searching' })
      try {
        const result = await searchPictogram(LEXICON[i].zh)
        updateRow(i, {
          status: result ? 'found' : 'not_found',
          result,
        })
      } catch (err) {
        updateRow(i, { status: 'error', result: null, error: String(err) })
      }
      // throttle is built into batchSearchPictograms; here we add a small delay too
      if (i < LEXICON.length - 1) {
        await new Promise((r) => setTimeout(r, 220))
      }
    }
    setRunning(false)
    setDone(true)
  }, [updateRow])

  const stopImport = () => {
    abortRef.current = true
  }

  const exportJson = () => {
    const pictograms = rows.map((row) => buildPictogramEntry(row))
    const json = JSON.stringify(pictograms, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pictograms.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const foundCount = rows.filter((r) => r.status === 'found').length
  const notFoundCount = rows.filter((r) => r.status === 'not_found').length
  const errorCount = rows.filter((r) => r.status === 'error').length
  const doneCount = rows.filter((r) => r.status !== 'pending' && r.status !== 'searching').length
  const progress = Math.round((doneCount / rows.length) * 100)

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/85 text-slate-950 shadow-[0_1px_0_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/logo.png" alt="" className="size-9 rounded-xl" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold">图语家 · ARASAAC 导入工具</h1>
            <p className="text-xs text-slate-500">从 ARASAAC API 批量下载图片元数据</p>
          </div>
        </div>
        <a href="/" className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm text-slate-500 hover:text-slate-950">
          <LineIcon name="arrowLeft" className="h-4 w-4" />
          返回主界面
        </a>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">

        {/* Controls */}
        <section className="apple-panel rounded-[28px] p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-slate-700">词条数量：{LEXICON.length} 个</p>
              <p className="text-sm text-slate-500">
                搜索策略：中文库优先，未找到时用英文 fallback
              </p>
            </div>
            <div className="flex gap-2">
              {!running ? (
                <button
                  onClick={startImport}
                  className="flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2 font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <LineIcon name={done ? 'refresh' : 'download'} className="h-5 w-5" />
                  {done ? '重新导入' : '开始导入'}
                </button>
              ) : (
                <button
                  onClick={stopImport}
                  className="flex items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  <LineIcon name="stop" className="h-5 w-5" />
                  停止
                </button>
              )}
              {done && (
                <button
                  onClick={exportJson}
                  className="flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2 font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <LineIcon name="download" className="h-5 w-5" />
                  导出 JSON
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {(running || done) && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-slate-500">
                <span>{doneCount} / {rows.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {done && (
                <div className="flex gap-4 text-sm pt-1">
                  <span className="text-green-600">找到 {foundCount}</span>
                  <span className="text-yellow-600">未找到 {notFoundCount}</span>
                  {errorCount > 0 && <span className="text-red-600">! 错误 {errorCount}</span>}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Instructions */}
        {done && (
          <section className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800 space-y-1">
            <p className="font-semibold">导出说明</p>
            <p>1. 点击「导出 JSON」下载 <code className="bg-green-100 px-1 rounded">pictograms.json</code></p>
            <p>2. 将文件替换到 <code className="bg-green-100 px-1 rounded">public/seed/pictograms.json</code></p>
            <p>3. 重启开发服务器，刷新页面即可看到真实图片</p>
            <p className="text-green-600 text-xs mt-1">
              注意：导出的 imageUrl 为 ARASAAC CDN 地址，需要网络访问。
              未找到的词条保留占位 SVG 路径。
            </p>
          </section>
        )}

        {/* Results table */}
        <section className="apple-panel rounded-[28px] overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600 grid grid-cols-[2fr_1fr_1fr_3fr] gap-2">
            <span>词条</span>
            <span>分类</span>
            <span>状态</span>
            <span>图片预览</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {rows.map((row, i) => (
              <div key={i} className="px-4 py-2 grid grid-cols-[2fr_1fr_1fr_3fr] gap-2 items-center text-sm">
                <div>
                  <span className="font-medium text-slate-900">{row.entry.zh}</span>
                  <span className="text-slate-400 ml-2 text-xs">{row.entry.en}</span>
                </div>
                <span className="text-slate-500 text-xs">{row.entry.category}</span>
                <span className={`font-medium ${STATUS_STYLE[row.status]}`}>
                  <span className="inline-flex items-center gap-1.5">
                    {row.status === 'searching' && <LineIcon name="magnifier" className="h-3.5 w-3.5 animate-pulse" />}
                    {row.status === 'found' && <LineIcon name="check" className="h-3.5 w-3.5" />}
                    {row.status === 'not_found' && <LineIcon name="xmark" className="h-3.5 w-3.5" />}
                    {STATUS_LABEL[row.status]}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {row.result && (
                    <>
                      <img
                        src={row.result.imageUrl}
                        alt={row.entry.zh}
                        className="w-10 h-10 object-contain rounded border border-gray-100"
                        loading="lazy"
                      />
                      <span className="text-xs text-slate-400">
                        ID:{row.result.pictogramId}
                        {row.result.searchedLocale === 'en' && ' (en)'}
                      </span>
                    </>
                  )}
                  {row.status === 'not_found' && (
                    <span className="text-xs text-yellow-600">未找到对应图片</span>
                  )}
                  {row.status === 'error' && (
                    <span className="text-xs text-red-500">{row.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
