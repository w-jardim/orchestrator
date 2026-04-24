export type ComponentType = 'FRONTEND' | 'BACKEND' | 'DATABASE' | 'CACHE' | 'QUEUE'
export type ComponentStatus = 'active' | 'inactive' | 'deprecated'

export interface Component {
  id: number
  projetoId: number
  nome: string
  slug: string
  tipo: ComponentType
  status: ComponentStatus
  createdAt: string
  updatedAt: string
}

export interface CreateComponentPayload {
  nome: string
  slug: string
  tipo: ComponentType
  status?: ComponentStatus
}

export interface UpdateComponentPayload {
  nome?: string
  slug?: string
  tipo?: ComponentType
  status?: ComponentStatus
}
