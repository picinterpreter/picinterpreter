/**
 * UpdateBanner — 当 Service Worker 检测到新版本时显示的横幅。
 *
 * 使用 usePwaUpdate hook 监听更新状态。
 * 用户点击"立即更新"→ 新 SW 激活 → 页面自动刷新。
 * 用户点击"×"→ 忽略本次提示（直到下次 updatefound）。
 */

import { usePwaUpdate } from '@/hooks/use-pwa-update'
import { LineIcon } from '@/components/ui/LineIcon'

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
        bg-white/90 text-slate-900 text-sm
        shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl
      "
    >
      <span className="flex items-center gap-2 min-w-0">
        <LineIcon name="loader" className="h-4 w-4 shrink-0" />
        <span className="truncate">新版本已就绪，刷新即可获得最新功能</span>
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={applyUpdate}
          className="
            px-3 py-1 rounded-full font-semibold
            bg-slate-950 text-white hover:bg-slate-800
            transition-colors text-sm
          "
        >
          立即更新
        </button>
        <button
          onClick={dismissUpdate}
          className="
            p-1 rounded-full hover:bg-slate-100
            transition-colors
          "
          aria-label="忽略更新"
        >
          <LineIcon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
