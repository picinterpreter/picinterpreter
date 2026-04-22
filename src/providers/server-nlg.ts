import type { NLGProvider, NLGRequest, NLGResponse } from '@/types'

export class ServerNLG implements NLGProvider {
  readonly name = 'next-server-ai'

  async generate(req: NLGRequest): Promise<NLGResponse> {
    const response = await fetch('/api/ai/sentences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`NLG API error ${response.status}: ${text}`)
    }

    return response.json() as Promise<NLGResponse>
  }
}
