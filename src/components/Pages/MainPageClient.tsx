'use client'

import App from '@/App'
import { SeedDataGate } from '@/components/SeedDataGate/SeedDataGate'

export function MainPageClient() {
  return (
    <SeedDataGate>
      <App />
    </SeedDataGate>
  )
}
