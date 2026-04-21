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
    <div className={`h-screen flex flex-col bg-gray-50 overflow-hidden ${highContrast ? 'hc' : ''}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-blue-700 text-white">
        <h1 className="text-xl font-bold">图语家</h1>
        <div className="flex items-center gap-1">
          <a
            href="/debug"
            className="text-xs text-blue-300 hover:text-white px-2 py-1 rounded hidden sm:block"
            title="匹配验证工具"
          >
            🔍
          </a>
          <a
            href="/import"
            className="text-xs text-blue-300 hover:text-white px-2 py-1 rounded hidden sm:block"
            title="ARASAAC 导入工具"
          >
            📥
          </a>
          <button
            onClick={() => setShowEmergency(true)}
            className="p-2 hover:bg-red-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="紧急求助"
            title="紧急求助"
          >
            <span className="text-xl">🆘</span>
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 hover:bg-blue-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="对话记录"
            title="对话记录"
          >
            <span className="text-xl">📖</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-blue-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="设置"
          >
            <span className="text-xl">⚙</span>
          </button>
        </div>
      </header>

      {/* 模式切换标签 */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setActiveMode('express')}
          aria-pressed={activeMode === 'express'}
          className={`flex-1 py-2.5 text-base font-medium transition-colors ${
            activeMode === 'express'
              ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💬 表达
        </button>
        <button
          onClick={() => setActiveMode('receive')}
          aria-pressed={activeMode === 'receive'}
          className={`flex-1 py-2.5 text-base font-medium transition-colors ${
            activeMode === 'receive'
              ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          👂 接收
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
