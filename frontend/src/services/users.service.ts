import api from './api'
import type { ApiResponse } from '../types/api'
import type {
  UserDetails,
  CreateUserPayload,
  UpdateUserPayload,
  ChangeUserRolePayload,
  ChangeUserStatusPayload,
  ChangeUserPasswordPayload,
} from '../types/user'

interface PaginationParams {
  page?: number
  limit?: number
  role?: string
  tenantId?: number
}

export const usersService = {
  async list(params?: PaginationParams): Promise<UserDetails[]> {
    const { data } = await api.get<ApiResponse<UserDetails[]>>('/api/v1/users', { params })
    return data.data || []
  },

  async get(id: number): Promise<UserDetails> {
    const { data } = await api.get<ApiResponse<UserDetails>>(`/api/v1/users/${id}`)
    return data.data
  },

  async create(payload: CreateUserPayload): Promise<UserDetails> {
    const { data } = await api.post<ApiResponse<UserDetails>>('/api/v1/users', payload)
    return data.data
  },

  async update(id: number, payload: UpdateUserPayload): Promise<UserDetails> {
    const { data } = await api.put<ApiResponse<UserDetails>>(`/api/v1/users/${id}`, payload)
    return data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/users/${id}`)
  },

  async changeRole(id: number, payload: ChangeUserRolePayload): Promise<UserDetails> {
    const { data } = await api.patch<ApiResponse<UserDetails>>(
      `/api/v1/users/${id}/role`,
      payload
    )
    return data.data
  },

  async changeStatus(id: number, payload: ChangeUserStatusPayload): Promise<UserDetails> {
    const { data } = await api.patch<ApiResponse<UserDetails>>(
      `/api/v1/users/${id}/status`,
      payload
    )
    return data.data
  },

  async changePassword(id: number, payload: ChangeUserPasswordPayload): Promise<void> {
    await api.patch(`/api/v1/users/${id}/password`, payload)
  },
}
