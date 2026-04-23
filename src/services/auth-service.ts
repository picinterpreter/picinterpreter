'use client'

import type {
  AuthMeResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RegisterRequest,
  RegisterResponse,
} from '@/types'

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback))
  }

  return response.json() as Promise<T>
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: { message?: string } }
    return body.error?.message ?? fallback
  } catch {
    return fallback
  }
}

export const authService = {
  async register(input: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'same-origin',
    })

    return readJson<RegisterResponse>(response, '注册失败')
  },

  async login(input: LoginRequest): Promise<LoginResponse> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'same-origin',
    })

    return readJson<LoginResponse>(response, '登录失败')
  },

  async logout(input: LogoutRequest): Promise<void> {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'same-origin',
    })

    await readJson<{ ok: boolean }>(response, '退出登录失败')
  },

  async getMe(): Promise<AuthMeResponse> {
    const response = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      cache: 'no-store',
    })

    return readJson<AuthMeResponse>(response, '获取当前账号失败')
  },
}
