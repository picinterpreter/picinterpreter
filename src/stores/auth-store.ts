import { create } from 'zustand'
import { syncService } from '@/services/sync-service'
import { authService } from '@/services/auth-service'
import type {
  AuthStatus,
  AuthenticatedUserSummary,
  LocalDataAction,
  LoginRequest,
  RegisterRequest,
} from '@/types'

interface AuthState {
  status: AuthStatus
  user: AuthenticatedUserSummary | null
  refreshMe: () => Promise<void>
  initialize: () => Promise<void>
  register: (input: RegisterRequest) => Promise<void>
  login: (input: LoginRequest) => Promise<void>
  logout: () => Promise<void>
}

let initializePromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  refreshMe: async () => {
    const result = await authService.getMe()
    await syncService.setAuthUserId(result.user?.id ?? null)
    set({
      status: result.authenticated ? 'authenticated' : 'anonymous',
      user: result.user,
    })
  },

  initialize: async () => {
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      await syncService.bootstrap()
      await get().refreshMe()
    })().finally(() => {
      initializePromise = null
    })

    return initializePromise
  },

  register: async (input) => {
    const localDataAction: LocalDataAction = input.localDataAction === 'discard' ? 'discard' : 'merge'
    await syncService.prepareLocalDataForAuth(localDataAction)
    const result = await authService.register({ ...input, localDataAction })
    await syncService.completeAuthTransition(result.user.id)
    set({
      status: 'authenticated',
      user: result.user,
    })
  },

  login: async (input) => {
    await syncService.prepareLocalDataForAuth(input.localDataAction)
    const result = await authService.login(input)
    await syncService.completeAuthTransition(result.user.id)
    set({
      status: 'authenticated',
      user: result.user,
    })
  },

  logout: async () => {
    await authService.logout({ preserveLocal: true })
    await syncService.detachLocalAccountData()
    set({
      status: 'anonymous',
      user: null,
    })
  },
}))
