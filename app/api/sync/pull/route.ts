import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isDatabaseConfigured } from '@/server/db/prisma'
import { DEVICE_COOKIE_NAME, pullClientChanges } from '@/server/sync/service'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: { message: 'DATABASE_URL is not configured' } },
      { status: 503 },
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

  const { searchParams } = new URL(request.url)
  const afterChangeId = Number.parseInt(searchParams.get('afterChangeId') ?? '0', 10)
  const safeAfterChangeId = Number.isFinite(afterChangeId) && afterChangeId > 0 ? afterChangeId : 0

  try {
    const result = await pullClientChanges(deviceId, safeAfterChangeId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync pull failed'
    const status = message.includes('registered') ? 401 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}
