import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import type { Container, ContainerAction, ContainerStatus } from '../../types/container'

interface ContainersTableProps {
  containers: Container[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onAction: (id: string, action: ContainerAction) => Promise<void>
  actionLoading: string | null
}

function getContainerId(container: Container) {
  return container.Id || container.id || container.fullId || 'unknown-container'
}

function getContainerState(container: Container): ContainerStatus {
  if (typeof container.State === 'string') return container.State
  if (typeof container.state === 'string') return container.state
  if (typeof container.state === 'object' && container.state?.status) return container.state.status
  return 'created'
}

function getContainerStatusText(container: Container) {
  return container.Status || container.status || 'Status indisponível'
}

function getContainerName(container: Container) {
  const candidates = [
    ...(Array.isArray(container.Names) ? container.Names : []),
    ...(Array.isArray(container.names) ? container.names : []),
    container.name,
  ].filter(Boolean)

  return candidates[0]?.replace(/^\//, '') || 'Container sem nome'
}

function getContainerImage(container: Container) {
  return container.Image || container.image || 'Imagem desconhecida'
}

function getStatusVariant(state: Container['State']) {
  if (state === 'running') return 'green'
  if (state === 'paused' || state === 'restarting') return 'yellow'
  if (state === 'exited' || state === 'dead') return 'red'
  return 'gray'
}

function formatPorts(container: Container) {
  const ports = Array.isArray(container.Ports) ? container.Ports : Array.isArray(container.ports) ? container.ports : []

  if (ports.length === 0) return 'Nenhuma porta pública'

  return ports.map((port) => {
    const publicPort = port.PublicPort ?? port.publicPort
    const privatePort = port.PrivatePort ?? port.privatePort
    const type = port.Type ?? port.type ?? 'tcp'

    return publicPort ? `${publicPort}:${privatePort}/${type}` : `${privatePort}/${type}`
  },
  ).join(', ')
}

export function ContainersTable({
  containers,
  loading,
  error,
  onRetry,
  onAction,
  actionLoading,
}: ContainersTableProps) {
  return (
    <Card className="border-slate-800/80 bg-slate-900/70" padding={false}>
      <div className="p-5">
        <CardHeader
          title="Containers"
          subtitle="Estado em execução, imagens e ações operacionais mais comuns."
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
      ) : containers.length === 0 ? (
        <EmptyState
          title="Nenhum container encontrado"
          description="O orquestrador não retornou containers para o escopo atual do tenant."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-left">
            <thead className="bg-slate-950/40">
              <tr className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <th className="px-5 py-3 font-medium">Container</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Imagem</th>
                <th className="px-5 py-3 font-medium">Portas</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {containers.slice(0, 8).map((container) => {
                const containerId = getContainerId(container)
                const state = getContainerState(container)
                const name = getContainerName(container)
                const primaryAction: ContainerAction = state === 'running' ? 'restart' : 'start'

                return (
                  <tr key={containerId} className="hover:bg-slate-800/30">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-100">{name}</p>
                        <p className="mt-1 text-xs text-slate-500">{containerId.slice(0, 12)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getStatusVariant(state)} dot>
                        {state}
                      </Badge>
                      <p className="mt-2 text-xs text-slate-500">{getContainerStatusText(container)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300">{getContainerImage(container)}</td>
                    <td className="px-5 py-4 text-sm text-slate-400">{formatPorts(container)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAction(containerId, primaryAction)}
                          loading={actionLoading === `${containerId}-${primaryAction}`}
                        >
                          {primaryAction === 'restart' ? 'Reiniciar' : 'Iniciar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onAction(containerId, 'stop')}
                          loading={actionLoading === `${containerId}-stop`}
                          disabled={state !== 'running'}
                        >
                          Parar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
