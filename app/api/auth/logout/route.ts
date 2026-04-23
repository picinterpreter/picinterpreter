import { NextResponse } from 'next/server'
import { AuthError, clearSessionCookie, logoutCurrentSession } from '@/server/auth/service'
import type { LogoutRequest } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: LogoutRequest
  try {
    body = (await request.json()) as LogoutRequest
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  if (body.preserveLocal !== true) {
    return NextResponse.json(
      { error: { message: 'preserveLocal must be true' } },
      { status: 400 },
    )
  }

  try {
    await logoutCurrentSession()
    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    return response
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Logout failed'
    return NextResponse.json({ error: { message } }, { status })
  }
}
