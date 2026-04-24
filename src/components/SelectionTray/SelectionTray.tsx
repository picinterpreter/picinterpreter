import { useAppStore } from '@/stores/app-store'
import { cn } from '@/utils/cn'

export function SelectionTray() {
  const selectedPictograms = useAppStore((s) => s.selectedPictograms)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const setShowCandidatePanel = useAppStore((s) => s.setShowCandidatePanel)
  const isGenerating = useAppStore((s) => s.isGenerating)

  const sentencePreview = selectedPictograms.map((p) => p.labels.zh[0]).join('')
  const hasSelection = selectedPictograms.length > 0

  return (
    <div className="shrink-0 border-t border-white/10 bg-slate-950 px-2 py-2 pb-safe sm:px-3">
      <div className="rounded-2xl bg-purple-900 px-3 py-3 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={clearSelection}
            disabled={!hasSelection}
            className={cn(
              'inline-flex size-11 shrink-0 items-center justify-center rounded-xl border text-xl',
              hasSelection
                ? 'border-white/20 bg-white/10'
                : 'border-white/10 bg-white/5 text-white/40',
            )}
            aria-label="清空当前句子"
            title="清空当前句子"
          >
            ←
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-semibold">
              {hasSelection ? sentencePreview : '请先点击上方图片开始表达'}
            </p>
          </div>

          <button
            onClick={() => setShowCandidatePanel(true)}
            disabled={!hasSelection || isGenerating}
            className={cn(
              'inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl',
              hasSelection && !isGenerating
                ? 'bg-white text-purple-900'
                : 'bg-white/15 text-white/40',
            )}
            aria-label="生成并播放句子"
            title="生成并播放句子"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  )
}
