/**
 * EmergencyPanel — 紧急求助全屏面板。
 *
 * 设计原则：
 *  - 零导航、零思考：患者只需一次点击即可播报关键求助语
 *  - 按钮超大（min-h-24），即使运动控制受限也易点中
 *  - 红色主题，与常规 UI 明显区分，减少误触常规操作
 *  - 按 Escape 或点击右上角 × 可关闭，焦点返回触发按钮
 *  - TTS 失败时显示大字文本覆盖，确保患者在任何情况下都能传达意思
 *  - 播报由 AI service 的 TTS 处理；不依赖任何 DB 状态
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/app-store'
import { useAI } from '@/hooks/use-ai'

// ─── 预定义紧急短语 ──────────────────────────────────────────────────────── //

interface EmergencyPhrase {
  id: string
  label: string
  text: string
  /** 按钮的 Tailwind 颜色主题 */
  colorClass: string
}

const EMERGENCY_PHRASES: EmergencyPhrase[] = [
  {
    id: 'help',
    label: '帮帮我',
    text: '帮帮我',
    colorClass: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
  },
  {
    id: 'pain',
    label: '我很痛',
    text: '我很痛',
    colorClass: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
  },
  {
    id: 'doctor',
    label: '叫医生',
    text: '请叫医生',
    colorClass: 'bg-red-500 hover:bg-red-600 active:bg-red-700',
  },
  {
    id: 'scared',
    label: '我害怕',
    text: '我害怕',
    colorClass: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800',
  },
  {
    id: 'uncomfortable',
    label: '不舒服',
    text: '我不舒服',
    colorClass: 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800',
  },
  {
    id: 'quiet',
    label: '请安静',
    text: '请安静',
    colorClass: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
  },
  {
    id: 'water',
    label: '要喝水',
    text: '我要喝水',
    colorClass: 'bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800',
  },
  {
    id: 'toilet',
    label: '上厕所',
    text: '我要上厕所',
    colorClass: 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800',
  },
]

// ─── Component ───────────────────────────────────────────────────────────── //

export function EmergencyPanel() {
  const showEmergency = useAppStore((s) => s.showEmergency)
  const setShowEmergency = useAppStore((s) => s.setShowEmergency)
  const ai = useAI()
  const ttsRate = 1.0

  /** TTS 失败时显示的大字文本（null = 不显示） */
  const [ttsFailureText, setTtsFailureText] = useState<string | null>(null)

  // mountedRef + speakGenRef: same pattern as PlaybackOverlay to prevent TTS race
  const mountedRef = useRef(true)
  const speakGenRef = useRef(0)

  // For focus management: where focus was before the panel opened
  const previousFocusRef = useRef<HTMLElement | null>(null)
  // The close button gets focus when the panel opens
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Cleanup TTS failure overlay timer
  const failureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      ai.stopSpeaking()
      if (failureTimerRef.current) clearTimeout(failureTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When panel opens: save previous focus, lock body scroll, move focus inside
  // When panel closes: restore scroll, restore focus
  useEffect(() => {
    if (showEmergency) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      // Defer focus so the panel has rendered
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus()
      })
    } else {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
      // Clear any TTS failure text when panel closes
      setTtsFailureText(null)
      if (failureTimerRef.current) {
        clearTimeout(failureTimerRef.current)
        failureTimerRef.current = null
      }
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showEmergency])

  // Escape key closes the panel
  useEffect(() => {
    if (!showEmergency) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowEmergency(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showEmergency, setShowEmergency])

  const handleSpeak = useCallback((phrase: EmergencyPhrase) => {
    ai.stopSpeaking()
    // Clear any previous failure overlay
    setTtsFailureText(null)
    if (failureTimerRef.current) {
      clearTimeout(failureTimerRef.current)
      failureTimerRef.current = null
    }

    const gen = ++speakGenRef.current
    ai.speak({ text: phrase.text, lang: 'zh-CN', rate: ttsRate }).then((result) => {
      if (!mountedRef.current || gen !== speakGenRef.current) return
      if (!result.success) {
        // TTS 不可用：显示大字文本覆盖，确保照护者能看到患者的意思
        setTtsFailureText(phrase.text)
        // 5 秒后自动消失，避免永久占据屏幕
        failureTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setTtsFailureText(null)
          failureTimerRef.current = null
        }, 5000)
      }
    })
  // ai and ttsRate are stable; speakGenRef/mountedRef are refs (not state)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!showEmergency) return null

  return (
    /* 全屏遮罩 */
    <div
      className="fixed inset-0 z-50 bg-red-900 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="紧急求助"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-red-950 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🆘</span>
          <h2 className="text-xl font-bold text-white">紧急求助</h2>
          <span className="text-sm text-red-300 ml-2">点击按钮立即播报</span>
        </div>
        <button
          ref={closeButtonRef}
          onClick={() => setShowEmergency(false)}
          className="
            p-2 rounded-xl text-white bg-red-800 hover:bg-red-700 active:bg-red-600
            min-h-[44px] min-w-[44px] flex items-center justify-center text-2xl
            focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-60
          "
          aria-label="关闭紧急求助"
        >
          ✕
        </button>
      </div>

      {/* 按钮网格 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {EMERGENCY_PHRASES.map((phrase) => (
            <button
              key={phrase.id}
              onClick={() => handleSpeak(phrase)}
              className={`
                ${phrase.colorClass}
                min-h-24 rounded-2xl
                flex flex-col items-center justify-center gap-2
                text-white font-bold text-xl
                shadow-lg active:scale-95 transition-transform
                focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-60
              `}
              aria-label={`播报：${phrase.text}`}
            >
              <span className="text-3xl" aria-hidden="true">
                {PHRASE_ICONS[phrase.id] ?? '🔊'}
              </span>
              <span>{phrase.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-3 bg-red-950 text-center text-red-300 text-sm shrink-0">
        按 <kbd className="px-1 py-0.5 bg-red-800 rounded text-xs">Esc</kbd> 或点击 ✕ 返回主界面
      </div>

      {/* TTS 失败时的大字文本覆盖：让照护者直接看到患者的需求 */}
      {ttsFailureText && (
        <div
          className="
            absolute inset-0 z-10
            bg-black/80 flex flex-col items-center justify-center
            px-6 gap-6
          "
          role="alert"
          aria-live="assertive"
        >
          <p className="text-white text-7xl font-bold text-center leading-tight">
            {ttsFailureText}
          </p>
          <p className="text-gray-300 text-lg text-center">（语音播报不可用，请将屏幕展示给照护者）</p>
          <button
            onClick={() => setTtsFailureText(null)}
            className="
              mt-2 px-6 py-3 rounded-2xl
              bg-white text-black font-bold text-xl
              active:bg-gray-200 transition-colors
            "
          >
            关闭
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 图标映射 ────────────────────────────────────────────────────────────── //

const PHRASE_ICONS: Record<string, string> = {
  help:          '🙏',
  pain:          '😣',
  doctor:        '👨‍⚕️',
  scared:        '😨',
  uncomfortable: '🤢',
  quiet:         '🤫',
  water:         '💧',
  toilet:        '🚻',
}
