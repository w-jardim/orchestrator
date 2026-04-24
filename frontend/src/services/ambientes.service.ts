import api from './api'
import type { ApiResponse } from '../types/api'
import type { Environment, CreateEnvironmentPayload, UpdateEnvironmentPayload } from '../types/environment'

interface PaginationParams {
  page?: number
  limit?: number
  tipo?: string
}

export const ambientesService = {
  async list(projetoId: number, params?: PaginationParams): Promise<Environment[]> {
    const { data } = await api.get<ApiResponse<Environment[]>>(
      `/api/v1/projetos/${projetoId}/ambientes`,
      { params }
    )
    return data.data || []
  },

  async get(projetoId: number, id: number): Promise<Environment> {
    const { data } = await api.get<ApiResponse<Environment>>(
      `/api/v1/projetos/${projetoId}/ambientes/${id}`
    )
    return data.data
  },

  async create(projetoId: number, payload: CreateEnvironmentPayload): Promise<Environment> {
    const { data } = await api.post<ApiResponse<Environment>>(
      `/api/v1/projetos/${projetoId}/ambientes`,
      payload
    )
    return data.data
  },

  async update(
    projetoId: number,
    id: number,
    payload: UpdateEnvironmentPayload
  ): Promise<Environment> {
    const { data } = await api.put<ApiResponse<Environment>>(
      `/api/v1/projetos/${projetoId}/ambientes/${id}`,
      payload
    )
    return data.data
  },

  async delete(projetoId: number, id: number): Promise<void> {
    await api.delete(`/api/v1/projetos/${projetoId}/ambientes/${id}`)
  },
}
