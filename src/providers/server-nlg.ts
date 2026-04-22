import type { NLGProvider, NLGRequest, NLGResponse } from '@/types'

const NLG_REQUEST_TIMEOUT_MS = 16_000

export class ServerNLG implements NLGProvider {
  readonly name = 'next-server-ai'

  async generate(req: NLGRequest): Promise<NLGResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`NLG API timeout after ${NLG_REQUEST_TIMEOUT_MS}ms`))
    }, NLG_REQUEST_TIMEOUT_MS)

    let response: Response

    try {
      response = await fetch('/api/ai/sentences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
        signal: controller.signal,
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (controller.signal.aborted) {
        throw new Error(`NLG API timeout after ${NLG_REQUEST_TIMEOUT_MS / 1000}s`)
      }
      throw error
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`NLG API error ${response.status}: ${text}`)
    }

    return response.json() as Promise<NLGResponse>
  }
}
