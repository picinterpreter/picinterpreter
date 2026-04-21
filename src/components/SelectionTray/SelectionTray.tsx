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
      className="relative flex flex-col items-center gap-0.5 p-2 rounded-lg bg-blue-50 border border-blue-200 min-w-[72px] select-none"
      {...attributes}
      {...listeners}
    >
      <img
        src={resolveImageSrc(pictogram.imageUrl, pictogram.labels.zh[0], '#2563EB')}
        alt={pictogram.labels.zh[0]}
        className="w-12 h-12 object-contain pointer-events-none"
      />
      <span className="text-sm font-medium text-blue-800">
        {pictogram.labels.zh[0]}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(index)
        }}
        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 shadow"
        aria-label={`移除 ${pictogram.labels.zh[0]}`}
      >
        ×
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
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center text-gray-400 text-base">
          点击上方图片开始选择
        </div>
        <SuggestionStrip />
      </>
    )
  }

  return (
    <>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
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
              <div className="flex gap-2 overflow-x-auto flex-1 py-1">
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
              className="px-3 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm hover:bg-gray-300 transition-colors min-h-[44px]"
            >
              清空
            </button>
            <button
              onClick={() => setShowCandidatePanel(true)}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-base font-medium hover:bg-green-700 transition-colors disabled:opacity-50 min-h-[44px] shadow"
            >
              {isGenerating ? '生成中...' : '生成句子 ▶'}
            </button>
          </div>
        </div>

        {/* 实时句子预览 */}
        <p className="mt-1.5 text-sm text-gray-400 truncate">
          🗣 {selectedPictograms.map((p) => p.labels.zh[0]).join('')}…
        </p>
      </div>

      {/* 下一词建议 */}
      <SuggestionStrip />
    </>
  )
}
