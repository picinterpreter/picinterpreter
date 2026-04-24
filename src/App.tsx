import { useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type FontSize } from '@/stores/settings-store'
import { CategoryTabs } from '@/components/CategoryTabs/CategoryTabs'
import { PictogramGrid } from '@/components/PictogramGrid/PictogramGrid'
import { SelectionTray } from '@/components/SelectionTray/SelectionTray'
import { CandidatePanel } from '@/components/CandidatePanel/CandidatePanel'
import { PlaybackOverlay } from '@/components/PlaybackOverlay/PlaybackOverlay'
import { SavedPhrasesDrawer } from '@/components/SavedPhrases/SavedPhrasesDrawer'
import { SettingsDrawer } from '@/components/Settings/SettingsDrawer'
import { CategoryLinksDrawer } from '@/components/CategoryLinks/CategoryLinksDrawer'
import { ReceiverPanel } from '@/components/ReceiverPanel/ReceiverPanel'
import { ConversationHistoryDrawer } from '@/components/ConversationHistory/ConversationHistoryDrawer'
import { QuickAccessBar } from '@/components/QuickAccess/QuickAccessBar'
import { EmergencyPanel } from '@/components/Emergency/EmergencyPanel'
import { UpdateBanner } from '@/components/UpdateBanner/UpdateBanner'
import { OnboardingModal } from '@/components/Onboarding/OnboardingModal'
import { LineIcon } from '@/components/ui/LineIcon'

const FONT_SIZE_MAP: Record<FontSize, string> = {
  normal: '16px',
  large:  '18px',
  xlarge: '20px',
}

export default function App() {
  const setShowSettings = useAppStore((s) => s.setShowSettings)
  const setShowHistory = useAppStore((s) => s.setShowHistory)
  const setShowEmergency = useAppStore((s) => s.setShowEmergency)
  const activeMode = useAppStore((s) => s.activeMode)
  const setActiveMode = useAppStore((s) => s.setActiveMode)
  const highContrast = useSettingsStore((s) => s.highContrast)
  const fontSize = useSettingsStore((s) => s.fontSize)

  // 字体大小写入 :root，让 rem 单位全局生效
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize]
    return () => { document.documentElement.style.fontSize = '' }
  }, [fontSize])

  return (
    <div className={`h-screen flex flex-col bg-[#f5f5f7] overflow-hidden text-slate-950 ${highContrast ? 'hc' : ''}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/85 text-slate-950 shadow-[0_1px_0_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight tracking-normal">图语家</h1>
        </div>
        <div className="flex items-center gap-1">
          <a
            href="/debug"
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 sm:flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            title="匹配验证工具"
            aria-label="匹配验证工具"
          >
            <LineIcon name="magnifier" className="h-5 w-5" />
          </a>
          <a
            href="/import"
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 sm:flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            title="ARASAAC 导入工具"
            aria-label="ARASAAC 导入工具"
          >
            <LineIcon name="download" className="h-5 w-5" />
          </a>
          <button
            onClick={() => setShowEmergency(true)}
            className="p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-rose-600 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
            aria-label="紧急求助"
            title="紧急求助"
          >
            <LineIcon name="alert" className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="对话记录"
            title="对话记录"
          >
            <LineIcon name="book" className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="设置"
          >
            <LineIcon name="settings" className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 模式切换标签 */}
      <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-white/80 p-1.5 shrink-0 backdrop-blur-xl">
        <button
          onClick={() => setActiveMode('express')}
          aria-pressed={activeMode === 'express'}
          className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-base font-semibold transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
            activeMode === 'express'
              ? 'text-slate-950 bg-white shadow-[0_1px_6px_rgba(15,23,42,0.10)]'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
          }`}
        >
          <LineIcon name="message" className="h-5 w-5" />
          <span>表达</span>
        </button>
        <button
          onClick={() => setActiveMode('receive')}
          aria-pressed={activeMode === 'receive'}
          className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-base font-semibold transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 ${
            activeMode === 'receive'
              ? 'text-slate-950 bg-white shadow-[0_1px_6px_rgba(15,23,42,0.10)]'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
          }`}
        >
          <LineIcon name="ear" className="h-5 w-5" />
          <span>接收</span>
        </button>
      </div>

      {activeMode === 'express' ? (
        <>
          {/* 常用语一键播报条（有收藏时显示） */}
          <QuickAccessBar />

          {/* Category Tabs */}
          <CategoryTabs />

          {/* Pictogram Grid */}
          <PictogramGrid />

          {/* Selection Tray */}
          <SelectionTray />

          {/* Candidate Panel */}
          <CandidatePanel />
        </>
      ) : (
        /* 接收端流程 */
        <ReceiverPanel />
      )}

      {/* Overlays（两种模式均可用） */}
      <PlaybackOverlay />
      <SavedPhrasesDrawer />
      <ConversationHistoryDrawer />
      <SettingsDrawer />
      <CategoryLinksDrawer />

      {/* 紧急求助全屏面板（z-50，覆盖一切） */}
      <EmergencyPanel />

      {/* PWA 更新通知横幅（z-40，仅 PROD 环境有效） */}
      <UpdateBanner />

      {/* 首次使用引导弹窗（z-50，首次打开时显示） */}
      <OnboardingModal />
    </div>
  )
}
