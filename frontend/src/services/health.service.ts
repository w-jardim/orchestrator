import api from './api'
import type { FullHealth } from '../types/health'

export const healthService = {
  async full(): Promise<FullHealth> {
    const { data } = await api.get<FullHealth>('/api/v1/health/full')
    return data
  },
}
