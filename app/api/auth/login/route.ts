import { NextResponse } from 'next/server'
import { applySessionCookie, AuthError, loginUser } from '@/server/auth/service'
import type { LoginRequest, LoginResponse } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: LoginRequest
  try {
    body = (await request.json()) as LoginRequest
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  try {
    const result = await loginUser(body)
    const response = NextResponse.json<LoginResponse>({ user: result.user })
    applySessionCookie(response, result.token)
    return response
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ error: { message } }, { status })
  }
}
