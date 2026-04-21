import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type FontSize, type GridCols } from '@/stores/settings-store'
import { NLG_PRESETS, detectPresetId, type NLGPreset } from '@/data/nlg-presets'
import { ONBOARDING_STORAGE_KEY } from '@/components/Onboarding/OnboardingModal'
import { db } from '@/db'

export function SettingsDrawer() {
  const showSettings = useAppStore((s) => s.showSettings)
  const setShowSettings = useAppStore((s) => s.setShowSettings)
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding)
  const settings = useSettingsStore()

  // ── 表单本地状态 ─────────────────────────────────────────────────────── //
  const [presetId, setPresetId] = useState(() =>
    detectPresetId(settings.nlgBaseUrl, settings.nlgModel),
  )
  const [baseUrl, setBaseUrl] = useState(settings.nlgBaseUrl)
  const [apiKey, setApiKey] = useState(settings.nlgApiKey)
  const [model, setModel] = useState(settings.nlgModel)
  const [rate, setRate] = useState(settings.ttsRate)
  const [voiceName, setVoiceName] = useState(settings.ttsVoiceName)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [previewing, setPreviewing] = useState(false)
  const previewUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  // Mirror of `previewing` as a ref so the close-effect can read the latest
  // value without re-running the effect on every previewing state change
  const previewingRef = useRef(false)

  // API 连接测试状态
  type TestStatus = 'idle' | 'testing' | 'ok' | 'error'
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState<string | null>(null)
  // AbortController ref: one active fetch at a time; also cancelled on unmount
  const testAbortRef = useRef<AbortController | null>(null)

  // 分类列表（用于分类可见性管理）
  const allCategories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())

  // 加载可用语音列表（异步，Chrome 在首次调用后才有数据）
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      const zhVoices = voices.filter((v) =>
        v.lang.toLowerCase().startsWith('zh') || v.lang.toLowerCase().startsWith('cmn')
      )
      setAvailableVoices(zhVoices.length > 0 ? zhVoices : voices.slice(0, 10))
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  // Keep previewingRef in sync with state (avoids adding `previewing` to the
  // close-effect deps, which would re-run the effect on every state flip)
  useEffect(() => { previewingRef.current = previewing }, [previewing])

  // Unmount cleanup: stop speech only if *this* settings panel started it
  useEffect(() => {
    return () => {
      if (previewingRef.current) {
        window.speechSynthesis?.cancel()
      }
    }
  }, [])

  // Unmount cleanup: abort any in-flight connection test
  useEffect(() => {
    return () => { testAbortRef.current?.abort() }
  }, [])

  // Escape closes drawer; closing stops *only this component's* preview
  useEffect(() => {
    if (!showSettings) {
      // Cancel only if our own preview is active — do not touch external TTS
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

  // ── 选项列表 ─────────────────────────────────────────────────────────── //
  const FONT_SIZE_OPTIONS: { value: FontSize; label: string; desc: string }[] = [
    { value: 'normal', label: '正常', desc: '16px' },
    { value: 'large',  label: '大',   desc: '18px' },
    { value: 'xlarge', label: '超大', desc: '20px' },
  ]

  const GRID_COLS_OPTIONS: { value: GridCols; label: string; desc: string }[] = [
    { value: 2, label: '大图', desc: '2列' },
    { value: 3, label: '默认', desc: '3列' },
    { value: 4, label: '紧凑', desc: '4列' },
  ]

  if (!showSettings) return null

  // ── TTS 试听 ─────────────────────────────────────────────────────────── //

  function handlePreviewTts() {
    if (!('speechSynthesis' in window)) return

    // If already previewing, stop it
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

    previewUtteranceRef.current = utterance
    window.speechSynthesis.cancel()   // cancel any ongoing speech first
    window.speechSynthesis.speak(utterance)
  }

  // ── API 连接测试 ─────────────────────────────────────────────────────── //

  /** Validate that baseUrl is a safe http(s) URL before we attach a Bearer token to the request. */
  function parseSafeBaseUrl(raw: string): URL | null {
    try {
      const u = new URL(raw)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
      // In production, only allow http for localhost to prevent credential exfiltration
      if (
        import.meta.env.PROD &&
        u.protocol === 'http:' &&
        u.hostname !== 'localhost' &&
        u.hostname !== '127.0.0.1'
      ) {
        return null
      }
      return u
    } catch {
      return null
    }
  }

  async function handleTestConnection() {
    if (testStatus === 'testing') return

    // Validate URL before sending any credentials
    const parsed = parseSafeBaseUrl(baseUrl)
    if (!parsed) {
      setTestStatus('error')
      setTestMessage('API 地址无效，请使用 https:// 开头的完整 URL')
      return
    }

    // Abort any previous in-flight request before starting a new one
    testAbortRef.current?.abort()
    const ctrl = new AbortController()
    testAbortRef.current = ctrl

    setTestStatus('testing')
    setTestMessage(null)

    // Build the URL safely from the validated parsed object
    const testUrl = new URL(
      parsed.pathname.replace(/\/?$/, '/') + 'chat/completions',
      parsed.origin,
    ).toString()

    // Manual 10s timeout via the same AbortController
    const timeoutId = setTimeout(() => ctrl.abort(new DOMException('Timeout', 'TimeoutError')), 10_000)

    try {
      const res = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        }),
        signal: ctrl.signal,
      })

      // Bail out if we were aborted/unmounted while awaiting the response
      if (ctrl.signal.aborted) return

      if (res.ok) {
        const data = await res.json() as { model?: string }
        if (ctrl.signal.aborted) return
        setTestStatus('ok')
        setTestMessage(`连接成功 · ${data.model ?? model}`)
      } else {
        const text = await res.text().catch(() => String(res.status))
        if (ctrl.signal.aborted) return
        // Extract just the first meaningful line of error text to keep it compact
        const firstLine = text.split('\n')[0].slice(0, 120)
        setTestStatus('error')
        setTestMessage(`${res.status} ${firstLine}`)
      }
    } catch (err: unknown) {
      // Ignore AbortError triggered by unmount or resetTestStatus — not an error the user needs to see
      if (ctrl.signal.aborted && !(err instanceof Error && err.name === 'TimeoutError')) return
      setTestStatus('error')
      if (err instanceof Error && err.name === 'TimeoutError') {
        setTestMessage('请求超时（10s）')
      } else if (err instanceof TypeError) {
        setTestMessage('网络错误，请检查地址是否可访问')
      } else {
        setTestMessage(String(err))
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // 任何 API 配置变动后重置测试状态，避免显示旧结果；同时中止进行中的请求
  function resetTestStatus() {
    testAbortRef.current?.abort()
    testAbortRef.current = null
    setTestStatus('idle')
    setTestMessage(null)
  }

  // ── 供应商预设点选 ────────────────────────────────────────────────────── //
  function handlePresetSelect(preset: NLGPreset) {
    resetTestStatus()
    setPresetId(preset.id)
    if (preset.baseUrl) setBaseUrl(preset.baseUrl)
    if (preset.model)   setModel(preset.model)
    // 本地代理不需要 Key，自动清空避免误填
    if (!preset.requiresKey) setApiKey('')
  }

  const selectedPreset = NLG_PRESETS.find((p) => p.id === presetId) ?? NLG_PRESETS[NLG_PRESETS.length - 1]
  const isCustom = presetId === 'custom'
  const isLocalProxy = presetId === 'local-proxy'

  // ── 保存 ─────────────────────────────────────────────────────────────── //
  function handleSave() {
    settings.setNlgConfig(baseUrl, apiKey, model)
    settings.setTtsRate(rate)
    settings.setTtsVoiceName(voiceName)
    setShowSettings(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={() => setShowSettings(false)} />

      {/* Drawer */}
      <div className="w-96 max-w-[90vw] bg-white shadow-xl flex flex-col">
        {/* Header */}
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

          {/* ── AI 句子生成 ──────────────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-semibold text-gray-700 mb-3">AI 句子生成</h3>

            {/* 供应商预设选择 */}
            <p className="text-sm text-gray-500 mb-2">选择服务商</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {NLG_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-center transition-all min-h-[60px]
                    ${presetId === preset.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                >
                  <span className="text-xl leading-none">{preset.icon}</span>
                  <span className="text-xs font-medium leading-tight">{preset.name}</span>
                </button>
              ))}
            </div>

            {/* 供应商说明 */}
            <p className="text-xs text-gray-500 mb-3 px-1">{selectedPreset.hint}</p>

            {/* 本地代理：成功提示 */}
            {isLocalProxy && (
              <div className="mb-3 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 space-y-1">
                <p className="font-medium">✓ 本地代理模式（推荐）</p>
                <p className="text-xs text-green-600">
                  1. 复制 <code className="bg-green-100 px-1 rounded">server/.env.example</code> →{' '}
                  <code className="bg-green-100 px-1 rounded">server/.env</code>，填入 Key
                </p>
                <p className="text-xs text-green-600">
                  2. 运行 <code className="bg-green-100 px-1 rounded">npm run dev:proxy</code>
                </p>
              </div>
            )}

            {/* API Key（代理模式隐藏） */}
            {!isLocalProxy && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">API Key</span>
                  {selectedPreset.keyUrl && (
                    <a
                      href={selectedPreset.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                      去申请 →
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); resetTestStatus() }}
                  placeholder="sk-…"
                  className="w-full px-3 py-2.5 border rounded-lg text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {!apiKey && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    ⚠ 未填 API Key，将使用离线模板句（质量较低）
                  </p>
                )}
              </div>
            )}

            {/* 自定义：展开 URL 和模型字段 */}
            {isCustom && (
              <>
                <label className="block mb-2">
                  <span className="text-sm text-gray-600">API 地址</span>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => { setBaseUrl(e.target.value); resetTestStatus() }}
                    placeholder="https://api.openai.com/v1"
                    className="mt-1 w-full px-3 py-2.5 border rounded-lg text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
                <label className="block mb-3">
                  <span className="text-sm text-gray-600">模型名称</span>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => { setModel(e.target.value); resetTestStatus() }}
                    placeholder="gpt-4o-mini"
                    className="mt-1 w-full px-3 py-2.5 border rounded-lg text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
              </>
            )}

            {/* 非自定义非代理：只读显示当前 URL 和模型 */}
            {!isCustom && !isLocalProxy && (
              <div className="mt-1 px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-400 space-y-0.5">
                <p>地址：{baseUrl}</p>
                <p>模型：{model}</p>
              </div>
            )}

            {/* 连接测试按钮（代理模式也可测试） */}
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
                {testStatus === 'testing' && (
                  <span className="animate-spin text-base">⏳</span>
                )}
                {testStatus === 'ok' && <span>✓</span>}
                {testStatus === 'error' && <span>✗</span>}
                {testStatus === 'idle' && <span>🔗</span>}
                <span>
                  {testStatus === 'testing' ? '连接测试中…'
                    : testStatus === 'ok' ? '连接成功'
                    : testStatus === 'error' ? '连接失败'
                    : '测试连接'}
                </span>
              </button>

              {/* 测试结果详情 */}
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

          {/* ── 语音播报 ─────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-semibold text-gray-700 mb-3">语音播报</h3>

            {/* 语速 */}
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

            {/* 语音选择 */}
            {'speechSynthesis' in window && (
              <label className="block">
                <span className="text-sm text-gray-600">语音</span>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border rounded-lg text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="">自动选择最佳语音</option>
                  {availableVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} {v.localService ? '（本地）' : '（在线）'}
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

            {/* 试听按钮 */}
            {'speechSynthesis' in window && (
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

          {/* ── 显示 ─────────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-semibold text-gray-700 mb-3">显示</h3>

            {/* 图片大小 */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">图片大小</p>
              <div className="flex gap-2">
                {GRID_COLS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => settings.setGridCols(opt.value)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-colors min-h-[48px]
                      ${settings.gridCols === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                      }`}
                  >
                    <span className="block text-base">{opt.label}</span>
                    <span className="block text-xs text-gray-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 字体大小 */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">字体大小</p>
              <div className="flex gap-2">
                {FONT_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => settings.setFontSize(opt.value)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-colors min-h-[48px]
                      ${settings.fontSize === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                      }`}
                  >
                    <span className="block text-base">{opt.label}</span>
                    <span className="block text-xs text-gray-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 高对比度 */}
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

          {/* ── 分类管理 ─────────────────────────────────────────────────── */}
          {allCategories && allCategories.length > 0 && (
            <section>
              <h3 className="text-base font-semibold text-gray-700 mb-1">分类管理</h3>
              <p className="text-xs text-gray-400 mb-3">隐藏患者不常用的分类，保持界面简洁</p>
              <div className="space-y-1">
                {allCategories.map((cat) => {
                  const isHidden = settings.hiddenCategoryIds.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => settings.toggleCategoryVisibility(cat.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors min-h-[48px] text-left
                        ${isHidden
                          ? 'border-gray-200 bg-gray-50 text-gray-400'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      aria-pressed={!isHidden}
                      title={isHidden ? '点击显示此分类' : '点击隐藏此分类'}
                    >
                      <span className="text-xl w-7 text-center shrink-0">{cat.icon}</span>
                      <span className={`flex-1 text-base ${isHidden ? 'line-through text-gray-400' : ''}`}>
                        {cat.name}
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

          {/* ── 关于 ─────────────────────────────────────────────────────── */}
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

        {/* Footer */}
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
