import { getServerTTSConfig } from './config'

const TTS_UPSTREAM_TIMEOUT_MS = 25_000

export interface SpeechAudio {
  data: ArrayBuffer
  contentType: string
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`TTS upstream timeout after ${timeoutMs}ms`))
  }, timeoutMs)

  const abortFromCaller = () => {
    controller.abort(signal?.reason)
  }

  if (signal) {
    if (signal.aborted) {
      abortFromCaller()
    } else {
      signal.addEventListener('abort', abortFromCaller, { once: true })
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortFromCaller)
    },
  }
}

function clampSpeed(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1
  return Math.min(2, Math.max(0.5, value))
}

function fallbackContentType(format: string): string {
  if (format === 'wav') return 'audio/wav'
  if (format === 'opus') return 'audio/ogg; codecs=opus'
  if (format === 'pcm') return 'audio/pcm'
  return 'audio/mpeg'
}

export async function synthesizeSpeech(
  input: { text: string; rate?: number; voice?: string },
  signal?: AbortSignal,
): Promise<SpeechAudio> {
  const config = getServerTTSConfig()
  if (!config) {
    throw new Error('AI_TTS_API_KEY or AI_API_KEY is not configured')
  }

  const timeout = withTimeout(signal, TTS_UPSTREAM_TIMEOUT_MS)
  let response: Response

  try {
    response = await fetch(`${config.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: input.text,
        voice: input.voice ?? config.voice,
        response_format: config.responseFormat,
        speed: clampSpeed(input.rate),
      }),
      signal: timeout.signal,
    })
  } catch (error) {
    timeout.cleanup()
    if (timeout.signal.aborted && !signal?.aborted) {
      throw new Error(`TTS upstream timeout after ${TTS_UPSTREAM_TIMEOUT_MS / 1000}s`)
    }
    throw error
  }

  timeout.cleanup()

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`TTS upstream error ${response.status}: ${text}`)
  }

  const contentType = response.headers.get('content-type') || fallbackContentType(config.responseFormat)
  const data = await response.arrayBuffer()

  if (data.byteLength === 0) {
    throw new Error('TTS upstream returned empty audio')
  }

  return { data, contentType }
}
