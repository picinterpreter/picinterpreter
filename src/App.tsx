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
  const setShowSavedPhrases = useAppStore((s) => s.setShowSavedPhrases)
  const setShowCategoryLinks = useAppStore((s) => s.setShowCategoryLinks)
  const activeMode = useAppStore((s) => s.activeMode)
  const setActiveMode = useAppStore((s) => s.setActiveMode)
  const setActiveCategory = useAppStore((s) => s.setActiveCategory)
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
      <header className="flex items-center gap-2 bg-white/85 px-3 py-2 text-slate-950 shadow-[0_1px_0_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-4">
        <div className="hidden min-w-0 shrink-0 sm:block">
          <h1 className="text-xl font-semibold leading-tight tracking-normal">图语家</h1>
        </div>
        <div className="grid h-11 min-w-[9rem] max-w-[12rem] flex-1 grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 sm:ml-2 sm:flex-none" role="tablist" aria-label="模式切换">
          <button
            onClick={() => setActiveMode('express')}
            aria-pressed={activeMode === 'express'}
            className={`flex items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:text-base ${
              activeMode === 'express'
                ? 'bg-white text-slate-950 shadow-[0_1px_6px_rgba(15,23,42,0.10)]'
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
            }`}
          >
            <LineIcon name="message" className="h-5 w-5" />
            <span>表达</span>
          </button>
          <button
            onClick={() => setActiveMode('receive')}
            aria-pressed={activeMode === 'receive'}
            className={`flex items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 sm:text-base ${
              activeMode === 'receive'
                ? 'bg-white text-slate-950 shadow-[0_1px_6px_rgba(15,23,42,0.10)]'
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
            }`}
          >
            <LineIcon name="ear" className="h-5 w-5" />
            <span>接收</span>
          </button>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
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


      {activeMode === 'express' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* 图片序列预览栏 */}
          <SelectionTray />

          <div className="flex min-h-0 flex-1">
            <aside className="flex w-[4.75rem] shrink-0 flex-col gap-3 border-r-2 border-rose-200 bg-rose-50 px-2 py-3 sm:w-24">
              <button
                onClick={() => setActiveCategory('quickchat')}
                className="apple-press flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-[24px] bg-rose-600 text-white shadow-sm"
                aria-label="首页"
              >
                <LineIcon name="message" className="h-7 w-7" />
                <span className="text-sm font-semibold">首页</span>
              </button>
              <button
                onClick={() => setActiveCategory('recent')}
                className="apple-press flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-[24px] bg-white text-rose-950 shadow-[inset_0_0_0_2px_rgba(251,113,133,0.35)]"
                aria-label="最近"
              >
                <LineIcon name="clock" className="h-7 w-7" />
                <span className="text-sm font-semibold">最近</span>
              </button>
              <button
                onClick={() => setShowSavedPhrases(true)}
                className="apple-press flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-[24px] bg-white text-rose-950 shadow-[inset_0_0_0_2px_rgba(251,113,133,0.35)]"
                aria-label="常用语"
              >
                <LineIcon name="star" className="h-7 w-7" />
                <span className="text-sm font-semibold">常用</span>
              </button>
              <button
                onClick={() => setShowCategoryLinks(true)}
                className="apple-press mt-auto flex min-h-[60px] items-center justify-center rounded-[22px] bg-white text-rose-700 shadow-[inset_0_0_0_2px_rgba(251,113,133,0.35)]"
                aria-label="分类链接"
              >
                <LineIcon name="link" className="h-6 w-6" />
              </button>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
              <QuickAccessBar />
              <CategoryTabs />
              <PictogramGrid />
            </main>
          </div>

          <CandidatePanel />
        </div>
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
