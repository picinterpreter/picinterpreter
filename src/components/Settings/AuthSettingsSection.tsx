'use client'

import { useEffect, useState } from 'react'
import { hasLocalCloudData } from '@/services/sync-service'
import { useAuthStore } from '@/stores/auth-store'
import type { LocalDataAction } from '@/types'

type BusyAction = 'register' | 'login' | 'logout' | null

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

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    <section>
      <h3 className="text-base font-semibold text-gray-700 mb-3">账号</h3>

      {status === 'loading' ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
          正在读取账号状态…
        </div>
      ) : status === 'authenticated' && user ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-3">
            <p className="text-sm font-medium text-green-800">当前已登录</p>
            <p className="mt-1 text-sm text-green-700">用户名：{user.username}</p>
            <p className="text-sm text-green-700">手机号：{user.phoneMasked}</p>
          </div>

          <p className="text-xs text-gray-500">
            退出登录后会保留本机表达记录和收藏，但会与当前账号脱钩，后续按匿名身份继续使用。
          </p>

          <button
            onClick={handleLogout}
            disabled={busyAction != null}
            className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-base font-medium hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busyAction === 'logout' ? '退出中…' : '退出登录'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            当前以匿名模式使用。注册或登录后，这台设备的数据可以并入账号同步到云端。
          </div>

          {showLocalDataChoice && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">检测到本机已有表达记录或收藏</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLocalDataAction('merge')}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    localDataAction === 'merge'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-amber-200 bg-white text-gray-600'
                  }`}
                >
                  并入当前账号
                </button>
                <button
                  type="button"
                  onClick={() => setLocalDataAction('discard')}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    localDataAction === 'discard'
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : 'border-amber-200 bg-white text-gray-600'
                  }`}
                >
                  放弃本机数据
                </button>
              </div>
              <p className="text-xs text-amber-700">
                {localDataAction === 'merge'
                  ? '会先尝试把当前匿名数据同步到服务端，再并入目标账号。'
                  : '会先清空本机表达记录、收藏和待同步队列，再继续注册或登录。'}
              </p>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-sm font-medium text-gray-700">注册新账号</p>
            <input
              value={registerUsername}
              onChange={(event) => setRegisterUsername(event.target.value)}
              placeholder="用户名（3-20 位字母/数字/下划线）"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              autoComplete="username"
            />
            <input
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              type="password"
              placeholder="密码（至少 8 位）"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              autoComplete="new-password"
            />
            <input
              value={registerPhone}
              onChange={(event) => setRegisterPhone(event.target.value)}
              inputMode="numeric"
              placeholder="手机号（11 位）"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              autoComplete="tel"
            />
            <button
              type="submit"
              disabled={busyAction != null}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busyAction === 'register' ? '注册中…' : '注册并登录'}
            </button>
          </form>

          <form onSubmit={handleLoginSubmit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-sm font-medium text-gray-700">登录已有账号</p>
            <input
              value={loginUsername}
              onChange={(event) => setLoginUsername(event.target.value)}
              placeholder="用户名"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              autoComplete="username"
            />
            <input
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              type="password"
              placeholder="密码"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={busyAction != null}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busyAction === 'login' ? '登录中…' : '登录'}
            </button>
          </form>
        </div>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          {successMessage}
        </p>
      )}
    </section>
  )
}
