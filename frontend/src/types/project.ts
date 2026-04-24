export type ProjectType = 'WEB' | 'API' | 'MOBILE' | 'FULL_STACK'
export type ProjectStatus = 'active' | 'inactive' | 'archived'

export interface Project {
  id: number
  nome: string
  slug: string
  descricao?: string
  tipo: ProjectType
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export interface ProjectStatus {
  id: number
  status: string
  lastUpdated: string
}

export interface CreateProjectPayload {
  nome: string
  slug: string
  descricao?: string
  tipo?: ProjectType
}

export interface UpdateProjectPayload {
  nome?: string
  slug?: string
  descricao?: string
  tipo?: ProjectType
  status?: ProjectStatus
}
