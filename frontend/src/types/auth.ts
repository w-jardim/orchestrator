export type Role = 'VIEWER' | 'OPERATOR' | 'ADMIN' | 'ADMIN_MASTER'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  tenantId: number | null
}

export interface AuthState {
  user: User | null
  token: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}
