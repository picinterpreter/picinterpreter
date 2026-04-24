import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import {
  addSavedPhrase,
  deleteSavedPhrase,
  importSavedPhrases,
  updateSavedPhrase,
} from '@/repositories/saved-phrases-repository'
import { useAppStore } from '@/stores/app-store'
import { resolveImageSrc } from '@/utils/generate-placeholder-svg'
import {
  buildPhrasesExport,
  mergePhrases,
  parsePhrasesImport,
} from '@/utils/phrase-transfer'
import { LineIcon } from '@/components/ui/LineIcon'
import type { PictogramEntry, SavedPhrase } from '@/types'

// ─── 导入结果提示（5 秒后自动消失） ─────────────────────────────────────── //

interface ImportToast {
  added: number
  skipped: number
  /** 导入的短语里引用了本机图库中不存在的图片 ID 数量 */
  missingPictogramCount: number
}

export function SavedPhrasesDrawer() {
  const showSavedPhrases = useAppStore((s) => s.showSavedPhrases)
  const setShowSavedPhrases = useAppStore((s) => s.setShowSavedPhrases)
  const startPlayback = useAppStore((s) => s.startPlayback)

  const [importToast, setImportToast] = useState<ImportToast | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  /** 防止重复点击触发并发导入 */
  const [importing, setImporting] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 手动添加短语 ─────────────────────────────────────────────────────── //
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSentence, setNewSentence] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  // ── 重命名短语 ───────────────────────────────────────────────────────── //
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // 组件卸载时清理计时器，防止对已卸载组件调用 setState
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  /**
   * 单次查询同时加载短语列表和配套图片。
   * Dexie 自动追踪两张表的读取，任意一方变化都会触发重新渲染。
   */
  const data = useLiveQuery(async () => {
    const phrases = await db.savedPhrases.orderBy('lastUsedAt').reverse().toArray()
    const allIds = [...new Set(phrases.flatMap((p) => p.pictogramIds))]
    const items = allIds.length > 0
      ? await db.pictograms.bulkGet(allIds)
      : []
    const pMap = new Map<string, PictogramEntry>()
    for (const item of items) {
      if (item) pMap.set(item.id, item)
    }
    return { phrases, pMap }
  })

  const phrases = data?.phrases
  const pMap = data?.pMap ?? new Map<string, PictogramEntry>()

  // 打开添加表单时自动聚焦输入框
  // NOTE: this useEffect must come BEFORE the early return to satisfy Rules of Hooks
  useEffect(() => {
    if (!showSavedPhrases) return
    if (showAddForm) {
      requestAnimationFrame(() => addInputRef.current?.focus())
    } else {
      setNewSentence('')
      setAddError(null)
    }
  }, [showAddForm, showSavedPhrases])

  // When drawer closes, cancel any pending edit
  useEffect(() => {
    if (!showSavedPhrases) {
      cancelEditing()
      setShowAddForm(false)
    }
  }, [showSavedPhrases])

  if (!showSavedPhrases) return null

  async function handleAddPhrase() {
    const text = newSentence.trim()
    if (!text) {
      setAddError('请输入短语内容')
      return
    }
    if (text.length > 200) {
      setAddError('短语最长 200 个字符')
      return
    }
    const phrase: SavedPhrase = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sentence: text,
      pictogramIds: [],
      usageCount: 0,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    }
    try {
      await addSavedPhrase(phrase)
      setShowAddForm(false)
    } catch (err) {
      console.error('添加短语失败:', err)
      setAddError('保存失败，请重试')
    }
  }

  function startEditing(id: string, currentText: string) {
    // Close the add form if open, to avoid two forms at once
    setShowAddForm(false)
    setEditingId(id)
    setEditingText(currentText)
    requestAnimationFrame(() => {
      const input = editInputRef.current
      if (input) {
        input.focus()
        input.select()
      }
    })
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingText('')
  }

  async function commitEdit(id: string) {
    const text = editingText.trim()
    if (!text || text.length > 200) {
      cancelEditing()
      return
    }
    try {
      await updateSavedPhrase(id, { sentence: text })
    } catch (err) {
      console.error('重命名短语失败:', err)
    }
    cancelEditing()
  }

  // ── 播放 ────────────────────────────────────────────────────────────────── //

  async function handlePlay(sentence: string, id: string) {
    const phrase = phrases?.find((p) => p.id === id)
    await updateSavedPhrase(id, {
      usageCount: (phrase?.usageCount ?? 0) + 1,
      lastUsedAt: Date.now(),
    })
    startPlayback(sentence, phrase?.pictogramIds ?? [])
  }

  async function handleDelete(id: string) {
    await deleteSavedPhrase(id)
  }

  // ── 导出 ────────────────────────────────────────────────────────────────── //

  async function handleExport() {
    try {
      const all = await db.savedPhrases.toArray()
      if (all.length === 0) {
        alert('还没有收藏的表达，无法导出')
        return
      }
      const payload = buildPhrasesExport(all)
      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const today = new Date()
      const dateTag =
        `${today.getFullYear()}` +
        `${String(today.getMonth() + 1).padStart(2, '0')}` +
        `${String(today.getDate()).padStart(2, '0')}`
      const a = document.createElement('a')
      a.href = url
      a.download = `图语家_常用语_${dateTag}.json`
      try {
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0)
      }
    } catch (err) {
      console.error('导出常用语失败:', err)
      alert('导出失败，请稍后重试')
    }
  }

  // ── 导入 ────────────────────────────────────────────────────────────────── //

  function showToast(toast: ImportToast) {
    setImportToast(toast)
    setImportError(null)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      setImportToast(null)
      toastTimerRef.current = null
    }, 5000)
  }

  function handleImportClick() {
    setImportError(null)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so the same file can be re-imported if needed
    e.target.value = ''
    if (!file) return

    setImporting(true)
    setImportError(null)

    try {
      const text = await file.text()
      const parsed = parsePhrasesImport(text)

      if (!parsed.ok) {
        setImportError(parsed.error)
        return
      }

      // Merge: skip phrases whose id already exists locally
      const existing = await db.savedPhrases.toArray()
      const existingIds = new Set(existing.map((p) => p.id))
      const { toAdd, skippedCount } = mergePhrases(parsed.phrases, existingIds)

      // Check whether any imported phrases reference pictograms absent from this device
      let missingPictogramCount = 0
      if (toAdd.length > 0) {
        const allRefIds = [...new Set(toAdd.flatMap((p) => p.pictogramIds))]
        if (allRefIds.length > 0) {
          const found = await db.pictograms.bulkGet(allRefIds)
          const missingIds = allRefIds.filter((_, i) => found[i] == null)
          missingPictogramCount = missingIds.length
        }
        await importSavedPhrases(toAdd)
      }

      showToast({ added: toAdd.length, skipped: skippedCount, missingPictogramCount })
    } catch (err) {
      console.error('导入常用语失败:', err)
      setImportError('导入失败，请检查文件后重试')
    } finally {
      setImporting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────── //

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="flex-1 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={() => setShowSavedPhrases(false)}
      />

      {/* Drawer */}
      <div className="flex h-dvh w-full flex-col bg-stone-50 shadow-2xl sm:max-w-[560px] sm:rounded-l-[28px] lg:max-w-[680px] xl:max-w-[760px]">
        {/* Header */}
        <div className="border-b border-amber-200 bg-white px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-sm">
                <LineIcon name="star" className="h-7 w-7" />
              </div>
              <h2 className="truncate text-2xl font-bold text-slate-950">常用</h2>
            </div>

            <button
              onClick={() => setShowSavedPhrases(false)}
              className="apple-press flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
              aria-label="关闭"
            >
              <LineIcon name="close" className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className={`apple-press flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-base font-semibold transition-colors ${
                showAddForm
                  ? 'bg-slate-900 text-white'
                  : 'bg-amber-100 text-amber-950 hover:bg-amber-200'
              }`}
              aria-label="添加短语"
            >
              <LineIcon name={showAddForm ? 'close' : 'plus'} className="h-5 w-5" />
              {showAddForm ? '收起' : '添加'}
            </button>
            <button
              onClick={handleExport}
              disabled={importing}
              className="apple-press flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-base font-semibold text-slate-700 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.22)] transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              title="导出为 JSON 文件"
            >
              <LineIcon name="download" className="h-5 w-5" />
              导出
            </button>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="apple-press flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-base font-semibold text-slate-700 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.22)] transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              title="从 JSON 文件导入"
            >
              <LineIcon name={importing ? 'loader' : 'upload'} className={`h-5 w-5 ${importing ? 'animate-spin' : ''}`} />
              {importing ? '导入中…' : '导入'}
            </button>
            {/* 隐藏的文件选择器 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

        </div>

        {/* 导入结果提示 */}
        {importToast && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 space-y-1">
            <div className="flex items-start gap-2">
              <LineIcon name="check" className="h-4 w-4" />
              <span>
                导入成功：新增 {importToast.added} 条
                {importToast.skipped > 0 && `，跳过 ${importToast.skipped} 条（已存在）`}
              </span>
            </div>
            {importToast.missingPictogramCount > 0 && (
              <p className="text-amber-600 text-xs pl-5">
                {importToast.missingPictogramCount} 个图片 ID 在本机图库中不存在，相关表达的图片缩略图将无法显示
              </p>
            )}
          </div>
        )}
        {importError && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <LineIcon name="xmark" className="h-4 w-4" />
            <span>{importError}</span>
          </div>
        )}

        {/* 手动添加表单 */}
        {showAddForm && (
          <div className="mx-4 mt-3 space-y-3 rounded-[24px] border border-amber-200 bg-white p-4 shadow-sm">
            <p className="text-base font-bold text-slate-900">添加短语</p>
            <input
              ref={addInputRef}
              type="text"
              value={newSentence}
              onChange={(e) => {
                setNewSentence(e.target.value)
                setAddError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddPhrase()
                if (e.key === 'Escape') setShowAddForm(false)
              }}
              placeholder="输入短语文字，如：我需要休息一下"
              maxLength={200}
              className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-stone-50 px-4 py-3 text-lg focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100"
            />
            {addError && (
              <p className="text-xs text-red-600">{addError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="apple-press flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 py-2 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                <LineIcon name="close" className="h-4 w-4" />
                取消
              </button>
              <button
                onClick={handleAddPhrase}
                disabled={!newSentence.trim()}
                className="apple-press flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-950 py-2 text-base font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
              >
                <LineIcon name="save" className="h-4 w-4" />
                保存
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="grid flex-1 auto-rows-max grid-cols-1 gap-3 overflow-y-auto p-4 sm:p-5 lg:grid-cols-2 lg:gap-4 lg:p-6">
          {phrases?.length === 0 && (
            <div className="mt-8 rounded-[28px] border border-dashed border-amber-300 bg-white p-6 text-center shadow-sm">
              <LineIcon name="star" className="mx-auto h-10 w-10 text-amber-400" />
              <p className="mt-3 text-lg font-bold text-slate-800">暂无常用</p>
            </div>
          )}
          {phrases?.map((phrase) => {
            const thumbs = phrase.pictogramIds
              .map((id) => pMap.get(id))
              .filter((p): p is PictogramEntry => p !== undefined)
              .slice(0, 5)

            return (
              <div
                key={phrase.id}
                className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm"
              >
                {/* 图片缩略图行（有图时显示） */}
                {thumbs.length > 0 && (
                  <div className="flex gap-2 px-4 pt-4 pb-1">
                    {thumbs.map((p) => (
                      <div key={p.id} className="flex flex-col items-center gap-1">
                        <img
                          src={resolveImageSrc(p.imageUrl, p.labels.zh[0], '#d97706')}
                          alt={p.labels.zh[0]}
                          className="size-12 rounded-2xl bg-stone-50 object-contain p-1"
                        />
                        <span className="max-w-[48px] truncate text-xs leading-none text-slate-600">
                          {p.labels.zh[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 句子 + 操作行 */}
                <div className="px-4 pb-4 pt-3">
                  {editingId === phrase.id ? (
                    /* 重命名编辑模式 */
                    <div className="flex flex-col gap-1.5">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(phrase.id)
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        maxLength={200}
                        className="min-h-[52px] w-full rounded-2xl border border-amber-400 bg-white px-4 py-3 text-lg focus:outline-none focus:ring-4 focus:ring-amber-100"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEditing}
                          className="apple-press flex min-h-[44px] items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          <LineIcon name="close" className="h-3.5 w-3.5" />
                          取消
                        </button>
                        <button
                          onClick={() => commitEdit(phrase.id)}
                          className="apple-press flex min-h-[44px] items-center gap-1 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                        >
                          <LineIcon name="save" className="h-3.5 w-3.5" />
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 正常显示模式 */
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlay(phrase.sentence, phrase.id)}
                        className="apple-press flex min-h-[64px] flex-1 items-center gap-3 rounded-3xl bg-amber-50 px-4 py-3 text-left text-xl font-bold leading-snug text-slate-950 transition-colors hover:bg-amber-100"
                        aria-label={`播报：${phrase.sentence}`}
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950">
                          <LineIcon name="play" className="h-6 w-6" />
                        </span>
                        <span className="line-clamp-2">{phrase.sentence}</span>
                      </button>
                      <button
                        onClick={() => startEditing(phrase.id, phrase.sentence)}
                        className="flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-full bg-stone-100 text-slate-500 hover:text-amber-600"
                        aria-label={`重命名：${phrase.sentence}`}
                        title="重命名"
                      >
                        <LineIcon name="edit" className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(phrase.id)}
                        className="flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-full bg-stone-100 text-slate-500 hover:text-red-500"
                        aria-label="删除"
                      >
                        <LineIcon name="trash" className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
