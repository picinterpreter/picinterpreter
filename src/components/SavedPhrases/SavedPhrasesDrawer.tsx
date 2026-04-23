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
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40"
        onClick={() => setShowSavedPhrases(false)}
      />

      {/* Drawer */}
      <div className="w-80 max-w-[85vw] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b gap-2">
          <h2 className="text-lg font-bold text-gray-800 shrink-0">⭐ 常用表达</h2>

          {/* 手动添加按钮 */}
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className={`p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center text-xl transition-colors ${
              showAddForm
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
            aria-label="手动添加短语"
            title="手动添加短语"
          >
            {showAddForm ? '✕' : '+'}
          </button>

          {/* 导出 / 导入按钮组 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              disabled={importing}
              className="px-2.5 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="导出为 JSON 文件"
            >
              导出
            </button>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="px-2.5 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="从 JSON 文件导入"
            >
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

          <button
            onClick={() => setShowSavedPhrases(false)}
            className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 导入结果提示 */}
        {importToast && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 space-y-1">
            <div className="flex items-start gap-2">
              <span>✓</span>
              <span>
                导入成功：新增 {importToast.added} 条
                {importToast.skipped > 0 && `，跳过 ${importToast.skipped} 条（已存在）`}
              </span>
            </div>
            {importToast.missingPictogramCount > 0 && (
              <p className="text-amber-600 text-xs pl-5">
                ⚠ {importToast.missingPictogramCount} 个图片 ID 在本机图库中不存在，相关表达的图片缩略图将无法显示
              </p>
            )}
          </div>
        )}
        {importError && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <span>✕</span>
            <span>{importError}</span>
          </div>
        )}

        {/* 手动添加表单 */}
        {showAddForm && (
          <div className="mx-3 mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
            <p className="text-sm font-medium text-blue-800">添加自定义短语</p>
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
              className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"
            />
            {addError && (
              <p className="text-xs text-red-600">{addError}</p>
            )}
            <p className="text-xs text-blue-600">
              💡 图片缩略图通过「选图片 → 生成句子 → 保存」流程自动关联
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 rounded-lg bg-white text-gray-600 text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddPhrase}
                disabled={!newSentence.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {phrases?.length === 0 && (
            <p className="text-center text-gray-400 mt-8">
              还没有收藏的表达
            </p>
          )}
          {phrases?.map((phrase) => {
            const thumbs = phrase.pictogramIds
              .map((id) => pMap.get(id))
              .filter((p): p is PictogramEntry => p !== undefined)
              .slice(0, 5)

            return (
              <div
                key={phrase.id}
                className="rounded-xl bg-amber-50 border border-amber-200 overflow-hidden"
              >
                {/* 图片缩略图行（有图时显示） */}
                {thumbs.length > 0 && (
                  <div className="flex gap-1.5 px-3 pt-2.5 pb-1">
                    {thumbs.map((p) => (
                      <div key={p.id} className="flex flex-col items-center gap-0.5">
                        <img
                          src={resolveImageSrc(p.imageUrl, p.labels.zh[0], '#d97706')}
                          alt={p.labels.zh[0]}
                          className="w-9 h-9 object-contain rounded-lg bg-amber-100 p-0.5"
                        />
                        <span className="text-[10px] text-amber-700 max-w-[36px] truncate leading-none">
                          {p.labels.zh[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 句子 + 操作行 */}
                <div className="px-3 pb-2.5 pt-1">
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
                        className="w-full px-2 py-1.5 border border-amber-400 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={cancelEditing}
                          className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => commitEdit(phrase.id)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 正常显示模式 */
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePlay(phrase.sentence, phrase.id)}
                        className="flex-1 text-left text-base text-gray-900 min-h-[44px] leading-snug"
                        aria-label={`播报：${phrase.sentence}`}
                      >
                        {phrase.sentence}
                      </button>
                      <button
                        onClick={() => startEditing(phrase.id, phrase.sentence)}
                        className="p-1 text-gray-300 hover:text-amber-500 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={`重命名：${phrase.sentence}`}
                        title="重命名"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(phrase.id)}
                        className="p-1 text-gray-300 hover:text-red-500 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="删除"
                      >
                        🗑
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
