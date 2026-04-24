export type UserRole = 'ADMIN_MASTER' | 'ADMIN' | 'OPERATOR' | 'VIEWER'

export interface UserDetails {
  id: number
  name: string
  email: string
  role: UserRole
  active: boolean
  tenantId?: number
  createdAt: string
  updatedAt: string
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role?: UserRole
  tenantId?: number
}

export interface UpdateUserPayload {
  name?: string
  email?: string
}

export interface ChangeUserRolePayload {
  role: UserRole
}

export interface ChangeUserStatusPayload {
  active: boolean
}

export interface ChangeUserPasswordPayload {
  password: string
}
