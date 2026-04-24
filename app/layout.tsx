import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: '图语家',
  description: '失语症患者辅助沟通 AAC 工具',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
