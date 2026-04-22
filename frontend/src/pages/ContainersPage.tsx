import { ContainersTable } from '../components/dashboard/ContainersTable'
import { StatCard } from '../components/dashboard/StatCard'
import { useContainers } from '../hooks/useContainers'

function getContainerState(container: Parameters<typeof ContainersTable>[0]['containers'][number]) {
  if (typeof container.State === 'string') return container.State
  if (typeof container.state === 'string') return container.state
  return container.state?.status ?? 'created'
}

export function ContainersPage() {
  const containersState = useContainers()

  const runningContainers = containersState.containers.filter((container) => getContainerState(container) === 'running').length
  const stoppedContainers = containersState.containers.length - runningContainers
  const exposedPorts = containersState.containers.reduce((total, container) => {
    const ports = Array.isArray(container.Ports) ? container.Ports : Array.isArray(container.ports) ? container.ports : []
    return total + ports.filter((port) => (port.PublicPort ?? port.publicPort) != null).length
  }, 0)

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
            Containers
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Gerencie workloads ativos no orquestrador
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
            Inspecione o estado em execução, portas publicadas e ações operacionais dos containers disponíveis no escopo atual.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Containers visíveis"
          value={String(containersState.containers.length)}
          helper="Containers retornados por /api/docker/containers"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.25 7.5L12 3 3.75 7.5M20.25 7.5v9L12 21m8.25-13.5L12 12m0 9V12M3.75 7.5v9L12 21" />
            </svg>
          }
        />
        <StatCard
          label="Em execução"
          value={String(runningContainers)}
          helper="Containers atendendo tráfego ou processando jobs"
          tone="success"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 11-18 0 9 9 0 0118 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Portas publicadas"
          value={String(exposedPorts)}
          helper={`${stoppedContainers} containers exigem atenção ou estão offline`}
          tone={stoppedContainers > 0 ? 'warning' : 'default'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 7.5h10.5m-10.5 4.5h10.5m-10.5 4.5h6" />
            </svg>
          }
        />
      </section>

      <ContainersTable
        containers={containersState.containers}
        loading={containersState.loading}
        error={containersState.error}
        onRetry={containersState.refetch}
        onAction={containersState.runAction}
        actionLoading={containersState.actionLoading}
      />
    </div>
  )
}
