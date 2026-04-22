import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type FontSize, type GridCols } from '@/stores/settings-store'
import { ONBOARDING_STORAGE_KEY } from '@/components/Onboarding/OnboardingModal'
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
      <div className="flex-1 bg-black/40" onClick={() => setShowSettings(false)} />

      <div className="w-96 max-w-[90vw] bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-bold text-gray-800">⚙ 设置</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="text-base font-semibold text-gray-700 mb-3">AI 句子生成</h3>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <p className="text-sm text-gray-700">
                当前 AI 统一由 Next.js 后端调用，前端不再保存 API Key 或 Token。
              </p>
              <p className="text-xs text-gray-500">
                请在项目根目录创建 <code className="bg-white px-1 rounded">.env.local</code>，
                配置 <code className="bg-white px-1 rounded">AI_API_KEY</code>、
                <code className="bg-white px-1 rounded">AI_BASE_URL</code>、
                <code className="bg-white px-1 rounded">AI_MODEL</code>。
              </p>
              <p className="text-xs text-gray-500">
                可参考 <code className="bg-white px-1 rounded">.env.example</code>。
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 space-y-1 text-sm">
              <p className="font-medium text-gray-700">
                {statusLoading
                  ? '后端状态读取中…'
                  : backendStatus?.configured
                  ? '后端 AI 已配置'
                  : '后端 AI 未配置'}
              </p>
              <p className="text-xs text-gray-500">
                模型：{backendStatus?.model ?? '未设置'}
              </p>
              <p className="text-xs text-gray-500 break-all">
                地址：{backendStatus?.baseUrl ?? '未设置'}
              </p>
            </div>

            {!backendStatus?.configured && !statusLoading && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠ 未配置后端 AI 时，会自动退回离线模板句，接收模式中的 AI 优化也会停用。
              </p>
            )}

            <div className="mt-3 space-y-2">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className={`w-full py-2.5 rounded-xl border text-base font-medium transition-colors min-h-[44px] flex items-center justify-center gap-2
                  ${testStatus === 'testing'
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : testStatus === 'ok'
                    ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100'
                    : testStatus === 'error'
                    ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {testStatus === 'testing' && <span className="animate-spin text-base">⏳</span>}
                {testStatus === 'ok' && <span>✓</span>}
                {testStatus === 'error' && <span>✗</span>}
                {testStatus === 'idle' && <span>🔗</span>}
                <span>
                  {testStatus === 'testing' ? '连接测试中…'
                    : testStatus === 'ok' ? '连接成功'
                    : testStatus === 'error' ? '连接失败'
                    : '测试后端 AI'}
                </span>
              </button>

              {testMessage && (
                <p className={`text-xs px-2 py-1.5 rounded-lg ${
                  testStatus === 'ok'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {testMessage}
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-gray-700 mb-3">语音播报</h3>

            <label className="block mb-4">
              <span className="text-sm text-gray-600">语速：{rate.toFixed(1)}</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>

            {canUseSpeechSynthesis && (
              <label className="block">
                <span className="text-sm text-gray-600">语音</span>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border rounded-lg text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="">自动选择最佳语音</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} {voice.localService ? '（本地）' : '（在线）'}
                    </option>
                  ))}
                </select>
                {availableVoices.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    暂未检测到可用语音，将自动使用系统默认语音
                  </p>
                )}
              </label>
            )}

            {canUseSpeechSynthesis && (
              <button
                onClick={handlePreviewTts}
                className={`mt-3 w-full py-2.5 rounded-xl border text-base font-medium transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
                  previewing
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {previewing ? (
                  <>
                    <span className="animate-pulse">🔊</span>
                    <span>播放中，点击停止</span>
                  </>
                ) : (
                  <>
                    <span>🔊</span>
                    <span>试听当前语音效果</span>
                  </>
                )}
              </button>
            )}
          </section>

          <section>
            <h3 className="text-base font-semibold text-gray-700 mb-3">显示</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">图片大小</p>
              <div className="flex gap-2">
                {GRID_COLS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => settings.setGridCols(option.value)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-colors min-h-[48px]
                      ${settings.gridCols === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                      }`}
                  >
                    <span className="block text-base">{option.label}</span>
                    <span className="block text-xs text-gray-400">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">字体大小</p>
              <div className="flex gap-2">
                {FONT_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => settings.setFontSize(option.value)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-colors min-h-[48px]
                      ${settings.fontSize === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                      }`}
                  >
                    <span className="block text-base">{option.label}</span>
                    <span className="block text-xs text-gray-400">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => settings.setHighContrast(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-base">高对比度模式</span>
            </label>
          </section>

          {allCategories && allCategories.length > 0 && (
            <section>
              <h3 className="text-base font-semibold text-gray-700 mb-1">分类管理</h3>
              <p className="text-xs text-gray-400 mb-3">隐藏患者不常用的分类，保持界面简洁</p>
              <div className="space-y-1">
                {allCategories.map((category) => {
                  const isHidden = settings.hiddenCategoryIds.includes(category.id)
                  return (
                    <button
                      key={category.id}
                      onClick={() => settings.toggleCategoryVisibility(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors min-h-[48px] text-left
                        ${isHidden
                          ? 'border-gray-200 bg-gray-50 text-gray-400'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      aria-pressed={!isHidden}
                      title={isHidden ? '点击显示此分类' : '点击隐藏此分类'}
                    >
                      <span className="text-xl w-7 text-center shrink-0">{category.icon}</span>
                      <span className={`flex-1 text-base ${isHidden ? 'line-through text-gray-400' : ''}`}>
                        {category.name}
                      </span>
                      <span className="text-lg shrink-0" aria-hidden="true">
                        {isHidden ? '🙈' : '👁'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-base font-semibold text-gray-700 mb-3">关于</h3>
            <button
              onClick={() => {
                localStorage.removeItem(ONBOARDING_STORAGE_KEY)
                setShowSettings(false)
                setShowOnboarding(true)
              }}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            >
              📖 重看使用引导
            </button>
          </section>
        </div>

        <div className="p-4 border-t">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-lg font-medium hover:bg-blue-700 transition-colors min-h-[48px]"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
