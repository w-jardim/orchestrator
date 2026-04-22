export type DeployStatus = 'pending' | 'running' | 'success' | 'failed'

export interface Deploy {
  id: number
  tenantId: number | null
  name: string
  image: string
  status: DeployStatus
  containerId: string | null
  containerName: string | null
  containerAlias: string | null
  ports: string[]
  env: Record<string, string>
  logs: string | null
  error: string | null
  lastErrorCode: string | null
  lastErrorDetails: Record<string, unknown> | null
  executionDurationMs: number | null
  statusHistory: Array<Record<string, unknown>>
  queuedAt: string
  startedAt: string | null
  finishedAt: string | null
  reconciledAt: string | null
  retentionUntil: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateDeployPayload {
  name: string
  image: string
  ports?: string[]
  env?: Record<string, string>
}
