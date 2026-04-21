/**
 * useDoubaoAsr — 豆包流式语音识别 hook
 *
 * 原理：
 *   浏览器 → 本地代理 (ws://localhost:3001/asr) → 豆包 ASR WebSocket
 *
 * 注意事项：
 *   1. 只能在运行了本地代理（npm run dev:proxy）时可用。
 *   2. 使用 AudioContext + ScriptProcessorNode 采集 PCM 16kHz 音频。
 *      ScriptProcessorNode 已被 AudioWorklet 取代，但兼容性更好，暂时沿用。
 *   3. 只能在 https:// 或 localhost 下获得麦克风权限。
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const PROXY_ASR_WS_URL = 'ws://localhost:3001/asr'
const SAMPLE_RATE = 16000          // 豆包 ASR 要求 16kHz
const BUFFER_SIZE = 4096           // ScriptProcessorNode 缓冲大小

export interface DoubaoAsrState {
  /** 正在监听中 */
  isListening: boolean
  /** 实时中间文本（未确认，仅用于预览） */
  interimText: string
  /** 错误信息（null = 无错误） */
  error: string | null
  /** 开始监听；onResult 在收到最终文本后调用 */
  startListening: (onResult: (text: string) => void) => void
  /** 手动停止监听（发送空包信号，等待最后结果后关闭） */
  stopListening: () => void
}

export function useDoubaoAsr(): DoubaoAsrState {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const wsRef         = useRef<WebSocket | null>(null)
  const audioCtxRef   = useRef<AudioContext | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const processorRef  = useRef<ScriptProcessorNode | null>(null)
  const mountedRef    = useRef(true)
  const onResultRef   = useRef<((text: string) => void) | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cleanup() {
    processorRef.current?.disconnect()
    processorRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    wsRef.current = null
  }

  const startListening = useCallback((onResult: (text: string) => void) => {
    // 防止重复启动
    cleanup()
    if (mountedRef.current) {
      setError(null)
      setInterimText('')
    }
    onResultRef.current = onResult

    // 1. 获取麦克风权限
    navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
      .then((stream) => {
        if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream

        // 2. 建立到代理的 WebSocket
        const ws = new WebSocket(PROXY_ASR_WS_URL)
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws

        // 3. 创建 AudioContext 和 PCM 采集器（等代理就绪后才启动）
        const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1)
        processorRef.current = processor

        // 静音 GainNode：ScriptProcessorNode 需接入 destination，但不输出声音
        const silentGain = audioCtx.createGain()
        silentGain.gain.value = 0
        source.connect(processor)
        processor.connect(silentGain)
        silentGain.connect(audioCtx.destination)

        // 4. 收到代理 ready 信号后开始发送音频
        let audioStarted = false

        processor.onaudioprocess = (e) => {
          if (!audioStarted || ws.readyState !== WebSocket.OPEN) return
          const float32 = e.inputBuffer.getChannelData(0)
          // Float32 [-1, 1] → Int16 [-32768, 32767]
          const int16 = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32768)))
          }
          ws.send(int16.buffer)
        }

        ws.onopen = () => {
          // 等待代理回传 ready 消息后才激活音频采集
          if (mountedRef.current) setIsListening(true)
        }

        ws.onmessage = (e) => {
          if (!mountedRef.current) return
          try {
            const msg = JSON.parse(e.data as string) as {
              type: string
              text?: string
              interim?: boolean
              message?: string
            }
            if (msg.type === 'ready') {
              // 代理已连接豆包 ASR，开始发送音频
              audioStarted = true
            } else if (msg.type === 'result') {
              if (msg.interim) {
                setInterimText(msg.text ?? '')
              } else if (msg.text) {
                setInterimText('')
                onResultRef.current?.(msg.text)
              }
            } else if (msg.type === 'error') {
              setError(msg.message ?? 'ASR 识别错误')
              setIsListening(false)
              cleanup()
            }
          } catch {
            // 忽略无法解析的消息
          }
        }

        ws.onerror = () => {
          if (!mountedRef.current) return
          setError('无法连接豆包语音识别，请确认已运行本地代理（npm run dev:proxy）')
          setIsListening(false)
          cleanup()
        }

        ws.onclose = () => {
          if (!mountedRef.current) return
          setIsListening(false)
          setInterimText('')
          cleanup()
        }
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
        } else {
          setError('无法访问麦克风，请检查设备和浏览器权限')
        }
      })
  }, [])

  const stopListening = useCallback(() => {
    // 先断开音频采集，再发空包触发豆包最终结果，0.5s 后关闭
    processorRef.current?.disconnect()
    processorRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // 空 ArrayBuffer = 结束信号
      wsRef.current.send(new ArrayBuffer(0))
      // 给豆包留时间返回最后一帧结果
      setTimeout(() => {
        wsRef.current?.close()
      }, 600)
    }

    if (mountedRef.current) {
      setIsListening(false)
      setInterimText('')
    }
  }, [])

  return { isListening, interimText, error, startListening, stopListening }
}
