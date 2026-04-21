/**
 * ConversationHistoryDrawer — 对话记录抽屉
 *
 * 展示 db.expressions 里所有已记录的表达与接收事件，
 * 按 sessionId 分组，支持收藏切换和单条删除。
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAppStore } from '@/stores/app-store'
import type { Expression } from '@/types'

// startPlayback is needed inside ExpressionCard; pass as prop
type PlayFn = (sentence: string) => void

// ─── helpers ────────────────────────────────────────────────────────────── //

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚才'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatFullTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 把全部 expressions 序列化为可读纯文本，供下载 */
function buildExportText(expressions: Expression[]): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}:${pad(now.getMinutes())}`

  const lines: string[] = [
    '图语家 · 对话记录导出',
    `导出时间：${dateStr}`,
    '',
  ]

  const sessions = groupBySession(expressions)

  sessions.forEach((session, idx) => {
    lines.push(`${'='.repeat(40)}`)
    lines.push(`会话 ${sessions.length - idx}`)
    lines.push(`${'='.repeat(40)}`)

    // 时间升序展示（最早在上）
    const items = [...session.items].reverse()
    for (const expr of items) {
      const timeStr = formatFullTime(expr.createdAt)
      const direction = expr.direction === 'express' ? '💬 表达' : '👂 接收'
      lines.push('')
      lines.push(`[${direction}]  ${timeStr}`)

      if (expr.direction === 'express') {
        const text = expr.selectedSentence ?? expr.candidateSentences[0] ?? null
        if (text) lines.push(`句子：${text}`)
      } else {
        if (expr.inputText) lines.push(`原文：${expr.inputText}`)
      }

      if (expr.pictogramLabels.length > 0) {
        lines.push(`图片：${expr.pictogramLabels.map((l) => `[${l}]`).join(' ')}`)
      }

      if (expr.isFavorite) lines.push('⭐ 已收藏')
    }

    lines.push('')
  })

  if (expressions.length === 0) {
    lines.push('（暂无记录）')
  }

  return lines.join('\n')
}

/** 把 expressions 列表按 sessionId 分成有序分组 */
function groupBySession(
  expressions: Expression[],
): Array<{ sessionId: string; items: Expression[] }> {
  const order: string[] = []
  const byId = new Map<string, Expression[]>()

  for (const expr of expressions) {
    if (!byId.has(expr.sessionId)) {
      order.push(expr.sessionId)
      byId.set(expr.sessionId, [])
    }
    byId.get(expr.sessionId)!.push(expr)
  }

  return order.map((id) => ({ sessionId: id, items: byId.get(id)! }))
}

// ─── sub-components ─────────────────────────────────────────────────────── //

function ExpressionCard({ expr, onPlay }: { expr: Expression; onPlay: PlayFn }) {
  const isExpress = expr.direction === 'express'
  const mainText =
    isExpress
      ? (expr.selectedSentence ?? expr.candidateSentences[0] ?? null)
      : expr.inputText ?? null

  async function handleToggleFavorite() {
    await db.expressions.update(expr.id, { isFavorite: !expr.isFavorite })
  }

  async function handleDelete() {
    await db.expressions.delete(expr.id)
  }

  return (
    <div
      className={`rounded-xl border p-3 space-y-1.5 ${
        isExpress
          ? 'bg-blue-50 border-blue-200'
          : 'bg-purple-50 border-purple-200'
      }`}
    >
      {/* 方向 + 时间 */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isExpress
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}
        >
          {isExpress ? '💬 表达' : '👂 接收'}
        </span>
        <span className="text-xs text-gray-400">{formatTime(expr.createdAt)}</span>
      </div>

      {/* 主文本 */}
      {mainText && (
        <p className="text-base text-gray-900 leading-snug">{mainText}</p>
      )}

      {/* 图片标签 */}
      {expr.pictogramLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {expr.pictogramLabels.map((label, i) => (
            <span
              key={i}
              className="text-xs px-1.5 py-0.5 bg-white/70 border border-gray-200 rounded-md text-gray-600"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* 操作 */}
      <div className="flex items-center justify-end gap-1 pt-0.5">
        {/* 重播按钮：仅对有文本的表达方向条目显示 */}
        {isExpress && mainText && (
          <button
            onClick={() => onPlay(mainText)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-blue-500 rounded-lg transition-colors"
            aria-label={`重播：${mainText}`}
            title="重新播报"
          >
            ▶
          </button>
        )}
        <button
          onClick={handleToggleFavorite}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
            expr.isFavorite
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-gray-300 hover:text-amber-400'
          }`}
          aria-label={expr.isFavorite ? '取消收藏' : '收藏'}
          title={expr.isFavorite ? '取消收藏' : '收藏'}
        >
          ⭐
        </button>
        <button
          onClick={handleDelete}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-red-500 rounded-lg transition-colors"
          aria-label="删除此记录"
          title="删除"
        >
          🗑
        </button>
      </div>
    </div>
  )
}

