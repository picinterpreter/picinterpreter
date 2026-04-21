'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

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
