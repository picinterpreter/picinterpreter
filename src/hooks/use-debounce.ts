/**
 * useDebounce — 对任意值进行防抖，延迟 `delay` ms 后才将新值同步给调用方。
 *
 * 适用场景：搜索框输入防抖，避免每次按键都触发昂贵的查询。
 *
 * @param value   要防抖的值
 * @param delay   静默期（毫秒），默认 250
 * @returns       防抖后的稳定值
 */

import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