// ─── main drawer ────────────────────────────────────────────────────────── //

export function ConversationHistoryDrawer() {
  const showHistory = useAppStore((s) => s.showHistory)
  const setShowHistory = useAppStore((s) => s.setShowHistory)
  const startPlayback = useAppStore((s) => s.startPlayback)

  const expressions = useLiveQuery(() =>
    db.expressions.orderBy('createdAt').reverse().limit(100).toArray(),
  )

  if (!showHistory) return null

  const sessions = groupBySession(expressions ?? [])

  async function handleExport() {
    // 导出时不受 100 条限制，读取全部记录
    try {
      const all = await db.expressions.orderBy('createdAt').reverse().toArray()
      const text = buildExportText(all)
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateTag = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      const a = document.createElement('a')
      a.href = url
      a.download = `图语家_对话记录_${dateTag}.txt`
      try {
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } finally {
        // 延迟释放，避免部分浏览器（Firefox/Safari）在下载流水线启动前就废弃 URL
        setTimeout(() => URL.revokeObjectURL(url), 0)
      }
    } catch (err) {
      console.error('导出对话记录失败:', err)
      alert('导出失败，请稍后重试')
    }
  }

  async function handleClearAll() {
    if (!confirm('确定要清空全部对话记录吗？此操作不可恢复。')) return
    await db.expressions.clear()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="对话记录"
      className="fixed inset-0 z-40 flex"
    >
      {/* 背景遮罩 */}
      <div
        className="flex-1 bg-black/40"
        onClick={() => setShowHistory(false)}
        aria-hidden="true"
      />

      {/* 抽屉主体 */}
      <div className="w-[22rem] max-w-[90vw] bg-white shadow-xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
          <h2 className="text-lg font-bold text-gray-800">📖 对话记录</h2>
          <div className="flex items-center gap-1">
            {(expressions?.length ?? 0) > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="text-xs text-gray-600 hover:text-blue-600 px-2 py-1.5 rounded-lg transition-colors min-h-[44px]"
                  aria-label="导出对话记录"
                  title="下载为文本文件"
                >
                  导出
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-600 hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors min-h-[44px]"
                  aria-label="清空全部记录"
                >
                  清空
                </button>
              </>
            )}
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {(expressions?.length ?? 0) === 0 && (
            <div className="text-center text-gray-400 mt-12 space-y-2">
              <p className="text-3xl">💬</p>
              <p className="text-base">还没有对话记录</p>
              <p className="text-sm">使用「表达」或「接收」功能后记录会出现在这里</p>
            </div>
          )}

          {sessions.map((session, sessionIdx) => (
            <div key={session.sessionId} className="space-y-2">
              {/* 会话分隔线 */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 shrink-0 px-1">
                  会话 {sessions.length - sessionIdx}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* 该会话内的事件（时间升序：最早的在上） */}
              {[...session.items].reverse().map((expr) => (
                <ExpressionCard
                  key={expr.id}
                  expr={expr}
                  onPlay={(sentence) => {
                    setShowHistory(false)
                    startPlayback(sentence)
                  }}
                />
              ))}
            </div>
          ))}

          {(expressions?.length ?? 0) >= 100 && (
            <p className="text-center text-xs text-gray-400 pb-2">
              仅显示最近 100 条记录
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
