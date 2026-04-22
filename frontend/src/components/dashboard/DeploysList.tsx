import { Card, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import type { Deploy, DeployStatus } from '../../types/deploy'

interface DeploysListProps {
  deploys: Deploy[]
  loading: boolean
  error: string | null
  mutating: boolean
  onRetry: () => void
  onRedeploy: (id: number) => Promise<void>
}

const statusVariant: Record<DeployStatus, 'yellow' | 'blue' | 'green' | 'red'> = {
  pending: 'yellow',
  running: 'blue',
  success: 'green',
  failed: 'red',
}

function formatRelativeDate(date: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return formatter.format(new Date(date))
}

function formatDuration(duration: number | null) {
  if (!duration) return 'Aguardando execução'

  if (duration < 1000) return `${duration} ms`
  if (duration < 60_000) return `${Math.round(duration / 1000)} s`

  return `${Math.round(duration / 60_000)} min`
}

export function DeploysList({
  deploys,
  loading,
  error,
  mutating,
  onRetry,
  onRedeploy,
}: DeploysListProps) {
  return (
    <Card className="h-full border-slate-800/80 bg-slate-900/70" padding={false}>
      <div className="p-5">
        <CardHeader
          title="Deploys recentes"
          subtitle="Últimas solicitações de deploy e estados de execução."
          action={
            <Button variant="secondary" size="sm" onClick={onRetry} disabled={loading || mutating}>
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
      ) : deploys.length === 0 ? (
        <EmptyState
          title="Ainda não há histórico de deploys"
          description="Novas solicitações de deploy aparecerão aqui assim que forem enfileiradas."
        />
      ) : (
        <div className="divide-y divide-slate-800/80">
          {deploys.slice(0, 6).map((deploy) => (
            <article key={deploy.id} className="space-y-4 p-5 hover:bg-slate-800/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-100">{deploy.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{deploy.image}</p>
                </div>
                <Badge variant={statusVariant[deploy.status]} dot>
                  {deploy.status}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                <p>Enfileirado: {formatRelativeDate(deploy.queuedAt)}</p>
                <p>Duração: {formatDuration(deploy.executionDurationMs)}</p>
                <p>Container: {deploy.containerName ?? 'Ainda não provisionado'}</p>
                <p>Portas: {deploy.ports.length > 0 ? deploy.ports.join(', ') : 'Nenhuma porta publicada'}</p>
              </div>
              {deploy.error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{deploy.error}</p>}
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => onRedeploy(deploy.id)} loading={mutating}>
                  Reimplantar
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}
