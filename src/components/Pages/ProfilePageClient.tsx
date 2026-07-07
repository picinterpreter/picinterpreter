'use client'

import { useEffect } from 'react'
import { ProfileSettingsPage } from '@/components/Settings/SettingsDrawer'
import { OnboardingModal } from '@/components/Onboarding/OnboardingModal'
import { SeedDataGate } from '@/components/SeedDataGate/SeedDataGate'
import { SyncBootstrapGate } from '@/components/SyncBootstrap/SyncBootstrapGate'
import { useAuthStore } from '@/stores/auth-store'

export function ProfilePageClient() {
  const initializeAuth = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  return (
    <SeedDataGate>
      <SyncBootstrapGate>
        <ProfileSettingsPage />
        <OnboardingModal />
      </SyncBootstrapGate>
    </SeedDataGate>
  )
}
