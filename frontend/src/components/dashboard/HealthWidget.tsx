import { useState } from 'react'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Spinner } from '../ui/Spinner'
import type { FullHealth, HealthStatus, ServiceHealth } from '../../types/health'

interface HealthWidgetProps {
  health: FullHealth | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

interface QueueCounts {
  waiting?: number
  active?: number
  completed?: number
  failed?: number
}

function getVariant(status: HealthStatus) {
  if (status === 'ok') return 'green'
  if (status === 'degraded') return 'yellow'
  if (status === 'error') return 'red'
  return 'gray'
}

function formatStatus(status: HealthStatus) {
  if (status === 'ok') return 'ok'
  if (status === 'degraded') return 'degradado'
  if (status === 'error') return 'erro'
  return 'desconhecido'
}

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getSummary(service?: ServiceHealth) {
  if (!service) return 'Sem dados'
  if (service.error) return service.error
  return service.status === 'ok' ? 'Operando normalmente' : 'Ver detalhes abaixo'
}

function getQueueBlocks(service?: ServiceHealth) {
  const details = service?.details
  if (!details) return []

  const buildBlock = (label: string, counts: QueueCounts | undefined) => {
    if (!counts) return null

    return {
      label,
      metrics: [
        `Esperando ${counts.waiting ?? 0}`,
        `Ativos ${counts.active ?? 0}`,
        `Concluídos ${counts.completed ?? 0}`,
        `Falhas ${counts.failed ?? 0}`,
      ],
    }
  }

  return [
    buildBlock('Deploy', details.deploy as QueueCounts | undefined),
    buildBlock('Tasks', details.tasks as QueueCounts | undefined),
  ].filter(Boolean) as Array<{ label: string; metrics: string[] }>
}

function getWorkerLines(service?: ServiceHealth) {
  const details = service?.details
  if (!details) return []

  const lines: string[] = []

  if (typeof details.workerName === 'string') {
    lines.push(`Worker: ${details.workerName}`)
  }

  if (typeof details.heartbeat === 'string') {
    lines.push(`Heartbeat: ${new Date(details.heartbeat).toLocaleString('pt-BR')}`)
  }

  if (typeof details.ageMs === 'number') {
    lines.push(`Atraso: ${Math.round(details.ageMs / 1000)}s`)
  }

  return lines
}

function ServiceRow({ label, service }: { label: string; service?: ServiceHealth }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-200">{label}</p>
        <p className="mt-1 break-words text-xs text-slate-500">{getSummary(service)}</p>
      </div>
      <Badge variant={getVariant(service?.status ?? 'unknown')} dot>
        {formatStatus(service?.status ?? 'unknown')}
      </Badge>
    </div>
  )
}

export function HealthWidget({ health, loading, error, onRetry }: HealthWidgetProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className="h-full min-w-0 overflow-hidden border-slate-800/80 bg-slate-900/70" padding={false}>
      <div className="p-5">
        <CardHeader
          title="Saúde do cluster"
          subtitle="Checagens de banco, Redis, Docker, filas e heartbeat do worker."
          action={
            <Button variant="secondary" size="sm" onClick={onRetry} disabled={loading}>
              Atualizar
            </Button>
          }
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !health ? (
        <EmptyState title="Dados de saúde indisponíveis" description="Nenhum payload foi retornado pelo endpoint de health." />
      ) : (
        <div className="min-w-0 space-y-5 p-5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Badge variant={getVariant(health.status)} dot>
              {formatStatus(health.status)}
            </Badge>
            <p className="truncate text-sm text-slate-400">Uptime {formatUptime(health.uptime)}</p>
            <p className="truncate text-sm text-slate-500">{health.environment ?? 'ambiente desconhecido'}</p>
          </div>

          <div className="grid min-w-0 gap-3">
            <ServiceRow label="Database" service={health.checks.database} />
            <ServiceRow label="Redis" service={health.checks.redis} />
            <ServiceRow label="Docker" service={health.checks.docker} />
            <ServiceRow label="Queues" service={health.checks.queues} />
            <ServiceRow label="Worker" service={health.checks.worker} />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">Resumo operacional</p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  Filas e worker aparecem resumidos para manter o card estável e sem JSON bruto.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowDetails((current) => !current)}>
                {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
              </Button>
            </div>

            {showDetails && (
              <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Queues</p>
                  {getQueueBlocks(health.checks.queues).length > 0 ? (
                    getQueueBlocks(health.checks.queues).map((block) => (
                      <div key={block.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                        <p className="text-sm font-medium text-slate-200">{block.label}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {block.metrics.map((metric) => (
                            <span key={metric} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                              {metric}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Sem detalhes de filas disponíveis.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Worker</p>
                  {getWorkerLines(health.checks.worker).length > 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="space-y-2">
                        {getWorkerLines(health.checks.worker).map((line) => (
                          <p key={line} className="break-words text-xs text-slate-300">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Sem detalhes do worker disponíveis.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
