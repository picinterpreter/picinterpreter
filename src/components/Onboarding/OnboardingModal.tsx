/**
 * OnboardingModal — 首次使用引导弹窗。
 *
 * 显示条件：localStorage 中 `tuyujia_onboarded` 未设置。
 * 关闭后写入该标志，不再自动显示。
 * 可通过 SettingsDrawer 中的"重看引导"按钮重置标志并再次显示。
 *
 * 三个步骤：
 *   1. 欢迎 — 介绍图语家是什么
 *   2. 使用流程 — 3 步可视化说明
 *   3. AI 配置提示 — 引导配置 API Key，或先用离线模式
 */

import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores/app-store'

export const ONBOARDING_STORAGE_KEY = 'tuyujia_onboarded'
const STORAGE_KEY = ONBOARDING_STORAGE_KEY

// ─── 步骤定义 ────────────────────────────────────────────────────────────── //

interface Step {
  id: number
  content: React.ReactNode
}

// ─── Component ───────────────────────────────────────────────────────────── //

export function OnboardingModal() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const setShowSettings = useAppStore((s) => s.setShowSettings)
  const showOnboarding = useAppStore((s) => s.showOnboarding)
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding)

  // Also respond to the "重看引导" trigger from SettingsDrawer
  useEffect(() => {
    if (showOnboarding) {
      setStep(0)
      setVisible(true)
    }
  }, [showOnboarding])

  function handleFinish() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    setShowOnboarding(false)
  }

  function handleOpenSettings() {
    handleFinish()
    setShowSettings(true)
  }

  if (!visible) return null

  const steps: Step[] = [
    {
      id: 0,
      content: (
        <div className="flex flex-col items-center text-center gap-5">
          <span className="text-6xl">🗣️</span>
          <h2 className="text-2xl font-bold text-gray-900">欢迎使用图语家</h2>
          <p className="text-gray-600 text-base leading-relaxed max-w-xs">
            图语家是专为<strong>失语症患者</strong>设计的图片辅助沟通工具。<br />
            用图片表达你的想法，AI 自动组成自然的句子，再朗读出来。
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {[
              { icon: '🖼️', label: '图片选择' },
              { icon: '🤖', label: 'AI 生成句子' },
              { icon: '🔊', label: '语音朗读' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 min-w-[80px]"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs text-blue-700 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 1,
      content: (
        <div className="flex flex-col items-center text-center gap-4">
          <span className="text-5xl">📱</span>
          <h2 className="text-xl font-bold text-gray-900">三步完成一次表达</h2>
          <div className="w-full space-y-3">
            {[
              {
                num: '1',
                color: 'blue',
                icon: '🖼️',
                title: '选图片',
                desc: '从分类库中点选代表你想说的事物的图片',
              },
              {
                num: '2',
                color: 'green',
                icon: '🤖',
                title: '生成句子',
                desc: '点击「生成句子」，AI 根据图片组成 2-3 个候选句',
              },
              {
                num: '3',
                color: 'purple',
                icon: '🔊',
                title: '朗读',
                desc: '选择最合适的句子，设备自动朗读给照护者听',
              },
            ].map(({ num, color, icon, title, desc }) => (
              <div
                key={num}
                className={`flex items-start gap-3 p-3 rounded-xl text-left bg-${color}-50 border border-${color}-100`}
              >
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full bg-${color}-600 text-white text-sm font-bold flex items-center justify-center`}
                >
                  {num}
                </span>
                <div>
                  <p className="font-semibold text-gray-800">
                    {icon} {title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 2,
      content: (
        <div className="flex flex-col items-center text-center gap-5">
          <span className="text-5xl">⚙️</span>
          <h2 className="text-xl font-bold text-gray-900">配置 AI（可选）</h2>
          <div className="w-full space-y-3">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left">
              <p className="font-semibold text-amber-800 mb-1">📴 离线模式（默认）</p>
              <p className="text-sm text-amber-700">
                无需配置，直接使用。使用本地模板生成句子，质量较基础，但完全离线可用。
              </p>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-left">
              <p className="font-semibold text-green-800 mb-1">🌐 AI 模式（推荐）</p>
              <p className="text-sm text-green-700">
                填入 OpenAI / DeepSeek 等服务的 API Key，生成更自然、更贴切的句子。
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full mt-1">
            <button
              onClick={handleOpenSettings}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 transition-colors"
            >
              ⚙️ 现在去配置 API Key
            </button>
            <button
              onClick={handleFinish}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-base hover:bg-gray-200 transition-colors"
            >
              先用离线模式，以后再说
            </button>
          </div>
        </div>
      ),
    },
  ]

  const currentStep = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="使用引导"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* 步骤指示器 */}
        <div className="flex justify-center gap-2 pt-5 pb-1 px-6">
          {steps.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`h-1.5 rounded-full transition-all ${
                s.id === step
                  ? 'w-8 bg-blue-600'
                  : s.id < step
                  ? 'w-4 bg-blue-300'
                  : 'w-4 bg-gray-200'
              }`}
              aria-label={`跳转到第 ${s.id + 1} 步`}
            />
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 px-6 py-5 overflow-y-auto">
          {currentStep.content}
        </div>

        {/* 底部导航（最后一步的导航按钮由内容区自己提供） */}
        {!isLast && (
          <div className="px-6 pb-6 pt-2 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
              >
                ← 上一步
              </button>
            )}
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              下一步 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
