export type EnvironmentType = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'

export interface Environment {
  id: number
  projetoId: number
  nome: string
  slug: string
  tipo: EnvironmentType
  porta?: number
  dominio?: string
  createdAt: string
  updatedAt: string
}

export interface CreateEnvironmentPayload {
  nome: string
  slug: string
  tipo: EnvironmentType
  porta?: number
  dominio?: string
}

export interface UpdateEnvironmentPayload {
  nome?: string
  slug?: string
  tipo?: EnvironmentType
  porta?: number
  dominio?: string
}
