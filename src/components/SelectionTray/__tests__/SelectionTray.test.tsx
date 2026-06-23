/**
 * SelectionTray 组件测试
 *
 * 覆盖：空状态提示、图片标签渲染、清空操作、单项移除、"说"按钮禁用态。
 * dnd-kit 的拖拽能力在 jsdom 中无法完整模拟，故将其存根，
 * 保证测试专注于业务逻辑而非拖拽底层实现。
 */

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SelectionTray } from '../SelectionTray'
import { useAppStore } from '@/stores/app-store'
import type { PictogramEntry } from '@/types'

// ── dnd-kit 存根 ──────────────────────────────────────────────────────────── //
// jsdom 不支持 PointerEvent / CSS transforms，直接将拖拽容器替换为透传包裹。

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  horizontalListSortingStrategy: {},
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}))

// ── 测试辅助 ──────────────────────────────────────────────────────────────── //

function makePictogram(overrides: Partial<PictogramEntry> = {}): PictogramEntry {
  return {
    id: 'water',
    imageUrl: 'https://example.com/water.png',
    labels: { zh: ['喝水'], en: ['water'] },
    categoryId: 'food',
    synonyms: [],
    disambiguationHints: {},
    usageCount: 0,
    ...overrides,
  }
}

// ── 测试套件 ──────────────────────────────────────────────────────────────── //

describe('SelectionTray', () => {
  beforeEach(() => {
    // 每个测试前重置 store 到干净初始状态
    useAppStore.setState({
      selectedPictograms: [],
      isGenerating: false,
      showCandidatePanel: false,
    })
  })

  afterEach(() => {
    // 清理 DOM，防止测试间污染（globals: false 时需要手动调用）
    cleanup()
    vi.clearAllMocks()
  })

  it('空状态下渲染图片序列占位区域', () => {
    render(<SelectionTray />)
    expect(screen.getByLabelText('图片序列')).toBeInTheDocument()
  })

  it('渲染已选图片的中文标签', () => {
    useAppStore.setState({
      selectedPictograms: [
        makePictogram({ id: 'water', labels: { zh: ['喝水'], en: ['water'] } }),
        makePictogram({ id: 'doctor', labels: { zh: ['医生'], en: ['doctor'] }, categoryId: 'people' }),
      ],
    })

    render(<SelectionTray />)

    expect(screen.getByText('喝水')).toBeInTheDocument()
    expect(screen.getByText('医生')).toBeInTheDocument()
  })

  it('点击"清空"后 selectedPictograms 变为空数组', () => {
    useAppStore.setState({
      selectedPictograms: [
        makePictogram({ id: 'water', labels: { zh: ['喝水'], en: ['water'] } }),
      ],
    })

    render(<SelectionTray />)
    fireEvent.click(screen.getByRole('button', { name: /清空/ }))

    expect(useAppStore.getState().selectedPictograms).toHaveLength(0)
  })

  it('点击单项移除按钮后该图片从序列中删除', () => {
    useAppStore.setState({
      selectedPictograms: [
        makePictogram({ id: 'water', labels: { zh: ['喝水'], en: ['water'] } }),
        makePictogram({ id: 'doctor', labels: { zh: ['医生'], en: ['doctor'] } }),
      ],
    })

    render(<SelectionTray />)
    fireEvent.click(screen.getByLabelText('移除 喝水'))

    const remaining = useAppStore.getState().selectedPictograms
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.id).toBe('doctor')
  })

  it('"说"按钮在生成中时处于禁用态', () => {
    useAppStore.setState({
      selectedPictograms: [
        makePictogram({ id: 'water', labels: { zh: ['喝水'], en: ['water'] } }),
      ],
      isGenerating: true,
    })

    render(<SelectionTray />)

    expect(screen.getByRole('button', { name: /生成中/ })).toBeDisabled()
  })
})
