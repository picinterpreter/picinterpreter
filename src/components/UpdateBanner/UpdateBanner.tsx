/**
 * UpdateBanner — 当 Service Worker 检测到新版本时显示的横幅。
 *
 * 使用 usePwaUpdate hook 监听更新状态。
 * 用户点击"立即更新"→ 新 SW 激活 → 页面自动刷新。
 * 用户点击"×"→ 忽略本次提示（直到下次 updatefound）。
 */

import { usePwaUpdate } from '@/hooks/use-pwa-update'

export function UpdateBanner() {
  const { isUpdateAvailable, applyUpdate, dismissUpdate } = usePwaUpdate()

  if (!isUpdateAvailable) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="
        fixed top-0 inset-x-0 z-40
        flex items-center justify-between gap-3
        px-4 py-2.5
        bg-blue-700 text-white text-sm
        shadow-lg
      "
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0" aria-hidden="true">🔄</span>
        <span className="truncate">新版本已就绪，刷新即可获得最新功能</span>
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={applyUpdate}
          className="
            px-3 py-1 rounded-lg font-medium
            bg-white text-blue-700 hover:bg-blue-50 active:bg-blue-100
            transition-colors text-sm
          "
        >
          立即更新
        </button>
        <button
          onClick={dismissUpdate}
          className="
            p-1 rounded hover:bg-blue-600 active:bg-blue-500
            transition-colors
          "
          aria-label="忽略更新"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
