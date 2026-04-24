import api from './api'
import type { ApiResponse } from '../types/api'
import type { Project, CreateProjectPayload, UpdateProjectPayload, ProjectStatusResponse } from '../types/project'

interface PaginationParams {
  page?: number
  limit?: number
  status?: string
  tipo?: string
}

export const projetosService = {
  async list(params?: PaginationParams): Promise<Project[]> {
    const { data } = await api.get<ApiResponse<Project[]>>('/api/v1/projetos', { params })
    return data.data || []
  },

  async get(id: number): Promise<Project> {
    const { data } = await api.get<ApiResponse<Project>>(`/api/v1/projetos/${id}`)
    return data.data
  },

  async create(payload: CreateProjectPayload): Promise<Project> {
    const { data } = await api.post<ApiResponse<Project>>('/api/v1/projetos', payload)
    return data.data
  },

  async update(id: number, payload: UpdateProjectPayload): Promise<Project> {
    const { data } = await api.put<ApiResponse<Project>>(`/api/v1/projetos/${id}`, payload)
    return data.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/projetos/${id}`)
  },

  async getStatus(id: number): Promise<ProjectStatusResponse> {
    const { data } = await api.get<ApiResponse<ProjectStatusResponse>>(
      `/api/v1/projetos/${id}/status`
    )
    return data.data
  },
}
