'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { syncService } from '@/services/sync-service'

interface SyncBootstrapGateProps {
  children: ReactNode
}

export function SyncBootstrapGate({ children }: SyncBootstrapGateProps) {
  useEffect(() => {
    syncService.start()
    return () => syncService.stop()
  }, [])

  return <>{children}</>
}
