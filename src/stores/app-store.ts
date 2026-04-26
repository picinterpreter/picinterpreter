import { create } from 'zustand'
import type { PictogramEntry } from '@/types'

interface AppState {
  /** 当前主界面模式：express = 患者表达，receive = 接收/理解他人话语 */
  activeMode: 'express' | 'receive'
  /** 当前选中的分类 ID；root = 文件夹首页 */
  activeCategoryId: string
  /** 分类浏览路径，用于返回上一层 */
  categoryPath: string[]
  /** 暂存区：已选图片序列 */
  selectedPictograms: PictogramEntry[]
  /** 候选句列表 */
  candidateSentences: string[]
  /** 是否正在生成句子 */
  isGenerating: boolean
  /** 是否显示候选句面板 */
  showCandidatePanel: boolean
  /** 是否全屏播报中 */
  showPlayback: boolean
  /** 当前播报的句子 */
  playbackSentence: string
  /** 播报时配套显示的图片 ID 列表（来自 SavedPhrase，空数组 = 不显示图片） */
  playbackPictogramIds: string[]
  /** TTS 是否可用（播报后更新） */
  ttsAvailable: boolean
  /** 是否显示常用表达抽屉 */
  showSavedPhrases: boolean
  /** 是否显示设置抽屉 */
  showSettings: boolean
  /** 是否显示分类链接管理抽屉 */
  showCategoryLinks: boolean
  /** 是否显示对话历史抽屉 */
  showHistory: boolean
  /** 是否显示紧急求助面板 */
  showEmergency: boolean
  /** 是否显示使用引导弹窗（首次开启由 OnboardingModal 内部管理；此处供"重看引导"使用） */
  showOnboarding: boolean

  // Actions
  setActiveCategory: (id: string) => void
  openCategory: (id: string) => void
  goBackCategory: () => void
  goRootCategory: () => void
  addPictogram: (p: PictogramEntry) => void
  removePictogram: (index: number) => void
  reorderPictograms: (from: number, to: number) => void
  clearSelection: () => void
  setCandidates: (sentences: string[]) => void
  clearCandidates: () => void
  setIsGenerating: (v: boolean) => void
  setShowCandidatePanel: (v: boolean) => void
  startPlayback: (sentence: string, pictogramIds?: string[]) => void
  stopPlayback: () => void
  setTtsAvailable: (v: boolean) => void
  setShowSavedPhrases: (v: boolean) => void
  setShowSettings: (v: boolean) => void
  setShowCategoryLinks: (v: boolean) => void
  setShowHistory: (v: boolean) => void
  setShowEmergency: (v: boolean) => void
  setShowOnboarding: (v: boolean) => void
  setActiveMode: (mode: 'express' | 'receive') => void
}

export const useAppStore = create<AppState>((set) => ({
  activeMode: 'express',
  activeCategoryId: 'root',
  categoryPath: [],
  selectedPictograms: [],
  candidateSentences: [],
  isGenerating: false,
  showCandidatePanel: false,
  showPlayback: false,
  playbackSentence: '',
  playbackPictogramIds: [],
  ttsAvailable: true,
  showSavedPhrases: false,
  showSettings: false,
  showCategoryLinks: false,
  showHistory: false,
  showEmergency: false,
  showOnboarding: false,

  setActiveCategory: (id) => set({ activeCategoryId: id, categoryPath: [] }),
  openCategory: (id) =>
    set((state) => ({
      activeCategoryId: id,
      categoryPath: state.activeCategoryId === id
        ? state.categoryPath
        : [...state.categoryPath, state.activeCategoryId],
    })),
  goBackCategory: () =>
    set((state) => {
      const nextPath = state.categoryPath.slice(0, -1)
      return {
        activeCategoryId: state.categoryPath.at(-1) ?? 'root',
        categoryPath: nextPath,
      }
    }),
  goRootCategory: () => set({ activeCategoryId: 'root', categoryPath: [] }),

  addPictogram: (p) =>
    set((state) => ({
      selectedPictograms: [...state.selectedPictograms, p],
      // 图片变了，旧候选句失效
      candidateSentences: [],
    })),

  removePictogram: (index) =>
    set((state) => ({
      selectedPictograms: state.selectedPictograms.filter((_, i) => i !== index),
      candidateSentences: [],
    })),

  reorderPictograms: (from, to) =>
    set((state) => {
      const items = [...state.selectedPictograms]
      const [moved] = items.splice(from, 1)
      items.splice(to, 0, moved)
      return { selectedPictograms: items, candidateSentences: [] }
    }),

  clearSelection: () =>
    set({
      selectedPictograms: [],
      candidateSentences: [],
      showCandidatePanel: false,
    }),

  setCandidates: (sentences) =>
    set({ candidateSentences: sentences, showCandidatePanel: true }),

  clearCandidates: () => set({ candidateSentences: [], isGenerating: false }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setShowCandidatePanel: (v) => set({ showCandidatePanel: v }),

  startPlayback: (sentence, pictogramIds = []) =>
    set({ showPlayback: true, playbackSentence: sentence, playbackPictogramIds: pictogramIds }),

  stopPlayback: () =>
    set({ showPlayback: false, playbackSentence: '', playbackPictogramIds: [] }),

  setTtsAvailable: (v) => set({ ttsAvailable: v }),
  setShowSavedPhrases: (v) => set({ showSavedPhrases: v }),
  setShowSettings: (v) => set({ showSettings: v }),
  setShowCategoryLinks: (v) => set({ showCategoryLinks: v }),
  setShowHistory: (v) => set({ showHistory: v }),
  setShowEmergency: (v) => set({ showEmergency: v }),
  setShowOnboarding: (v) => set({ showOnboarding: v }),
  setActiveMode: (mode) => set({ activeMode: mode }),
}))
