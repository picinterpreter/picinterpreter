'use client'

import App from '@/App'
import { SeedDataGate } from '@/components/SeedDataGate/SeedDataGate'
import { SyncBootstrapGate } from '@/components/SyncBootstrap/SyncBootstrapGate'

export function MainPageClient() {
  return (
    <SeedDataGate>
      <SyncBootstrapGate>
        <App />
      </SyncBootstrapGate>
    </SeedDataGate>
  )
}
