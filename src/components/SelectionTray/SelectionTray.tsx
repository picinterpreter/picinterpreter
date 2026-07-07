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
      className="radius-card relative flex min-w-[5.25rem] select-none flex-col items-center gap-0.5 border-2 border-blue-200 bg-blue-50 p-2"
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
        className="absolute -top-3 -right-3 flex min-h-11 min-w-11 items-center justify-center rounded-full text-white"
        aria-label={`移除 ${pictogram.labels.zh[0]}`}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-slate-950 transition-colors hover:bg-slate-700">
          <LineIcon name="close" className="h-3.5 w-3.5" />
        </span>
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
      <div className="flex h-24 items-center justify-center border-b-2 border-blue-200 bg-blue-50 text-blue-300" aria-label="图片序列">
        <LineIcon name="message" className="h-9 w-9" />
      </div>
    )
  }

  return (
    <>
      <div className="border-b-2 border-blue-200 bg-blue-50 px-3 py-3">
        <div className="flex items-stretch gap-2 sm:gap-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedPictograms.map((_, i) => `sel-${i}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex min-h-[5.75rem] min-w-0 flex-1 gap-2 overflow-x-auto py-1.5">
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

          <div className="flex w-28 shrink-0 flex-col gap-2 sm:w-32">
            <button
              onClick={clearSelection}
              className="apple-press radius-control flex flex-1 items-center justify-center gap-1.5 border-2 border-blue-200 bg-white px-3 py-2 text-base font-semibold text-blue-900 transition-colors hover:bg-blue-100"
            >
              <LineIcon name="trash" className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">清空</span>
            </button>
            <button
              onClick={() => setShowCandidatePanel(true)}
              disabled={isGenerating}
              className="apple-press radius-control flex flex-[1.4] items-center justify-center gap-1.5 bg-blue-700 px-3 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-45"
            >
              <LineIcon name={isGenerating ? 'loader' : 'sound'} className={`h-5 w-5 shrink-0 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">{isGenerating ? '生成中' : '说'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
