'use client'

import { MatcherDemoPage } from '@/components/MatcherDemo/MatcherDemoPage'
import { SeedDataGate } from '@/components/SeedDataGate/SeedDataGate'

export function MatcherDemoClientPage() {
  return (
    <SeedDataGate>
      <MatcherDemoPage />
    </SeedDataGate>
  )
}
