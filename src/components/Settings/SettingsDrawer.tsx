import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore, type FontSize, type GridCols } from '@/stores/settings-store'
import { AuthSettingsSection } from '@/components/Settings/AuthSettingsSection'
import { ONBOARDING_STORAGE_KEY } from '@/components/Onboarding/OnboardingModal'
import { LineIcon } from '@/components/ui/LineIcon'
import { CategoryIcon } from '@/components/CategoryIcon/CategoryIcon'
import { db, forceReseed } from '@/db'
import { movePictogramManualOrder, sortPictogramsForDisplay } from '@/utils/pictogram-order'
import { shouldUseServerTts } from '@/utils/tts-environment'

interface AIBackendStatus {
  configured: boolean
  model: string | null
  baseUrl: string | null
  ttsConfigured?: boolean
  ttsModel?: string | null
}

const SERVER_TTS_MODEL = 'FunAudioLLM/CosyVoice2-0.5B'
const SERVER_TTS_VOICE_OPTIONS = [
  { id: 'anna', label: 'Anna', desc: '稳重女声' },
  { id: 'bella', label: 'Bella', desc: '热情女声' },
  { id: 'claire', label: 'Claire', desc: '温柔女声' },
  { id: 'diana', label: 'Diana', desc: '活泼女声' },
  { id: 'alex', label: 'Alex', desc: '稳重男声' },
  { id: 'benjamin', label: 'Benjamin', desc: '低沉男声' },
  { id: 'charles', label: 'Charles', desc: '磁性男声' },
  { id: 'david', label: 'David', desc: '活泼男声' },
] as const

function getServerPresetVoiceName(id: string) {
  return `${SERVER_TTS_MODEL}:${id}`
}

type SettingsSurfaceVariant = 'drawer' | 'page'

