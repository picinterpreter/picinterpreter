import { NextResponse } from 'next/server'
import { applySessionCookie, AuthError, registerUser } from '@/server/auth/service'
import type { RegisterRequest, RegisterResponse } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: RegisterRequest
  try {
    body = (await request.json()) as RegisterRequest
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  try {
    const result = await registerUser(body)
    const response = NextResponse.json<RegisterResponse>({ user: result.user })
    applySessionCookie(response, result.token)
    return response
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Register failed'
    return NextResponse.json({ error: { message } }, { status })
  }
}
