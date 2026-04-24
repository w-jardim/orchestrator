import api from './api'
import type { ApiResponse } from '../types/api'
import type {
  GitKey,
  GenerateKeyPayload,
  AddKeyPayload,
  TestAuthPayload,
  ConfigureGitPayload,
  KeyFingerprint,
  TestAuthResponse,
} from '../types/git-credentials'

export const gitCredentialsService = {
  async listKeys(): Promise<GitKey[]> {
    const { data } = await api.get<ApiResponse<GitKey[]>>('/api/v1/git/credentials')
    return data.data || []
  },

  async generateKey(payload: GenerateKeyPayload): Promise<GitKey> {
    const { data } = await api.post<ApiResponse<GitKey>>(
      '/api/v1/git/credentials/generate',
      payload
    )
    return data.data
  },

  async addKey(payload: AddKeyPayload): Promise<GitKey> {
    const { data } = await api.post<ApiResponse<GitKey>>('/api/v1/git/credentials/add', payload)
    return data.data
  },

  async removeKey(name: string): Promise<void> {
    await api.delete(`/api/v1/git/credentials/${name}`)
  },

  async getFingerprint(name: string): Promise<KeyFingerprint> {
    const { data } = await api.get<ApiResponse<KeyFingerprint>>(
      `/api/v1/git/credentials/${name}/fingerprint`
    )
    return data.data
  },

  async testAuth(payload: TestAuthPayload): Promise<TestAuthResponse> {
    const { data } = await api.post<ApiResponse<TestAuthResponse>>(
      '/api/v1/git/credentials/test-auth',
      payload
    )
    return data.data
  },

  async configureGit(payload: ConfigureGitPayload): Promise<void> {
    await api.post('/api/v1/git/credentials/configure', payload)
  },
}
