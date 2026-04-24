import api from './api'
import type { ApiResponse } from '../types/api'
import type { Deploy, CreateDeployPayload } from '../types/deploy'

export const deploysService = {
  async list(): Promise<Deploy[]> {
    const { data } = await api.get<ApiResponse<Deploy[]>>('/api/v1/deploy')
    return data.data
  },

  async get(id: number): Promise<Deploy> {
    const { data } = await api.get<ApiResponse<Deploy>>(`/api/v1/deploy/${id}`)
    return data.data
  },

  async create(payload: CreateDeployPayload): Promise<Deploy> {
    const { data } = await api.post<ApiResponse<Deploy>>('/api/v1/deploy', payload)
    return data.data
  },

  async redeploy(id: number): Promise<Deploy> {
    const { data } = await api.post<ApiResponse<Deploy>>(`/api/v1/deploy/${id}/redeploy`)
    return data.data
  },

  async stop(id: number): Promise<Deploy> {
    const { data } = await api.post<ApiResponse<Deploy>>(`/api/v1/deploy/${id}/stop`)
    return data.data
  },
}
