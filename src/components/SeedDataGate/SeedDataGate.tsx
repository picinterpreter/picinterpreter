'use client'

import type { ReactNode } from 'react'
import { useSeedDataReady } from '@/hooks/use-seed-data-ready'

interface SeedDataGateProps {
  children: ReactNode
}

export function SeedDataGate({ children }: SeedDataGateProps) {
  const { ready, error, retry } = useSeedDataReady()

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-red-50">
        <div className="text-center">
          <p className="text-2xl text-red-600 mb-4">初始化失败</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={retry}
            className="mt-4 px-6 py-3 bg-red-600 text-white rounded-xl"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">正在加载图库...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
