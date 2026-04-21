/**
 * usePwaUpdate — 监听 Service Worker 更新，通知 UI 显示"新版本可用"横幅。
 *
 * 工作原理：
 *  1. 读取 navigator.serviceWorker.getRegistration()
 *  2. 监听 `updatefound` 事件 → 新 SW 开始安装
 *  3. 新 SW 的 `statechange` 进入 `installed` 且 controller 存在 → 有待激活的新版本
 *  4. 调用 `applyUpdate()` 时向新 SW 发送 SKIP_WAITING，然后强制刷新页面
 *
 * 注意：
 *  - 仅在生产环境（navigator.serviceWorker 存在）下有效；开发环境 isUpdateAvailable = false
 *  - 组件卸载时自动移除所有监听器，防止内存泄漏
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface PwaUpdateState {
  /** 是否有新版本等待激活 */
  isUpdateAvailable: boolean
  /** 激活新版本并刷新页面 */
  applyUpdate: () => void
  /** 忽略本次更新（横幅消失，直到下次 updatefound） */
  dismissUpdate: () => void
}

export function usePwaUpdate(): PwaUpdateState {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const newWorkerRef = useRef<ServiceWorker | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let cancelled = false
    // Keep a handle so cleanup can remove the listener
    let registrationRef: ServiceWorkerRegistration | null = null
    let updateFoundHandler: (() => void) | null = null

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (cancelled || !reg) return
      registrationRef = reg

      updateFoundHandler = () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorkerRef.current = newWorker
        const worker = newWorker   // narrow to non-null for the closure

        function onStateChange() {
          // `installed` with an active controller = update waiting to activate
          if (
            worker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            if (!cancelled) setIsUpdateAvailable(true)
          }
        }

        worker.addEventListener('statechange', onStateChange)
        // statechange listener is tied to the worker object lifetime; no
        // explicit removal needed because when the worker transitions to
        // `activated` it won't fire again and the reference is GC-eligible.
      }

      reg.addEventListener('updatefound', updateFoundHandler)

      // Also pick up a worker that is already waiting (e.g. user opened a second tab)
      if (reg.waiting && navigator.serviceWorker.controller) {
        newWorkerRef.current = reg.waiting
        if (!cancelled) setIsUpdateAvailable(true)
      }
    }).catch((err) => {
      console.warn('[usePwaUpdate] getRegistration failed:', err)
    })

    return () => {
      cancelled = true
      if (registrationRef && updateFoundHandler) {
        registrationRef.removeEventListener('updatefound', updateFoundHandler)
      }
    }
  }, [])

  const applyUpdate = useCallback(() => {
    // Guard: ensure reload is called at most once regardless of which path fires first
    let reloaded = false
    const doReload = () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    }

    const worker = newWorkerRef.current
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' })
    }

    // Wait for controllerchange — that's the real signal the new SW is in control
    navigator.serviceWorker.addEventListener('controllerchange', doReload, { once: true })

    // Fallback: some devices are slow to activate (cache deletion, large shell).
    // 3 s gives enough headroom while still feeling responsive.
    const t = setTimeout(doReload, 3000)

    // If controllerchange fires first, cancel the timer
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => clearTimeout(t),
      { once: true },
    )
  }, [])

  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false)
  }, [])

  return { isUpdateAvailable, applyUpdate, dismissUpdate }
}
