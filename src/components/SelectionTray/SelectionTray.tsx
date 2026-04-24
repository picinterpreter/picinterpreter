import { SuggestionStrip } from './SuggestionStrip'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '@/stores/app-store'
import { resolveImageSrc } from '@/utils/generate-placeholder-svg'
import { LineIcon } from '@/components/ui/LineIcon'
import type { PictogramEntry } from '@/types'

function SortableItem({ pictogram, index, onRemove }: {
  pictogram: PictogramEntry
  index: number
  onRemove: (index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `sel-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex flex-col items-center gap-0.5 p-2 rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_18px_rgba(15,23,42,0.08)] min-w-[72px] select-none"
      {...attributes}
      {...listeners}
    >
      <img
        src={resolveImageSrc(pictogram.imageUrl, pictogram.labels.zh[0], '#2563EB')}
        alt={pictogram.labels.zh[0]}
        className="w-12 h-12 object-contain pointer-events-none"
      />
      <span className="text-sm font-semibold text-slate-800">
        {pictogram.labels.zh[0]}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(index)
        }}
        className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center hover:bg-slate-700 shadow"
        aria-label={`移除 ${pictogram.labels.zh[0]}`}
      >
        <LineIcon name="close" className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function SelectionTray() {
  const selectedPictograms = useAppStore((s) => s.selectedPictograms)
  const removePictogram = useAppStore((s) => s.removePictogram)
  const reorderPictograms = useAppStore((s) => s.reorderPictograms)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const setShowCandidatePanel = useAppStore((s) => s.setShowCandidatePanel)
  const isGenerating = useAppStore((s) => s.isGenerating)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = Number(String(active.id).replace('sel-', ''))
    const toIndex = Number(String(over.id).replace('sel-', ''))
    reorderPictograms(fromIndex, toIndex)
  }

  if (selectedPictograms.length === 0) {
    return (
      <>
        <div className="px-4 py-4 bg-white/70 border-t border-slate-200 text-center text-slate-400 backdrop-blur-xl" aria-label="选择图片">
          <LineIcon name="message" className="mx-auto h-7 w-7" />
        </div>
        <SuggestionStrip />
      </>
    )
  }

  return (
    <>
      <div className="px-4 py-3 bg-white/75 border-t border-slate-200 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedPictograms.map((_, i) => `sel-${i}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-2 overflow-x-auto flex-1 py-1.5">
                {selectedPictograms.map((p, i) => (
                  <SortableItem
                    key={`${p.id}-${i}`}
                    pictogram={p}
                    index={i}
                    onRemove={removePictogram}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={clearSelection}
              className="apple-press px-3 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors min-h-[44px]"
            >
              清空
            </button>
            <button
              onClick={() => setShowCandidatePanel(true)}
              disabled={isGenerating}
              className="apple-press px-4 py-2.5 rounded-full bg-slate-950 text-white text-base font-semibold hover:bg-slate-800 transition-colors disabled:opacity-45 min-h-[44px] shadow-sm"
            >
              {isGenerating ? '生成中...' : '生成句子'}
            </button>
          </div>
        </div>

        {/* 实时图片序列 */}
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-400 truncate" aria-label="已选图片">
          <LineIcon name="message" className="h-4 w-4 shrink-0" />
          <span className="truncate">{selectedPictograms.map((p) => p.labels.zh[0]).join('')}…</span>
        </p>
      </div>

      {/* 下一词建议 */}
      <SuggestionStrip />
    </>
  )
}
