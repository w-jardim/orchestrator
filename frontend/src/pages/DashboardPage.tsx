import { ContainersTable } from '../components/dashboard/ContainersTable'
import { DeploysList } from '../components/dashboard/DeploysList'
import { HealthWidget } from '../components/dashboard/HealthWidget'
import { StatCard } from '../components/dashboard/StatCard'
import { useContainers } from '../hooks/useContainers'
import { useDeploys } from '../hooks/useDeploys'
import { useHealth } from '../hooks/useHealth'

function formatTimestamp(timestamp: string | null | undefined) {
  if (!timestamp) return 'Não disponível'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export function DashboardPage() {
  const containersState = useContainers()
  const deploysState = useDeploys()
  const healthState = useHealth()

  const runningContainers = containersState.containers.filter((container) => {
    const state =
      typeof container.State === 'string'
        ? container.State
        : typeof container.state === 'string'
          ? container.state
          : container.state?.status

    return state === 'running'
  }).length

  const stoppedContainers = containersState.containers.length - runningContainers
  const queuedDeploys = deploysState.deploys.filter((deploy) => deploy.status === 'pending' || deploy.status === 'running').length
  const failedDeploys = deploysState.deploys.filter((deploy) => deploy.status === 'failed').length

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
            Plagard orchestrator
          </p>
          <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Operações Docker em um único plano de controle
          </h1>
          <p className="mt-3 break-words text-sm leading-6 text-slate-400 sm:text-base">
            Monitore containers do tenant, acompanhe execuções de deploy e observe a saúde dos serviços em um único painel.
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 px-5 py-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Última atualização de saúde</p>
          <p className="mt-2 truncate text-sm font-medium text-slate-200">{formatTimestamp(healthState.health?.timestamp)}</p>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Containers em execução"
          value={String(runningContainers)}
          helper={`${containersState.containers.length} visíveis no escopo atual`}
          tone="success"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.25 7.5L12 3 3.75 7.5M20.25 7.5v9L12 21m8.25-13.5L12 12m0 9V12M3.75 7.5v9L12 21" />
            </svg>
          }
        />
        <StatCard
          label="Containers parados"
          value={String(stoppedContainers)}
          helper="Containers que podem exigir atenção operacional"
          tone={stoppedContainers > 0 ? 'danger' : 'default'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m0 3.75h.007v.008H12v-.008zm8.25-3.758a8.25 8.25 0 11-16.5 0 8.25 8.25 0 0116.5 0z" />
            </svg>
          }
        />
        <StatCard
          label="Deploys enfileirados"
          value={String(queuedDeploys)}
          helper="Solicitações pendentes de execução ou ainda em andamento"
          tone="warning"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.94 14.94 0 01-5.84 2.58m-.12-8.54a6 6 0 00-7.38 5.84h4.8m2.58-5.84a14.9 14.9 0 00-2.58 5.84m2.7 2.7a12.13 12.13 0 01-2.76-2.76m7.38-2.16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          }
        />
        <StatCard
          label="Deploys com falha"
          value={String(failedDeploys)}
          helper="Histórico recente de deploys que precisa de revisão"
          tone={failedDeploys > 0 ? 'danger' : 'default'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8.25v4.5m0 3h.008v.008H12v-.008zM10.091 3.478L1.82 17.25A1.875 1.875 0 003.428 20.06h17.144a1.875 1.875 0 001.608-2.81L13.909 3.477a1.875 1.875 0 00-3.818 0z" />
            </svg>
          }
        />
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <ContainersTable
          containers={containersState.containers}
          loading={containersState.loading}
          error={containersState.error}
          onRetry={containersState.refetch}
          onAction={containersState.runAction}
          actionLoading={containersState.actionLoading}
        />
        <HealthWidget
          health={healthState.health}
          loading={healthState.loading}
          error={healthState.error}
          onRetry={healthState.refetch}
        />
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <DeploysList
          deploys={deploysState.deploys}
          loading={deploysState.loading}
          error={deploysState.error}
          mutating={deploysState.mutating}
          onRetry={deploysState.refetch}
          onRedeploy={deploysState.redeploy}
        />

        <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Notas operacionais
          </p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-sm font-medium text-slate-200">API de deploy</p>
              <p className="mt-2 break-words text-sm text-slate-400">
                {deploysState.error
                  ? 'Endpoint de deploy indisponível no momento.'
                  : `${deploysState.deploys.length} registros de deploy retornados por /api/deploy.`}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-sm font-medium text-slate-200">Saúde de runtime</p>
              <p className="mt-2 break-words text-sm text-slate-400">
                {healthState.health
                  ? `O backend reporta status ${healthState.health.status} com versão ${healthState.health.version ?? 'desconhecida'}.`
                  : 'Aguardando resposta de /health/full.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-sm font-medium text-slate-200">Ações de container</p>
              <p className="mt-2 break-words text-sm text-slate-400">
                As ações de iniciar, parar e reiniciar chamam os endpoints reais do Docker e atualizam a tabela após a conclusão.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
