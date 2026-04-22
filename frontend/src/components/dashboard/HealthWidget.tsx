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

function getVariant(status: HealthStatus) {
  if (status === 'ok') return 'green'
  if (status === 'degraded') return 'yellow'
  if (status === 'error') return 'red'
  return 'gray'
}

function serviceEntries(health: FullHealth) {
  return Object.entries(health.checks) as Array<[string, ServiceHealth | undefined]>
}

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function HealthWidget({ health, loading, error, onRetry }: HealthWidgetProps) {
  return (
    <Card className="h-full border-slate-800/80 bg-slate-900/70" padding={false}>
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
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={getVariant(health.status)} dot>
              {health.status}
            </Badge>
            <p className="text-sm text-slate-400">Uptime {formatUptime(health.uptime)}</p>
            <p className="text-sm text-slate-500">{health.environment ?? 'ambiente desconhecido'}</p>
          </div>

          <div className="grid gap-3">
            {serviceEntries(health).map(([name, service]) => (
              <div key={name} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium capitalize text-slate-200">{name}</p>
                  <Badge variant={getVariant(service?.status ?? 'unknown')} dot>
                    {service?.status ?? 'unknown'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {service?.error ?? (service?.details ? JSON.stringify(service.details) : 'Serviço respondendo normalmente')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
