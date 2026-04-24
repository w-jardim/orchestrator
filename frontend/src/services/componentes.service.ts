import api from './api'
import type { ApiResponse } from '../types/api'
import type { Component, CreateComponentPayload, UpdateComponentPayload } from '../types/component'

interface PaginationParams {
  page?: number
  limit?: number
  tipo?: string
  status?: string
}

export const componentesService = {
  async list(projetoId: number, params?: PaginationParams): Promise<Component[]> {
    const { data } = await api.get<ApiResponse<Component[]>>(
      `/api/v1/projetos/${projetoId}/componentes`,
      { params }
    )
    return data.data || []
  },

  async get(projetoId: number, id: number): Promise<Component> {
    const { data } = await api.get<ApiResponse<Component>>(
      `/api/v1/projetos/${projetoId}/componentes/${id}`
    )
    return data.data
  },

  async create(projetoId: number, payload: CreateComponentPayload): Promise<Component> {
    const { data } = await api.post<ApiResponse<Component>>(
      `/api/v1/projetos/${projetoId}/componentes`,
      payload
    )
    return data.data
  },

  async update(
    projetoId: number,
    id: number,
    payload: UpdateComponentPayload
  ): Promise<Component> {
    const { data } = await api.put<ApiResponse<Component>>(
      `/api/v1/projetos/${projetoId}/componentes/${id}`,
      payload
    )
    return data.data
  },

  async delete(projetoId: number, id: number): Promise<void> {
    await api.delete(`/api/v1/projetos/${projetoId}/componentes/${id}`)
  },
}
