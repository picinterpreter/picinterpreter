import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type FontSize, type GridCols } from '@/stores/settings-store'
import { AuthSettingsSection } from '@/components/Settings/AuthSettingsSection'
import { ONBOARDING_STORAGE_KEY } from '@/components/Onboarding/OnboardingModal'
import { LineIcon } from '@/components/ui/LineIcon'
import { db } from '@/db'

interface AIBackendStatus {
  configured: boolean
  model: string | null
  baseUrl: string | null
}

export function SettingsDrawer() {
  const showSettings = useAppStore((s) => s.showSettings)
  const setShowSettings = useAppStore((s) => s.setShowSettings)
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding)
  const settings = useSettingsStore()

  const [rate, setRate] = useState(settings.ttsRate)
  const [voiceName, setVoiceName] = useState(settings.ttsVoiceName)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [previewing, setPreviewing] = useState(false)
  const previewingRef = useRef(false)
  const canUseSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window

  type TestStatus = 'idle' | 'testing' | 'ok' | 'error'
  const [backendStatus, setBackendStatus] = useState<AIBackendStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const testAbortRef = useRef<AbortController | null>(null)

  const allCategories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      const zhVoices = voices.filter((v) =>
        v.lang.toLowerCase().startsWith('zh') || v.lang.toLowerCase().startsWith('cmn'),
      )
      setAvailableVoices(zhVoices.length > 0 ? zhVoices : voices.slice(0, 10))
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  useEffect(() => { previewingRef.current = previewing }, [previewing])

  useEffect(() => {
    return () => {
      if (previewingRef.current) {
        window.speechSynthesis?.cancel()
      }
    }
  }, [])

  useEffect(() => {
    return () => { testAbortRef.current?.abort() }
  }, [])

  useEffect(() => {
    if (!showSettings) {
      if (previewingRef.current) {
        window.speechSynthesis?.cancel()
        setPreviewing(false)
        previewingRef.current = false
      }
      return
    }
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSettings(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showSettings, setShowSettings])

  useEffect(() => {
    if (!showSettings) return

    const ctrl = new AbortController()
    setStatusLoading(true)

    fetch('/api/ai/health', { signal: ctrl.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json() as AIBackendStatus
        setBackendStatus(data)
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setBackendStatus(null)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setStatusLoading(false)
      })

    return () => ctrl.abort()
  }, [showSettings])

  const FONT_SIZE_OPTIONS: { value: FontSize; label: string; desc: string }[] = [
    { value: 'normal', label: '正常', desc: '16px' },
    { value: 'large', label: '大', desc: '18px' },
    { value: 'xlarge', label: '超大', desc: '20px' },
  ]

  const GRID_COLS_OPTIONS: { value: GridCols; label: string; desc: string }[] = [
    { value: 2, label: '大图', desc: '2列' },
    { value: 3, label: '默认', desc: '3列' },
    { value: 4, label: '紧凑', desc: '4列' },
  ]

  if (!showSettings) return null

  function handlePreviewTts() {
    if (!('speechSynthesis' in window)) return

    if (previewing) {
      window.speechSynthesis.cancel()
      setPreviewing(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance('你好，这是图语家的语音播报效果测试。')
    utterance.lang = 'zh-CN'
    utterance.rate = rate

    if (voiceName) {
      const voice = window.speechSynthesis.getVoices().find((v) => v.name === voiceName)
      if (voice) utterance.voice = voice
    }

    utterance.onstart = () => setPreviewing(true)
    utterance.onend = () => setPreviewing(false)
    utterance.onerror = () => setPreviewing(false)

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  async function handleTestConnection() {
    if (testStatus === 'testing') return

    testAbortRef.current?.abort()
    const ctrl = new AbortController()
    testAbortRef.current = ctrl

    setTestStatus('testing')
    setTestMessage(null)

    const timeoutId = setTimeout(
      () => ctrl.abort(new DOMException('Timeout', 'TimeoutError')),
      10_000,
    )

    try {
      const response = await fetch('/api/ai/sentences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pictogramLabels: ['我', '喝水'],
          candidateCount: 1,
        }),
        signal: ctrl.signal,
      })

      if (ctrl.signal.aborted) return

      if (response.ok) {
        const data = await response.json() as { candidates?: string[] }
        if (ctrl.signal.aborted) return
        setTestStatus('ok')
        setTestMessage(`连接成功 · ${data.candidates?.[0] ?? 'AI 可用'}`)
      } else {
        const text = await response.text().catch(() => String(response.status))
        if (ctrl.signal.aborted) return
        setTestStatus('error')
        setTestMessage(`${response.status} ${text.split('\n')[0].slice(0, 120)}`)
      }
    } catch (error) {
      if (ctrl.signal.aborted && !(error instanceof Error && error.name === 'TimeoutError')) return
      setTestStatus('error')
      if (error instanceof Error && error.name === 'TimeoutError') {
        setTestMessage('请求超时（100s）')
      } else if (error instanceof TypeError) {
        setTestMessage('网络错误，请检查 Next.js 服务是否正常运行')
      } else {
        setTestMessage(String(error))
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  function handleSave() {
    settings.setTtsRate(rate)
    settings.setTtsVoiceName(voiceName)
    setShowSettings(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-slate-950/45 backdrop-blur-[1px]" onClick={() => setShowSettings(false)} />

      <div className="flex w-[28rem] max-w-[92vw] flex-col bg-slate-50 shadow-2xl">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">设置</h2>
              <p className="mt-0.5 text-xs text-slate-500">账号、语音和显示偏好</p>
            </div>
          <button
            onClick={() => setShowSettings(false)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="关闭"
          >
            <LineIcon name="close" className="h-5 w-5" />
          </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <AuthSettingsSection />

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-800">AI 生成</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">检测后端模型配置，失败时仍可使用离线模板。</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                statusLoading
                  ? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                  : backendStatus?.configured
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
              }`}>
                {statusLoading ? '检测中' : backendStatus?.configured ? '已配置' : '未配置'}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
              <p className="text-xs font-medium uppercase text-slate-400">当前后端</p>
              <p className="text-sm text-slate-600">
                模型：{backendStatus?.model ?? '未设置'}
              </p>
              <p className="break-all text-sm text-slate-600">
                地址：{backendStatus?.baseUrl ?? '未设置'}
              </p>
            </div>

            {!backendStatus?.configured && !statusLoading && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 ring-1 ring-amber-100">
                未配置后端 AI 时，会自动退回离线模板句，接收模式中的 AI 优化也会停用。
              </p>
            )}

            <div className="mt-3 space-y-2">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className={`w-full py-2.5 rounded-xl border text-base font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
                  ${testStatus === 'testing'
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : testStatus === 'ok'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : testStatus === 'error'
                    ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {testStatus === 'testing' && <LineIcon name="loader" className="h-4 w-4 animate-spin" />}
                {testStatus === 'ok' && <LineIcon name="check" className="h-4 w-4" />}
                {testStatus === 'error' && <LineIcon name="xmark" className="h-4 w-4" />}
                {testStatus === 'idle' && <LineIcon name="link" className="h-4 w-4" />}
                <span>
                  {testStatus === 'testing' ? '连接测试中…'
                    : testStatus === 'ok' ? '连接成功'
                    : testStatus === 'error' ? '连接失败'
                    : '测试后端 AI'}
                </span>
              </button>

              {testMessage && (
                <p className={`rounded-xl px-3 py-2 text-xs leading-5 ${
                  testStatus === 'ok'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  {testMessage}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-3">语音播报</h3>

            <label className="block mb-4">
              <span className="text-sm font-medium text-slate-700">语速：{rate.toFixed(1)}</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600"
              />
            </label>

            {canUseSpeechSynthesis && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">语音</span>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 min-h-[44px] focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="">自动选择最佳语音</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} {voice.localService ? '（本地）' : '（在线）'}
                    </option>
                  ))}
                </select>
                {availableVoices.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    暂未检测到可用语音，将自动使用系统默认语音
                  </p>
                )}
              </label>
            )}

            {canUseSpeechSynthesis && (
              <button
                onClick={handlePreviewTts}
                className={`mt-3 w-full py-2.5 rounded-xl border text-base font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                  previewing
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {previewing ? (
                  <>
                    <LineIcon name="sound" className="h-4 w-4 animate-pulse" />
                    <span>播放中，点击停止</span>
                  </>
                ) : (
                  <>
                    <LineIcon name="sound" className="h-4 w-4" />
                    <span>试听当前语音效果</span>
                  </>
                )}
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-3">显示</h3>

            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">图片大小</p>
              <div className="flex gap-2">
                {GRID_COLS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => settings.setGridCols(option.value)}
                    className={`flex-1 py-2.5 rounded-xl border text-center transition-colors min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
                      ${settings.gridCols === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                  >
                    <span className="block text-base">{option.label}</span>
                    <span className="block text-xs text-slate-400">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">字体大小</p>
              <div className="flex gap-2">
                {FONT_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => settings.setFontSize(option.value)}
                    className={`flex-1 py-2.5 rounded-xl border text-center transition-colors min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
                      ${settings.fontSize === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                  >
                    <span className="block text-base">{option.label}</span>
                    <span className="block text-xs text-slate-400">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <span className="text-base font-medium text-slate-700">高对比度模式</span>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => settings.setHighContrast(e.target.checked)}
                className="h-5 w-5 accent-blue-600"
              />
            </label>
          </section>

          {allCategories && allCategories.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-1">分类管理</h3>
              <p className="text-xs text-slate-500 mb-3">隐藏患者不常用的分类，保持界面简洁</p>
              <div className="space-y-1">
                {allCategories.map((category) => {
                  const isHidden = settings.hiddenCategoryIds.includes(category.id)
                  return (
                    <button
                      key={category.id}
                      onClick={() => settings.toggleCategoryVisibility(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors min-h-[48px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
                        ${isHidden
                          ? 'border-slate-200 bg-slate-50 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      aria-pressed={!isHidden}
                      title={isHidden ? '点击显示此分类' : '点击隐藏此分类'}
                    >
                      <span className="text-xl w-7 text-center shrink-0">{category.icon}</span>
                      <span className={`flex-1 text-base ${isHidden ? 'line-through text-slate-400' : ''}`}>
                        {category.name}
                      </span>
                      <span className="text-lg shrink-0" aria-hidden="true">
                        <LineIcon name={isHidden ? 'eyeOff' : 'eye'} className="h-5 w-5" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-3">关于</h3>
              <button
                onClick={() => {
                  localStorage.removeItem(ONBOARDING_STORAGE_KEY)
                  setShowSettings(false)
                  setShowOnboarding(true)
                }}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <LineIcon name="refresh" className="h-4 w-4" />
              重看使用引导
            </button>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <button
            onClick={handleSave}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <LineIcon name="save" className="h-5 w-5" />
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
