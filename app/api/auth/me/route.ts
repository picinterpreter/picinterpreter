import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/server/auth/service'
import type { AuthMeResponse } from '@/types'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getAuthenticatedUser()
  return NextResponse.json<AuthMeResponse>({
    authenticated: user != null,
    user,
  })
}
