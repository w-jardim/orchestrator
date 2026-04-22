export type HealthStatus = 'ok' | 'degraded' | 'error' | 'unknown'

export interface ServiceHealth {
  status: HealthStatus
  error?: string
  details?: Record<string, unknown>
}

export interface FullHealth {
  status: HealthStatus
  timestamp: string
  uptime: number
  version?: string
  environment?: string
  checks: {
    database: ServiceHealth
    redis: ServiceHealth
    docker?: ServiceHealth
    queues?: ServiceHealth
    worker?: ServiceHealth
  }
}
