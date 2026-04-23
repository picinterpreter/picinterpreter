import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isDatabaseConfigured } from '@/server/db/prisma'
import { bootstrapClientIdentity, DEVICE_COOKIE_NAME } from '@/server/sync/service'
import type { BootstrapRequest } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: { message: 'DATABASE_URL is not configured' } },
      { status: 503 },
    )
  }

  let body: BootstrapRequest
  try {
    body = (await request.json()) as BootstrapRequest
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  if (typeof body.installId !== 'string' || body.installId.trim().length === 0) {
    return NextResponse.json(
      { error: { message: 'installId is required' } },
      { status: 400 },
    )
  }

  try {
    const cookieStore = await cookies()
    const existingDeviceId = cookieStore.get(DEVICE_COOKIE_NAME)?.value
    const result = await bootstrapClientIdentity(body, existingDeviceId)
    const response = NextResponse.json(result)
    response.cookies.set(DEVICE_COOKIE_NAME, result.deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bootstrap failed'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}
