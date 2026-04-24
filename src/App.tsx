import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
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
import { EmergencyPanel } from '@/components/Emergency/EmergencyPanel'
import { UpdateBanner } from '@/components/UpdateBanner/UpdateBanner'
import { OnboardingModal } from '@/components/Onboarding/OnboardingModal'
import { resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { cn } from '@/utils/cn'

const FONT_SIZE_MAP: Record<FontSize, string> = {
  normal: '16px',
  large:  '18px',
  xlarge: '20px',
}

export default function App() {
  const setShowSettings = useAppStore((s) => s.setShowSettings)
  const setShowEmergency = useAppStore((s) => s.setShowEmergency)
  const setShowSavedPhrases = useAppStore((s) => s.setShowSavedPhrases)
  const activeMode = useAppStore((s) => s.activeMode)
  const setActiveMode = useAppStore((s) => s.setActiveMode)
  const activeCategoryId = useAppStore((s) => s.activeCategoryId)
  const selectedPictograms = useAppStore((s) => s.selectedPictograms)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const setActiveCategory = useAppStore((s) => s.setActiveCategory)
  const startPlayback = useAppStore((s) => s.startPlayback)
  const highContrast = useSettingsStore((s) => s.highContrast)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())

  // 字体大小写入 :root，让 rem 单位全局生效
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize]
    return () => { document.documentElement.style.fontSize = '' }
  }, [fontSize])

  async function handleShareSentence() {
    if (!selectedSentencePreview) return

    try {
      if (navigator.share) {
        await navigator.share({ text: selectedSentencePreview })
        return
      }

      await navigator.clipboard.writeText(selectedSentencePreview)
    } catch (error) {
      console.warn('Share sentence failed:', error)
    }
  }

  const activeCategory = activeCategoryId === 'recent'
    ? { id: 'recent', name: '最近使用', icon: '🕐' }
    : categories?.find((category) => category.id === activeCategoryId)
  const selectedSentencePreview = selectedPictograms.map((p) => p.labels.zh[0]).join('')

  return (
    <div className={cn(
      'flex h-dvh flex-col overflow-hidden bg-stone-100 text-slate-900',
      highContrast && 'hc',
    )}>
      {activeMode === 'express' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-stone-300 bg-white">
            <div className="flex items-start gap-2 px-2 py-2 sm:px-3">
              <button
                onClick={() => setShowSavedPhrases(true)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg"
                aria-label="打开常用语"
                title="常用语"
              >
                ⭐
              </button>
              <button
                onClick={() => setActiveMode('receive')}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg"
                aria-label="切换到接收模式"
                title="接收模式"
              >
                👂
              </button>
              <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                {selectedPictograms.length > 0 ? (
                  <button
                    onClick={() => startPlayback(selectedSentencePreview, selectedPictograms.map((p) => p.id))}
                    className="flex min-h-[72px] w-full items-center gap-2 overflow-x-auto px-3 py-2 text-left"
                    aria-label="播放当前图片序列"
                  >
                    {selectedPictograms.map((p, index) => (
                      <div
                        key={`${p.id}-${index}`}
                        className="flex min-w-20 shrink-0 flex-col items-center gap-1 rounded-xl border border-stone-200 bg-white px-2 py-2"
                      >
                        <img
                          src={resolveImageSrc(p.imageUrl, p.labels.zh[0], '#334155')}
                          alt={p.labels.zh[0]}
                          className="size-9 object-contain"
                        />
                        <span className="max-w-full truncate text-xs font-medium text-slate-700">
                          {p.labels.zh[0]}
                        </span>
                      </div>
                    ))}
                  </button>
                ) : (
                  <div className="min-h-[72px]" />
                )}
              </div>
              <button
                onClick={handleShareSentence}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg"
                aria-label="分享当前句子"
                title="分享句子"
                disabled={!selectedSentencePreview}
              >
                ↗
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg"
                aria-label="打开设置"
                title="设置"
              >
                ⚙
              </button>
              <button
                onClick={() => clearSelection()}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg"
                aria-label="清空当前图片序列"
                title="清空当前图片序列"
                disabled={selectedPictograms.length === 0}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex min-h-10 shrink-0 items-center justify-between bg-[#4b4b4b] px-2 text-white sm:px-3">
            <button
              onClick={() => setShowSavedPhrases(true)}
              className="inline-flex min-h-10 min-w-10 items-center justify-center"
              aria-label="打开常用语"
              title="常用语"
            >
              ☰
            </button>
            <div className="min-w-0 px-2 text-center">
              <p className="truncate text-sm font-medium uppercase">
                {activeCategory?.name ?? '图语家'}
              </p>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setActiveMode('express')}
                className={cn(
                  'inline-flex min-h-10 min-w-10 items-center justify-center px-2 text-sm',
                  activeMode === 'express' ? 'text-white' : 'text-white/60',
                )}
                aria-label="表达模式"
              >
                表达
              </button>
              <button
                onClick={() => setShowEmergency(true)}
                className="inline-flex min-h-10 min-w-10 items-center justify-center text-lg"
                aria-label="打开紧急求助"
                title="紧急求助"
              >
                🆘
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="flex w-18 shrink-0 flex-col bg-[#ff7a7a] text-white">
              <ExpressSideButton
                label="最近"
                icon="🕐"
                onClick={() => setActiveCategory('recent')}
              />
              <ExpressSideButton
                label="短语"
                icon="⭐"
                onClick={() => setShowSavedPhrases(true)}
              />
              <ExpressSideButton
                label="接收"
                icon="👂"
                onClick={() => setActiveMode('receive')}
              />
              <ExpressSideButton
                label="清空"
                icon="↺"
                disabled={selectedPictograms.length === 0}
                onClick={() => clearSelection()}
              />
            </aside>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CategoryTabs />
              <PictogramGrid />
            </div>
          </div>

          <SelectionTray />
          <CandidatePanel />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden bg-stone-100">
          <ReceiverPanel />
        </div>
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

function ExpressSideButton({
  label,
  icon,
  disabled = false,
  onClick,
}: {
  label: string
  icon: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 border-b border-white/30 px-1 text-center text-xs font-medium',
        disabled && 'opacity-50',
      )}
      aria-label={label}
      title={label}
    >
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
