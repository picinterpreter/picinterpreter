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
import { LineIcon } from '@/components/ui/LineIcon'

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

  // Show on first visit (no localStorage flag)
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

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
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950 text-white shadow-lg">
            <LineIcon name="message" className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">欢迎使用图语家</h2>
          <div className="flex items-center gap-3 text-slate-500" aria-label="图片到语音">
            <LineIcon name="message" className="h-6 w-6" />
            <span className="h-px w-8 bg-slate-300" />
            <LineIcon name="sound" className="h-6 w-6" />
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {[
              { icon: 'message' as const, label: '图片选择' },
              { icon: 'sparkle' as const, label: 'AI 生成句子' },
              { icon: 'sound' as const, label: '语音朗读' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 min-w-[80px]"
              >
                <LineIcon name={icon} className="h-6 w-6 text-blue-700" />
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
          <LineIcon name="message" className="h-10 w-10 text-slate-900" />
          <h2 className="text-xl font-bold text-gray-900">三步完成一次表达</h2>
          <div className="w-full space-y-3">
            {[
              {
                num: '1',
                color: 'blue',
                title: '选图片',
              },
              {
                num: '2',
                color: 'green',
                title: '生成句子',
              },
              {
                num: '3',
                color: 'purple',
                title: '朗读',
              },
            ].map(({ num, color, title }) => (
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
                    {title}
                  </p>
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
          <LineIcon name="settings" className="h-10 w-10 text-slate-900" />
          <h2 className="text-xl font-bold text-gray-900">配置 AI（可选）</h2>
          <div className="w-full space-y-3">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left">
              <p className="font-semibold text-amber-800 mb-1">离线模式（默认）</p>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-left">
              <p className="font-semibold text-green-800 mb-1">AI 模式（推荐）</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full mt-1">
            <button
              onClick={handleOpenSettings}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <LineIcon name="settings" className="h-5 w-5" />
              现在去配置 API Key
            </button>
            <button
              onClick={handleFinish}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-base font-medium text-gray-600 transition-colors hover:bg-gray-200"
            >
              <LineIcon name="check" className="h-5 w-5" />
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-200"
              >
                <LineIcon name="arrowLeft" className="h-5 w-5" />
                上一步
              </button>
            )}
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              下一步
              <LineIcon name="arrowRight" className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
