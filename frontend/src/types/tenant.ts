export type TenantPlan = 'FREE' | 'PRO' | 'ENTERPRISE'
export type TenantStatus = 'active' | 'inactive' | 'suspended'

export interface Tenant {
  id: number
  name: string
  slug: string
  plan: TenantPlan
  status: TenantStatus
  createdAt: string
  updatedAt: string
}

export interface CreateTenantPayload {
  name: string
  slug: string
  plan?: TenantPlan
  status?: TenantStatus
}

export interface UpdateTenantPayload {
  name?: string
  slug?: string
  plan?: TenantPlan
  status?: TenantStatus
}
