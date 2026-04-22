import type { AuthState } from '../types/auth'

const AUTH_TOKEN_KEY = 'plagard_token'
const AUTH_USER_KEY = 'plagard_user'

function readStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function readStoredAuthState(): AuthState {
  return {
    token: localStorage.getItem(AUTH_TOKEN_KEY),
    user: readStoredUser(),
  }
}

export function persistAuthState(state: AuthState) {
  if (state.token) {
    localStorage.setItem(AUTH_TOKEN_KEY, state.token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }

  if (state.user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(state.user))
  } else {
    localStorage.removeItem(AUTH_USER_KEY)
  }
}

export function clearStoredAuth() {
  persistAuthState({ token: null, user: null })
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}
