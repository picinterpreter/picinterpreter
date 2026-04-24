'use client'

import { useEffect, useState } from 'react'
import { hasLocalCloudData } from '@/services/sync-service'
import { useAuthStore } from '@/stores/auth-store'
import type { LocalDataAction } from '@/types'

type BusyAction = 'register' | 'login' | 'logout' | null
type AuthMode = 'login' | 'register'

function maskPasswordVisibleLabel(visible: boolean) {
  return visible ? '隐藏密码' : '显示密码'
}

export function AuthSettingsSection() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const initialize = useAuthStore((state) => state.initialize)
  const register = useAuthStore((state) => state.register)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  const [localDataAction, setLocalDataAction] = useState<LocalDataAction>('merge')
  const [hasLocalData, setHasLocalData] = useState(false)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<AuthMode>('login')
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')

  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    void hasLocalCloudData().then(setHasLocalData)
  }, [status])

  const showLocalDataChoice = status === 'anonymous' && hasLocalData
  const isBusy = busyAction != null

  const trimmedRegisterUsername = registerUsername.trim()
  const trimmedRegisterPhone = registerPhone.trim()
  const trimmedLoginUsername = loginUsername.trim()
  const registerUsernameError = trimmedRegisterUsername && !/^\w{3,20}$/.test(trimmedRegisterUsername)
    ? '用户名需为 3-20 位字母、数字或下划线'
    : null
  const registerPasswordError = registerPassword && registerPassword.length < 8
    ? '密码至少 8 位'
    : null
  const registerPhoneError = trimmedRegisterPhone && !/^\d{11}$/.test(trimmedRegisterPhone)
    ? '请输入 11 位手机号'
    : null
  const canRegister =
    trimmedRegisterUsername.length > 0 &&
    registerPassword.length >= 8 &&
    /^\d{11}$/.test(trimmedRegisterPhone) &&
    !isBusy
  const canLogin = trimmedLoginUsername.length > 0 && loginPassword.length > 0 && !isBusy

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canRegister) return
    setBusyAction('register')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await register({
        username: registerUsername,
        password: registerPassword,
        phone: registerPhone,
        localDataAction: showLocalDataChoice ? localDataAction : 'merge',
      })
      setRegisterUsername('')
      setRegisterPassword('')
      setRegisterPhone('')
      setSuccessMessage('注册成功，已自动登录。')
      setHasLocalData(await hasLocalCloudData())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '注册失败')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canLogin) return
    setBusyAction('login')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await login({
        username: loginUsername,
        password: loginPassword,
        localDataAction: showLocalDataChoice ? localDataAction : 'merge',
      })
      setLoginUsername('')
      setLoginPassword('')
      setSuccessMessage('登录成功。')
      setHasLocalData(await hasLocalCloudData())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleLogout() {
    setBusyAction('logout')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await logout()
      setSuccessMessage('已退出登录，本机数据已切回匿名模式。')
      setHasLocalData(await hasLocalCloudData())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '退出登录失败')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">账号与同步</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            登录后可把表达记录和常用语同步到云端。
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
          status === 'authenticated'
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : status === 'loading'
            ? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        }`}>
          {status === 'authenticated' ? '已登录' : status === 'loading' ? '读取中' : '匿名模式'}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
          <div className="mt-3 h-3 w-52 rounded bg-slate-200 animate-pulse" />
        </div>
      ) : status === 'authenticated' && user ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900">当前账号</p>
                <p className="truncate text-base font-medium text-emerald-800">{user.username}</p>
                <p className="text-sm text-emerald-700">{user.phoneMasked}</p>
              </div>
            </div>
          </div>

          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-500">
            退出登录后会保留本机表达记录和收藏，但会与当前账号脱钩，后续按匿名身份继续使用。
          </p>

          <button
            onClick={handleLogout}
            disabled={isBusy}
            className="w-full rounded-xl border border-rose-200 bg-white py-3 text-base font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          >
            {busyAction === 'logout' ? '退出中…' : '退出登录'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-5 text-slate-600">
            当前以匿名模式使用。注册或登录后，这台设备的数据可以并入账号并同步到云端。
          </div>

          {showLocalDataChoice && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">检测到本机已有表达记录或收藏</p>
                <p className="mt-1 text-xs leading-5 text-amber-700">选择登录/注册后如何处理这台设备上的本地数据。</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLocalDataAction('merge')}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                    localDataAction === 'merge'
                      ? 'border-blue-500 bg-white text-blue-700 shadow-sm'
                      : 'border-amber-200 bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  并入当前账号
                </button>
                <button
                  type="button"
                  onClick={() => setLocalDataAction('discard')}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                    localDataAction === 'discard'
                      ? 'border-rose-400 bg-white text-rose-600 shadow-sm'
                      : 'border-amber-200 bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  放弃本机数据
                </button>
              </div>
              <p className="text-xs leading-5 text-amber-700">
                {localDataAction === 'merge'
                  ? '会先尝试把当前匿名数据同步到服务端，再并入目标账号。'
                  : '会先清空本机表达记录、收藏和待同步队列，再继续注册或登录。'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="账号操作">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              注册
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" noValidate>
              <div>
                <label htmlFor="login-username" className="text-sm font-medium text-slate-700">用户名</label>
                <input
                  id="login-username"
                  value={loginUsername}
                  onChange={(event) => setLoginUsername(event.target.value)}
                  placeholder="输入用户名"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="text-sm font-medium text-slate-700">密码</label>
                <div className="mt-1 flex rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    id="login-password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="输入密码"
                    className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 py-3 text-base text-slate-900 outline-none"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((value) => !value)}
                    className="shrink-0 px-3 text-sm font-medium text-slate-500 hover:text-slate-800 min-h-[44px]"
                    aria-label={maskPasswordVisibleLabel(showLoginPassword)}
                  >
                    {showLoginPassword ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={!canLogin}
                className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {busyAction === 'login' ? '登录中…' : '登录并同步'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" noValidate>
              <div>
                <label htmlFor="register-username" className="text-sm font-medium text-slate-700">用户名</label>
                <input
                  id="register-username"
                  value={registerUsername}
                  onChange={(event) => setRegisterUsername(event.target.value)}
                  placeholder="3-20 位字母、数字或下划线"
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-3 text-base text-slate-900 outline-none transition focus:ring-4 ${
                    registerUsernameError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                  autoComplete="username"
                  aria-invalid={registerUsernameError ? true : undefined}
                  aria-describedby={registerUsernameError ? 'register-username-error' : 'register-username-help'}
                />
                <p id="register-username-help" className="mt-1 text-xs text-slate-500">之后可用它登录图语家。</p>
                {registerUsernameError && <p id="register-username-error" className="mt-1 text-xs text-rose-600">{registerUsernameError}</p>}
              </div>
              <div>
                <label htmlFor="register-password" className="text-sm font-medium text-slate-700">密码</label>
                <div className={`mt-1 flex rounded-xl border bg-white focus-within:ring-4 ${
                  registerPasswordError
                    ? 'border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-100'
                    : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-100'
                }`}>
                  <input
                    id="register-password"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    type={showRegisterPassword ? 'text' : 'password'}
                    placeholder="至少 8 位"
                    className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 py-3 text-base text-slate-900 outline-none"
                    autoComplete="new-password"
                    aria-invalid={registerPasswordError ? true : undefined}
                    aria-describedby={registerPasswordError ? 'register-password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((value) => !value)}
                    className="shrink-0 px-3 text-sm font-medium text-slate-500 hover:text-slate-800 min-h-[44px]"
                    aria-label={maskPasswordVisibleLabel(showRegisterPassword)}
                  >
                    {showRegisterPassword ? '隐藏' : '显示'}
                  </button>
                </div>
                {registerPasswordError && <p id="register-password-error" className="mt-1 text-xs text-rose-600">{registerPasswordError}</p>}
              </div>
              <div>
                <label htmlFor="register-phone" className="text-sm font-medium text-slate-700">手机号</label>
                <input
                  id="register-phone"
                  value={registerPhone}
                  onChange={(event) => setRegisterPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  inputMode="numeric"
                  placeholder="11 位手机号"
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-3 text-base text-slate-900 outline-none transition focus:ring-4 ${
                    registerPhoneError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                  autoComplete="tel"
                  aria-invalid={registerPhoneError ? true : undefined}
                  aria-describedby={registerPhoneError ? 'register-phone-error' : undefined}
                />
                {registerPhoneError && <p id="register-phone-error" className="mt-1 text-xs text-rose-600">{registerPhoneError}</p>}
              </div>
              <button
                type="submit"
                disabled={!canRegister}
                className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {busyAction === 'register' ? '注册中…' : '注册并登录'}
              </button>
            </form>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {successMessage}
        </p>
      )}
    </section>
  )
}
