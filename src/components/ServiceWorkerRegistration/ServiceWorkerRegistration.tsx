'use client'

import { useEffect } from 'react'
import {
  SERVICE_WORKER_CACHE_PREFIX,
  SERVICE_WORKER_DISABLE_REFRESH_KEY,
  SERVICE_WORKER_ENABLED,
} from '@/utils/service-worker'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    if (!SERVICE_WORKER_ENABLED) {
      let cancelled = false

      const disableServiceWorker = async () => {
        const hasController = Boolean(navigator.serviceWorker.controller)

        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((registration) => registration.unregister()))
        } catch (err) {
          console.warn('[SW] 反注册失败:', err)
        }

        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys()
            await Promise.all(
              cacheKeys
                .filter((key) => key.startsWith(SERVICE_WORKER_CACHE_PREFIX))
                .map((key) => caches.delete(key)),
            )
          } catch (err) {
            console.warn('[SW] 清理缓存失败:', err)
          }
        }

        if (
          !cancelled &&
          hasController &&
          sessionStorage.getItem(SERVICE_WORKER_DISABLE_REFRESH_KEY) !== 'done'
        ) {
          sessionStorage.setItem(SERVICE_WORKER_DISABLE_REFRESH_KEY, 'done')
          window.location.reload()
        }
      }

      void disableServiceWorker()
      return () => {
        cancelled = true
      }
    }

    const buildId = (window as Window & {
      __NEXT_DATA__?: { buildId?: string }
    }).__NEXT_DATA__?.buildId ?? 'prod'
    const swUrl = `/sw.js?v=${encodeURIComponent(buildId)}`

    const register = () => {
      navigator.serviceWorker.register(swUrl).catch((err) => {
        console.warn('[SW] 注册失败:', err)
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
