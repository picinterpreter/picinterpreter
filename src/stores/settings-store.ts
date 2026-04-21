import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontSize = 'normal' | 'large' | 'xlarge'
export type GridCols = 2 | 3 | 4

interface SettingsState {
  /** NLG provider 配置 */
  nlgBaseUrl: string
  nlgApiKey: string
  nlgModel: string

  /** TTS 语速 */
  ttsRate: number
  /** TTS 首选语音名称（空字符串 = 自动选择最佳中文语音） */
  ttsVoiceName: string

  /** 高对比度模式 */
  highContrast: boolean

  /** 界面字体大小 */
  fontSize: FontSize

  /** 图片网格列数（2=大图 / 3=默认 / 4=紧凑） */
  gridCols: GridCols

  /** 在分类栏隐藏的分类 ID 列表（患者不需要的分类，照护者可以隐藏） */
  hiddenCategoryIds: string[]

  // Actions
  setNlgConfig: (baseUrl: string, apiKey: string, model: string) => void
  setTtsRate: (rate: number) => void
  setTtsVoiceName: (name: string) => void
  setHighContrast: (v: boolean) => void
  setFontSize: (v: FontSize) => void
  setGridCols: (v: GridCols) => void
  toggleCategoryVisibility: (id: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      nlgBaseUrl: 'https://api.openai.com/v1',
      nlgApiKey: '',
      nlgModel: 'gpt-4o-mini',
      ttsRate: 0.9,
      ttsVoiceName: '',
      highContrast: false,
      fontSize: 'normal',
      gridCols: 3,
      hiddenCategoryIds: [],

      setNlgConfig: (baseUrl, apiKey, model) =>
        set({ nlgBaseUrl: baseUrl, nlgApiKey: apiKey, nlgModel: model }),

      setTtsRate: (rate) => set({ ttsRate: rate }),
      setTtsVoiceName: (name) => set({ ttsVoiceName: name }),
      setHighContrast: (v) => set({ highContrast: v }),
      setFontSize: (v) => set({ fontSize: v }),
      setGridCols: (v) => set({ gridCols: v }),

      toggleCategoryVisibility: (id) =>
        set((state) => ({
          hiddenCategoryIds: state.hiddenCategoryIds.includes(id)
            ? state.hiddenCategoryIds.filter((x) => x !== id)
            : [...state.hiddenCategoryIds, id],
        })),
    }),
    { name: 'tuyujia-settings' },
  ),
)
