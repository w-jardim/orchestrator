import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService } from '../services/auth.service'
import {
  clearStoredAuth,
  persistAuthState,
  readStoredAuthState,
} from '../services/auth-storage'
import type { AuthState, LoginPayload } from '../types/auth'

interface AuthContextValue extends AuthState {
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialState = readStoredAuthState()
  const [authState, setAuthState] = useState<AuthState>(initialState)
  const [loading, setLoading] = useState(() => Boolean(initialState.token) && !initialState.user)
  const [error, setError] = useState<string | null>(null)

  const applyAuthState = useCallback((nextState: AuthState) => {
    persistAuthState(nextState)
    setAuthState(nextState)
  }, [])

  const logout = useCallback(() => {
    setError(null)
    applyAuthState({ token: null, user: null })
  }, [applyAuthState])

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authService.login(payload)
      applyAuthState({
        token: response.accessToken,
        user: response.user,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao autenticar'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [applyAuthState])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    const syncAuth = () => {
      setAuthState(readStoredAuthState())
    }

    window.addEventListener('storage', syncAuth)
    window.addEventListener('plagard:auth-cleared', syncAuth as EventListener)

    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('plagard:auth-cleared', syncAuth as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!authState.token || authState.user) return

    let cancelled = false

    const hydrateSession = async () => {
      setLoading(true)
      try {
        const user = await authService.me()
        if (!cancelled) {
          applyAuthState({
            token: authState.token,
            user,
          })
        }
      } catch {
        if (!cancelled) {
          clearStoredAuth()
          setAuthState({ token: null, user: null })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [authState.token, authState.user, applyAuthState])

  const value = useMemo<AuthContextValue>(() => ({
    user: authState.user,
    token: authState.token,
    loading,
    error,
    isAuthenticated: Boolean(authState.token),
    login,
    logout,
    clearError,
  }), [authState.user, authState.token, loading, error, login, logout, clearError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
