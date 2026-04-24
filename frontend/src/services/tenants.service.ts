import api from './api'
import type { ApiResponse } from '../types/api'
import type { Tenant, CreateTenantPayload, UpdateTenantPayload } from '../types/tenant'

interface PaginationParams {
  page?: number
  limit?: number
  status?: string
}

export const tenantsService = {
  async list(params?: PaginationParams): Promise<Tenant[]> {
    const { data } = await api.get<ApiResponse<Tenant[]>>('/api/v1/tenants', { params })
    return data.data || []
  },

  async get(id: number): Promise<Tenant> {
    const { data } = await api.get<ApiResponse<Tenant>>(`/api/v1/tenants/${id}`)
    return data.data
  },

  async create(payload: CreateTenantPayload): Promise<Tenant> {
    const { data } = await api.post<ApiResponse<Tenant>>('/api/v1/tenants', payload)
    return data.data
  },

  async update(id: number, payload: UpdateTenantPayload): Promise<Tenant> {
    const { data } = await api.put<ApiResponse<Tenant>>(`/api/v1/tenants/${id}`, payload)
    return data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/tenants/${id}`)
  },
}
