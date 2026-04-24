import axios, { AxiosInstance } from 'axios'
import { clearStoredAuth, getStoredToken } from './auth-storage'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  count?: number
  total?: number
  page?: number
  pages?: number
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use((config) => {
      const token = getStoredToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearStoredAuth()
          window.dispatchEvent(new Event('plagard:auth-cleared'))
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  // ─── Authentication ─────────────────────────────────────────────
  async login(email: string, password: string) {
    const { data } = await this.client.post<ApiResponse<any>>('/api/v1/auth/login', {
      email,
      password,
    })
    return data
  }

  async getMe() {
    const { data } = await this.client.get<ApiResponse<any>>('/api/v1/auth/me')
    return data
  }

  async logout() {
    const { data } = await this.client.post<ApiResponse<any>>('/api/v1/auth/logout')
    return data
  }

  async refreshToken() {
    const { data } = await this.client.post<ApiResponse<any>>('/api/v1/auth/refresh')
    return data
  }

  // ─── Health ────────────────────────────────────────────────────
  async getHealth() {
    const { data } = await this.client.get<ApiResponse<any>>('/health')
    return data
  }

  // ─── Tenants (ADMIN_MASTER) ────────────────────────────────────
  async listTenants(page = 1, limit = 10) {
    const { data } = await this.client.get<ApiResponse<any>>('/api/v1/tenants', {
      params: { page, limit },
    })
    return data
  }

  async createTenant(tenant: { nome: string; slug: string; plano: string; status: string }) {
    const { data } = await this.client.post<ApiResponse<any>>('/api/v1/tenants', tenant)
    return data
  }

  async getTenant(id: number) {
    const { data } = await this.client.get<ApiResponse<any>>(`/api/v1/tenants/${id}`)
    return data
  }

  async updateTenant(id: number, tenant: any) {
    const { data } = await this.client.put<ApiResponse<any>>(`/api/v1/tenants/${id}`, tenant)
    return data
  }

  async deleteTenant(id: number) {
    const { data } = await this.client.delete<ApiResponse<any>>(`/api/v1/tenants/${id}`)
    return data
  }

  // ─── Users ────────────────────────────────────────────────────
  async listUsers(page = 1, limit = 10) {
    const { data } = await this.client.get<ApiResponse<any>>('/api/v1/users', {
      params: { page, limit },
    })
    return data
  }

  async createUser(user: {
    email: string
    password: string
    nome: string
    role: string
    status: string
  }) {
    const { data } = await this.client.post<ApiResponse<any>>('/api/v1/users', user)
    return data
  }

  async getUser(id: number) {
    const { data } = await this.client.get<ApiResponse<any>>(`/api/v1/users/${id}`)
    return data
  }

  async updateUser(id: number, user: any) {
    const { data } = await this.client.put<ApiResponse<any>>(`/api/v1/users/${id}`, user)
    return data
  }

  async deleteUser(id: number) {
    const { data } = await this.client.delete<ApiResponse<any>>(`/api/v1/users/${id}`)
    return data
  }

  async changeUserRole(id: number, role: string) {
    const { data } = await this.client.patch<ApiResponse<any>>(`/api/v1/users/${id}/role`, {
      role,
    })
    return data
  }

  async changeUserStatus(id: number, status: string) {
    const { data } = await this.client.patch<ApiResponse<any>>(`/api/v1/users/${id}/status`, {
      status,
    })
    return data
  }

  async changeUserPassword(id: number, password: string) {
    const { data } = await this.client.patch<ApiResponse<any>>(`/api/v1/users/${id}/password`, {
      password,
    })
    return data
  }

  // ─── Projetos ─────────────────────────────────────────────────
  async listProjects(page = 1, limit = 10) {
    const { data } = await this.client.get<ApiResponse<any>>('/api/v1/projetos', {
      params: { page, limit },
    })
    return data
  }

  async createProject(project: {
    nome: string
    descricao: string
    tipo: string
    status: string
  }) {
    const { data } = await this.client.post<ApiResponse<any>>('/api/v1/projetos', project)
    return data
  }

  async getProject(id: number) {
    const { data } = await this.client.get<ApiResponse<any>>(`/api/v1/projetos/${id}`)
    return data
  }

  async updateProject(id: number, project: any) {
    const { data } = await this.client.put<ApiResponse<any>>(`/api/v1/projetos/${id}`, project)
    return data
  }

  async deleteProject(id: number) {
    const { data } = await this.client.delete<ApiResponse<any>>(`/api/v1/projetos/${id}`)
    return data
  }

  async getProjectStatus(id: number) {
    const { data } = await this.client.get<ApiResponse<any>>(`/api/v1/projetos/${id}/status`)
    return data
  }

  // ─── Ambientes ────────────────────────────────────────────────
  async listEnvironments(projectId: number, page = 1, limit = 10) {
    const { data } = await this.client.get<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/ambientes`,
      {
        params: { page, limit },
      }
    )
    return data
  }

  async createEnvironment(
    projectId: number,
    env: { nome: string; slug: string; tipo: string; porta?: number; dominio?: string }
  ) {
    const { data } = await this.client.post<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/ambientes`,
      env
    )
    return data
  }

  async getEnvironment(projectId: number, envId: number) {
    const { data } = await this.client.get<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/ambientes/${envId}`
    )
    return data
  }

  async updateEnvironment(projectId: number, envId: number, env: any) {
    const { data } = await this.client.put<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/ambientes/${envId}`,
      env
    )
    return data
  }

  async deleteEnvironment(projectId: number, envId: number) {
    const { data } = await this.client.delete<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/ambientes/${envId}`
    )
    return data
  }

  // ─── Componentes ──────────────────────────────────────────────
  async listComponents(projectId: number, page = 1, limit = 10) {
    const { data } = await this.client.get<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/componentes`,
      {
        params: { page, limit },
      }
    )
    return data
  }

  async createComponent(
    projectId: number,
    component: { nome: string; slug: string; tipo: string; status: string }
  ) {
    const { data } = await this.client.post<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/componentes`,
      component
    )
    return data
  }

  async getComponent(projectId: number, compId: number) {
    const { data } = await this.client.get<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/componentes/${compId}`
    )
    return data
  }

  async updateComponent(projectId: number, compId: number, component: any) {
    const { data } = await this.client.put<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/componentes/${compId}`,
      component
    )
    return data
  }

  async deleteComponent(projectId: number, compId: number) {
    const { data } = await this.client.delete<ApiResponse<any>>(
      `/api/v1/projetos/${projectId}/componentes/${compId}`
    )
    return data
  }

  // ─── Docker Containers ────────────────────────────────────────
  async listContainers(all = false) {
    const { data } = await this.client.get<ApiResponse<any>>('/api/v1/docker/containers', {
      params: { all },
    })
    return data
  }

  async getContainer(id: string) {
    const { data } = await this.client.get<ApiResponse<any>>(
      `/api/v1/docker/containers/${id}`
    )
    return data
  }

  async startContainer(id: string, timeout?: number) {
    const { data } = await this.client.post<ApiResponse<any>>(
      `/api/v1/docker/containers/${id}/start`,
      { timeout }
    )
    return data
  }

  async stopContainer(id: string, timeout = 10) {
    const { data } = await this.client.post<ApiResponse<any>>(
      `/api/v1/docker/containers/${id}/stop`,
      { timeout }
    )
    return data
  }

  async restartContainer(id: string, timeout = 10) {
    const { data } = await this.client.post<ApiResponse<any>>(
      `/api/v1/docker/containers/${id}/restart`,
      { timeout }
    )
    return data
  }

  async getContainerLogs(id: string, tail = 100, timestamps = false) {
    const { data } = await this.client.get<ApiResponse<any>>(
      `/api/v1/docker/containers/${id}/logs`,
      {
        params: { tail, timestamps },
      }
    )
    return data
  }

  async removeContainer(id: string, force = false, removeVolumes = false) {
    const { data } = await this.client.delete<ApiResponse<any>>(
      `/api/v1/docker/containers/${id}`,
      {
        data: { force, removeVolumes },
      }
    )
    return data
  }

  // ─── Docker Images ────────────────────────────────────────────
  async listImages() {
    const { data } = await this.client.get<ApiResponse<any>>('/api/v1/docker/images')
    return data
  }

  async getImage(id: string) {
    const { data } = await this.client.get<ApiResponse<any>>(`/api/v1/docker/images/${id}`)
    return data
  }

  async pullImage(image: string) {
    const { data } = await this.client.post<ApiResponse<any>>('/api/v1/docker/images/pull', {
      image,
    })
    return data
  }

  async deleteImage(id: string, force = false) {
    const { data } = await this.client.delete<ApiResponse<any>>(`/api/v1/docker/images/${id}`, {
      data: { force },
    })
    return data
  }

  // ─── Git Credentials ───────────────────────────────────────────
  async listGitKeys() {
    const { data } = await this.client.get<ApiResponse<any>>('/api/v1/git/credentials')
    return data
  }

  async generateGitKey(name: string, comment?: string) {
    const { data } = await this.client.post<ApiResponse<any>>(
      '/api/v1/git/credentials/generate',
      { name, comment }
    )
    return data
  }

  async addGitKey(name: string, privateKey: string, publicKey: string) {
    const { data } = await this.client.post<ApiResponse<any>>('/api/v1/git/credentials/add', {
      name,
      privateKey,
      publicKey,
    })
    return data
  }

  async deleteGitKey(name: string) {
    const { data } = await this.client.delete<ApiResponse<any>>(
      `/api/v1/git/credentials/${name}`
    )
    return data
  }

  async getGitKeyFingerprint(name: string) {
    const { data } = await this.client.get<ApiResponse<any>>(
      `/api/v1/git/credentials/${name}/fingerprint`
    )
    return data
  }

  async testGitAuth(repositoryUrl: string) {
    const { data } = await this.client.post<ApiResponse<any>>(
      '/api/v1/git/credentials/test-auth',
      { repositoryUrl }
    )
    return data
  }

  async configureGit(name: string, email: string) {
    const { data } = await this.client.post<ApiResponse<any>>(
      '/api/v1/git/credentials/configure',
      { name, email }
    )
    return data
  }
}

export const apiClient = new ApiClient()
export default apiClient
