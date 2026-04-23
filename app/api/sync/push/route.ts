import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isDatabaseConfigured } from '@/server/db/prisma'
import { DEVICE_COOKIE_NAME, pushClientMutations } from '@/server/sync/service'
import type { SyncPushRequest } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: { message: 'DATABASE_URL is not configured' } },
      { status: 503 },
    )
  }

  let body: SyncPushRequest
  try {
    body = (await request.json()) as SyncPushRequest
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  if (!Array.isArray(body.mutations)) {
    return NextResponse.json(
      { error: { message: 'mutations must be an array' } },
      { status: 400 },
    )
  }

  const cookieStore = await cookies()
  const deviceId = cookieStore.get(DEVICE_COOKIE_NAME)?.value
  if (!deviceId) {
    return NextResponse.json(
      { error: { message: 'Device is not bootstrapped' } },
      { status: 401 },
    )
  }

  try {
    const result = await pushClientMutations(deviceId, body)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync push failed'
    const status = message.includes('registered') ? 401 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}
