import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const RESULT_PATH = path.join(process.cwd(), 'data/pictogram-eval-results.json')
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

interface EvalSaveBody {
  cases?: unknown
  evaluations?: unknown
}

async function readExisting() {
  try {
    const raw = await readFile(RESULT_PATH, 'utf8')
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export async function GET() {
  return NextResponse.json({
    path: RESULT_PATH,
    data: await readExisting(),
  }, { headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function POST(request: Request) {
  let body: EvalSaveBody

  try {
    body = (await request.json()) as EvalSaveBody
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body' } },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  if (!Array.isArray(body.cases) || !body.evaluations || typeof body.evaluations !== 'object') {
    return NextResponse.json(
      { error: { message: 'cases and evaluations are required' } },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const payload = {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    source: 'public/pictogram-eval.html',
    flow: 'sentence-understanding-search-detail-verify-no-segmentation',
    cases: body.cases,
    evaluations: body.evaluations,
  }

  await mkdir(path.dirname(RESULT_PATH), { recursive: true })
  await writeFile(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  return NextResponse.json({
    ok: true,
    path: RESULT_PATH,
    updatedAt: payload.updatedAt,
  }, { headers: CORS_HEADERS })
}
