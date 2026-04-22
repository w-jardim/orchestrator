import axios from 'axios'
import api from './api'
import type { ApiResponse } from '../types/api'
import type { LoginPayload, LoginResponse, User } from '../types/auth'

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data?.error === 'string'
        ? error.response.data.error
        : typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : Array.isArray(error.response?.data?.errors) && error.response?.data?.errors.length > 0
            ? String(error.response.data.errors[0]?.msg || error.response.data.errors[0]?.message || fallback)
            : null

    return responseMessage || fallback
  }

  return error instanceof Error ? error.message : fallback
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', payload)
      return data.data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Falha ao autenticar com a API'))
    }
  },

  async me(): Promise<User> {
    try {
      const { data } = await api.get<ApiResponse<User>>('/api/v1/auth/me')
      return data.data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Nao foi possivel validar a sessao atual'))
    }
  },
}
