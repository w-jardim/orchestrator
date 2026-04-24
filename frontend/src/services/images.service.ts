import api from './api'
import type { ApiResponse } from '../types/api'
import type { DockerImage, PullImagePayload, RemoveImagePayload } from '../types/image'

export const imagesService = {
  async list(): Promise<DockerImage[]> {
    const { data } = await api.get<ApiResponse<DockerImage[]>>('/api/v1/docker/images')
    return data.data || []
  },

  async get(id: string): Promise<DockerImage> {
    const { data } = await api.get<ApiResponse<DockerImage>>(`/api/v1/docker/images/${id}`)
    return data.data
  },

  async pull(payload: PullImagePayload): Promise<DockerImage> {
    const { data } = await api.post<ApiResponse<DockerImage>>('/api/v1/docker/images/pull', payload)
    return data.data
  },

  async remove(id: string, payload?: RemoveImagePayload): Promise<void> {
    await api.delete(`/api/v1/docker/images/${id}`, { data: payload })
  },
}
