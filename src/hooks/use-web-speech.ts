/**
 * useWebSpeech — 封装 Web Speech API (SpeechRecognition) 的 React hook。
 *
 * 特性：
 *  - 显示实时中间结果（interim），供 UI 在识别完成前预览
 *  - 识别到最终文本后调用 onResult 回调
 *  - 组件卸载时自动 abort，防止资源泄漏
 *  - 在不支持的浏览器（Firefox/Safari iOS 等）中 isAvailable = false，UI 可据此隐藏按钮
 *
 * 注意：Chrome/Edge 桌面版支持最佳；Android Chrome 支持；Safari macOS 14+ 支持。
 * 在 https:// 或 localhost 下才能获得麦克风权限。
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// 类型扩展：Web Speech API 在 TypeScript DOM lib 中支持不完整，手动补充
/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance
interface SpeechRecognitionInstance {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onstart: (() => void) | null
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

export interface WebSpeechState {
  /** 当前浏览器是否支持 SpeechRecognition */
  isAvailable: boolean
  /** 正在监听中 */
  isListening: boolean
  /** 实时中间文本（识别未完成，仅用于预览） */
  interimText: string
  /** 错误信息（null = 无错误） */
  error: string | null
  /** 开始监听；onResult 在识别出最终文本后调用 */
  startListening: (onResult: (text: string) => void) => void
  /** 手动停止监听 */
  stopListening: () => void
}

export function useWebSpeech(): WebSpeechState {
  const SpeechRecognitionImpl =
    (typeof window !== 'undefined' &&
      (window.SpeechRecognition ?? window.webkitSpeechRecognition)) ||
    null

  const isAvailable = SpeechRecognitionImpl !== null

  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onResultRef = useRef<((text: string) => void) | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  const startListening = useCallback(
    (onResult: (text: string) => void) => {
      if (!SpeechRecognitionImpl) return

      // 防止重复启动
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }

      setError(null)
      setInterimText('')
      onResultRef.current = onResult

      const recognition = new SpeechRecognitionImpl()
      recognition.lang = 'zh-CN'
      recognition.interimResults = true   // 实时显示中间结果
      recognition.maxAlternatives = 1
      recognition.continuous = false      // 识别到停顿即自动结束

      recognition.onstart = () => {
        if (mountedRef.current) setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            final += result[0].transcript
          } else {
            interim += result[0].transcript
          }
        }
        if (mountedRef.current) {
          setInterimText(interim)
          if (final) {
            setInterimText('')
            onResultRef.current?.(final.trim())
          }
        }
      }

      recognition.onerror = (event: any) => {
        if (!mountedRef.current) return
        setIsListening(false)
        setInterimText('')
        // not-allowed = 用户拒绝麦克风权限
        if (event.error === 'not-allowed') {
          setError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
        } else if (event.error === 'no-speech') {
          setError('未检测到语音，请重试')
        } else if (event.error !== 'aborted') {
          setError('语音识别失败，请重试')
        }
      }

      recognition.onend = () => {
        if (mountedRef.current) {
          setIsListening(false)
          setInterimText('')
        }
        recognitionRef.current = null
      }

      recognitionRef.current = recognition
      recognition.start()
    },
    [SpeechRecognitionImpl],
  )

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    if (mountedRef.current) {
      setIsListening(false)
      setInterimText('')
    }
  }, [])

  return { isAvailable, isListening, interimText, error, startListening, stopListening }
}