function SettingsSurface({ variant }: { variant: SettingsSurfaceVariant }) {
  const showSettingsFromStore = useAppStore((s) => s.showSettings)
  const setShowSettings = useAppStore((s) => s.setShowSettings)
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding)
  const activeCategoryId = useAppStore((s) => s.activeCategoryId)
  const settings = useSettingsStore()
  const isPage = variant === 'page'
  const showSettings = isPage || showSettingsFromStore

  const [rate, setRate] = useState(settings.ttsRate)
  const [voiceName, setVoiceName] = useState(settings.ttsVoiceName)
  const [serverVoiceName, setServerVoiceName] = useState(settings.ttsServerVoiceName)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [serverPreviewing, setServerPreviewing] = useState(false)
  const [serverPreviewVoiceName, setServerPreviewVoiceName] = useState('')
  const [useCloudVoiceInCurrentBrowser, setUseCloudVoiceInCurrentBrowser] = useState(false)
  const serverPreviewAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewingRef = useRef(false)
  const serverPreviewingRef = useRef(false)
  const canUseSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window

  type TestStatus = 'idle' | 'testing' | 'ok' | 'error'
  const [backendStatus, setBackendStatus] = useState<AIBackendStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const testAbortRef = useRef<AbortController | null>(null)
  const [orderingCategoryId, setOrderingCategoryId] = useState('')
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  // 过滤 hidden 板（如 home），它们由 seed 直接管理，不在用户设置面板里显示
  const allCategories = useLiveQuery(async () => {
    const all = await db.categories.orderBy('sortOrder').toArray()
    return all.filter((c) => !c.hidden)
  })
  const orderingPictograms = useLiveQuery(async () => {
    if (!orderingCategoryId) return []
    const items = await db.pictograms.where('categoryIds').equals(orderingCategoryId).toArray()
    return sortPictogramsForDisplay(items, 'manual')
  }, [orderingCategoryId])

  useEffect(() => {
    if (!allCategories || allCategories.length === 0) return
    if (orderingCategoryId && allCategories.some((category) => category.id === orderingCategoryId)) return

    const fallbackId = activeCategoryId !== 'root' && activeCategoryId !== 'recent'
      ? activeCategoryId
      : allCategories[0]?.id

    if (fallbackId) setOrderingCategoryId(fallbackId)
  }, [activeCategoryId, allCategories, orderingCategoryId])

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
  useEffect(() => { serverPreviewingRef.current = serverPreviewing }, [serverPreviewing])

  useEffect(() => {
    return () => {
      if (previewingRef.current) {
        window.speechSynthesis?.cancel()
      }
      serverPreviewAudioRef.current?.pause()
      serverPreviewAudioRef.current = null
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
      if (serverPreviewingRef.current) {
        serverPreviewAudioRef.current?.pause()
        serverPreviewAudioRef.current = null
        setServerPreviewing(false)
        setServerPreviewVoiceName('')
        serverPreviewingRef.current = false
      }
      return
    }
    setUseCloudVoiceInCurrentBrowser(shouldUseServerTts())
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

  function handlePreviewServerTts(voiceOverride?: string) {
    const voice = voiceOverride ?? serverVoiceName.trim()

    if (serverPreviewing) {
      const wasSameVoice = serverPreviewVoiceName === voice
      serverPreviewAudioRef.current?.pause()
      serverPreviewAudioRef.current = null
      setServerPreviewing(false)
      setServerPreviewVoiceName('')
      if (wasSameVoice) return
    }

    const params = new URLSearchParams()
    params.set('text', '你好，这是图语家的云端语音播报效果测试。')
    params.set('rate', String(rate))
    if (voice) params.set('voice', voice)

    const audio = new Audio(`/api/ai/tts?${params.toString()}`)
    serverPreviewAudioRef.current = audio
    setServerPreviewing(true)
    setServerPreviewVoiceName(voice)

    const finish = () => {
      if (serverPreviewAudioRef.current === audio) {
        serverPreviewAudioRef.current = null
      }
      setServerPreviewing(false)
      setServerPreviewVoiceName('')
    }

    audio.onended = finish
    audio.onerror = finish
    audio.play().catch(finish)
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

  async function handleMovePictogram(id: string, direction: 'up' | 'down') {
    if (!orderingPictograms || orderingPictograms.length === 0) return

    const reordered = movePictogramManualOrder(orderingPictograms, id, direction)
    setReorderingId(id)

    try {
      await db.transaction('rw', db.pictograms, async () => {
        for (const pictogram of reordered) {
          await db.pictograms.update(pictogram.id, { manualOrder: pictogram.manualOrder })
        }
      })
    } finally {
      setReorderingId(null)
    }
  }

  function handleSave() {
    settings.setTtsRate(rate)
    settings.setTtsVoiceName(voiceName)
    settings.setTtsServerVoiceName(serverVoiceName.trim())
    if (!isPage) setShowSettings(false)
  }

  return (
    <div className={isPage ? 'min-h-dvh bg-slate-50 text-slate-950' : 'fixed inset-0 z-40 flex'}>
      {!isPage && (
        <div className="flex-1 bg-slate-950/45 backdrop-blur-[1px]" onClick={() => setShowSettings(false)} />
      )}

      <div className={isPage ? 'mx-auto flex min-h-dvh w-full max-w-5xl flex-col bg-slate-50' : 'flex w-[28rem] max-w-[92vw] flex-col border-r border-slate-200 bg-slate-50'}>
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {isPage && (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <LineIcon name="user" className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-900">
                  {isPage ? '个人主页' : '设置'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">账号、语音和显示偏好</p>
              </div>
            </div>
            {isPage ? (
              <a
                href="/"
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="返回首页"
              >
                <LineIcon name="arrowLeft" className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">首页</span>
              </a>
            ) : (
              <button
                onClick={() => setShowSettings(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="关闭"
              >
                <LineIcon name="close" className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className={isPage ? 'grid flex-1 gap-5 p-4 sm:grid-cols-2 lg:p-6' : 'flex-1 overflow-y-auto p-4 space-y-5'}>
          <AuthSettingsSection />

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-800">AI 生成</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">检测后端模型配置，失败时仍可使用离线模板。</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                statusLoading
                  ? 'border border-slate-200 bg-slate-100 text-slate-500'
                  : backendStatus?.configured
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-amber-200 bg-amber-50 text-amber-700'
              }`}>
                {statusLoading ? '检测中' : backendStatus?.configured ? '已配置' : '未配置'}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
              <p className="text-xs font-medium uppercase text-slate-400">当前后端</p>
              <p className="text-sm text-slate-600">
                模型：{backendStatus?.model ?? '未设置'}
              </p>
              <p className="text-sm text-slate-600">
                语音：{backendStatus?.ttsConfigured ? backendStatus.ttsModel ?? '已配置' : '未设置'}
              </p>
              <p className="break-all text-sm text-slate-600">
                地址：{backendStatus?.baseUrl ?? '未设置'}
              </p>
            </div>

            {!backendStatus?.configured && !statusLoading && (
              <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
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
                {testStatus === 'testing' && <LineIcon name="loader" className="h-4 w-4 shrink-0 animate-spin" />}
                {testStatus === 'ok' && <LineIcon name="check" className="h-4 w-4 shrink-0" />}
                {testStatus === 'error' && <LineIcon name="xmark" className="h-4 w-4 shrink-0" />}
                {testStatus === 'idle' && <LineIcon name="link" className="h-4 w-4 shrink-0" />}
                <span className="truncate">
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

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-semibold text-slate-800 mb-3">语音播报</h3>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              <span className="font-medium text-slate-700">当前环境：</span>
              {useCloudVoiceInCurrentBrowser
                ? '微信内播放，正式播报会使用下方云端音色。'
                : '普通浏览器播放，正式播报会优先使用系统语音；云端音色只在微信内生效。'}
            </div>

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
                <span className="text-sm font-medium text-slate-700">系统语音（普通浏览器）</span>
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
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Safari、Chrome 等普通浏览器使用这里的语音。微信内无法稳定直接播报时，会改用下方云端音色。
                </p>
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
                    <LineIcon name="sound" className="h-4 w-4 shrink-0 animate-pulse" />
                    <span className="truncate">播放中，点击停止</span>
                  </>
                ) : (
                  <>
                    <LineIcon name="sound" className="h-4 w-4 shrink-0" />
                    <span className="truncate">试听系统语音</span>
                  </>
                )}
              </button>
            )}

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">云端音色（微信内生效）</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  {serverVoiceName.trim() ? '已选择' : '后端默认'}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {useCloudVoiceInCurrentBrowser
                  ? '当前微信环境会使用这组后端语音；上方系统语音设置主要用于普通浏览器。'
                  : '这组音色只影响微信内的后端语音。当前普通浏览器试听可以听效果，但正式播报仍按上方系统语音设置。'}
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { id: 'default', label: '默认', desc: '后端配置', voiceName: '' },
                  ...SERVER_TTS_VOICE_OPTIONS.map((voice) => ({
                    ...voice,
                    voiceName: getServerPresetVoiceName(voice.id),
                  })),
                ].map((voice) => {
                  const isSelected = serverVoiceName.trim() === voice.voiceName
                  const isPlaying = serverPreviewing && serverPreviewVoiceName === voice.voiceName

                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => {
                        setServerVoiceName(voice.voiceName)
                        handlePreviewServerTts(voice.voiceName)
                      }}
                      aria-pressed={isSelected}
                      className={`flex min-h-[56px] items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <LineIcon
                        name={isPlaying ? 'sound' : 'play'}
                        className={`h-4 w-4 shrink-0 ${isPlaying ? 'animate-pulse' : ''}`}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{voice.label}</span>
                        <span className="block truncate text-xs text-slate-500">{voice.desc}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="mt-3 block">
              <span className="text-sm font-medium text-slate-700">自定义音色 ID</span>
              <input
                type="text"
                value={serverVoiceName}
                onChange={(e) => setServerVoiceName(e.target.value)}
                placeholder="留空使用后端默认音色"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 min-h-[44px] focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
              />
              <p className="mt-1 text-xs leading-5 text-slate-500">
                微信内使用后端生成语音。需要服务商自定义音色时，可直接填写完整音色 ID。
              </p>
            </label>

            <button
              onClick={() => handlePreviewServerTts()}
              className={`mt-3 w-full py-2.5 rounded-xl border text-base font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                serverPreviewing
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {serverPreviewing ? (
                <>
                  <LineIcon name="sound" className="h-4 w-4 shrink-0 animate-pulse" />
                  <span className="truncate">播放中，点击停止</span>
                </>
              ) : (
                <>
                  <LineIcon name="sound" className="h-4 w-4 shrink-0" />
                  <span className="truncate">试听云端音色</span>
                </>
              )}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
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
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                  >
                    <span className="block text-base">{option.label}</span>
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
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                  >
                    <span className="block text-base">{option.label}</span>
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

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-semibold text-slate-800 mb-1">卡片顺序</h3>
            <p className="text-xs text-slate-500 mb-3">默认使用固定顺序，患者更容易形成稳定记忆；需要时可以切到常用优先。</p>

            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">排序方式</p>
              <div className="flex gap-2">
                {[
                  { value: 'manual', label: '固定顺序' },
                  { value: 'popularity', label: '常用优先' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => settings.setPictogramSortMode(option.value as 'manual' | 'popularity')}
                    className={`flex-1 py-2.5 rounded-xl border text-center transition-colors min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
                      ${settings.pictogramSortMode === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                  >
                    <span className="block text-base">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">调整哪个板块</label>
                <select
                  value={orderingCategoryId}
                  onChange={(e) => setOrderingCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 min-h-[44px] focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                >
                  {(allCategories ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {settings.pictogramSortMode !== 'manual' && (
                <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                  现在显示的是“常用优先”。切回“固定顺序”后，会恢复你在下面排好的手动顺序。
                </p>
              )}

              {orderingPictograms && orderingPictograms.length > 0 && (
                <div className="space-y-2">
                  {orderingPictograms.map((pictogram, index) => (
                    <div
                      key={pictogram.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <img
                        src={pictogram.imageUrl}
                        alt={pictogram.labels.zh[0]}
                        className="h-10 w-10 rounded-lg object-contain bg-white"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{pictogram.labels.zh[0]}</p>
                        <p className="text-xs text-slate-400">第 {index + 1} 位</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMovePictogram(pictogram.id, 'up')}
                          disabled={index === 0 || reorderingId === pictogram.id}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`上移 ${pictogram.labels.zh[0]}`}
                        >
                          <LineIcon name="arrowUp" className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMovePictogram(pictogram.id, 'down')}
                          disabled={index === orderingPictograms.length - 1 || reorderingId === pictogram.id}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`下移 ${pictogram.labels.zh[0]}`}
                        >
                          <LineIcon name="arrowDown" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {allCategories && allCategories.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
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
                      <CategoryIcon
                        category={category}
                        className="h-8 w-8 w-7 shrink-0 rounded-xl object-contain"
                        textClassName="text-xl w-7 text-center shrink-0"
                      />
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

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-semibold text-slate-800 mb-3">关于</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  localStorage.removeItem(ONBOARDING_STORAGE_KEY)
                  setShowSettings(false)
                  setShowOnboarding(true)
                }}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <LineIcon name="refresh" className="h-4 w-4 shrink-0" />
                <span className="truncate">重看使用引导</span>
              </button>
              <ReseedButton />
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <button
            onClick={handleSave}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-lg font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <LineIcon name="save" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">保存设置</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function SettingsDrawer() {
  return <SettingsSurface variant="drawer" />
}

export function ProfileSettingsPage() {
  return <SettingsSurface variant="page" />
}

function ReseedButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleClick() {
    if (state === 'loading') return
    setState('loading')
    try {
      await forceReseed()
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label =
    state === 'loading' ? '重新加载中…' :
    state === 'done'    ? '词库已重置 ✓' :
    state === 'error'   ? '加载失败，请重试' :
    '重置默认词库'

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
    >
      <LineIcon name={state === 'done' ? 'check' : 'refresh'} className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}
