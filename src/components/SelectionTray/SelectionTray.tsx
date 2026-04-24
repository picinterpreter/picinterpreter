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
      className="relative flex min-w-[5.25rem] flex-col items-center gap-0.5 rounded-[22px] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_18px_rgba(15,23,42,0.08)] select-none"
      {...attributes}
      {...listeners}
    >
      <img
        src={resolveImageSrc(pictogram.imageUrl, pictogram.labels.zh[0], '#2563EB')}
        alt={pictogram.labels.zh[0]}
        className="h-14 w-14 object-contain pointer-events-none"
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
        <div className="flex h-24 items-center justify-center border-b border-slate-200 bg-white/85 text-slate-300 backdrop-blur-xl" aria-label="图片序列">
          <LineIcon name="message" className="h-9 w-9" />
        </div>
        <SuggestionStrip />
      </>
    )
  }

  return (
    <>
      <div className="border-b border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-xl">
        <div className="flex items-stretch gap-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedPictograms.map((_, i) => `sel-${i}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex min-h-[5.75rem] flex-1 gap-2 overflow-x-auto py-1.5">
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

          <div className="flex w-24 shrink-0 flex-col gap-2 sm:w-32">
            <button
              onClick={clearSelection}
              className="apple-press flex flex-1 items-center justify-center gap-1.5 rounded-[22px] bg-slate-100 px-3 py-2 text-base font-semibold text-slate-600 transition-colors hover:bg-slate-200"
            >
              <LineIcon name="trash" className="h-5 w-5" />
              清空
            </button>
            <button
              onClick={() => setShowCandidatePanel(true)}
              disabled={isGenerating}
              className="apple-press flex flex-[1.4] items-center justify-center gap-1.5 rounded-[22px] bg-slate-950 px-3 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-45"
            >
              <LineIcon name={isGenerating ? 'loader' : 'sound'} className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? '生成中' : '说'}
            </button>
          </div>
        </div>
      </div>

      {/* 下一词建议 */}
      <SuggestionStrip />
    </>
  )
}
