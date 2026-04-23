'use client'

import { useEffect } from 'react'
import App from '@/App'
import { SeedDataGate } from '@/components/SeedDataGate/SeedDataGate'
import { SyncBootstrapGate } from '@/components/SyncBootstrap/SyncBootstrapGate'
import { useAuthStore } from '@/stores/auth-store'

export function MainPageClient() {
  const initializeAuth = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  return (
    <SeedDataGate>
      <SyncBootstrapGate>
        <App />
      </SyncBootstrapGate>
    </SeedDataGate>
  )
}
