import { useCallback, useEffect, useState } from 'react'
import { ensureSeedData } from '@/db'

export interface SeedDataReadyState {
  ready: boolean
  error: string | null
  retry: () => void
}

export function useSeedDataReady(): SeedDataReadyState {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError(null)

    ensureSeedData()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err) => {
        if (!cancelled) setError(String(err))
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setAttempt((value) => value + 1)
  }, [])

  return { ready, error, retry }
}
