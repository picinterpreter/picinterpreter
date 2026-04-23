import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/server/auth/service'
import type { AuthMeResponse } from '@/types'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    return NextResponse.json<AuthMeResponse>({
      authenticated: user != null,
      user,
    })
  } catch (error) {
    console.warn('GET /api/auth/me fallback to anonymous:', error)
    return NextResponse.json<AuthMeResponse>({
      authenticated: false,
      user: null,
    })
  }
}
