import api from './api'
import type { ApiResponse } from '../types/api'
import type { Container, ContainerInspect, ContainerAction } from '../types/container'

export const containersService = {
  async list(all = true): Promise<Container[]> {
    const { data } = await api.get<ApiResponse<Container[]>>('/api/docker/containers', {
      params: { all },
    })
    return data.data
  },

  async inspect(id: string): Promise<ContainerInspect> {
    const { data } = await api.get<ApiResponse<ContainerInspect>>(`/api/docker/containers/${id}`)
    return data.data
  },

  async logs(id: string): Promise<string> {
    const { data } = await api.get<ApiResponse<string>>(`/api/docker/containers/${id}/logs`)
    return data.data
  },

  async action(id: string, action: ContainerAction): Promise<void> {
    await api.post(`/api/docker/containers/${id}/${action}`)
  },
}
