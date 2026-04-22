import { DeploysList } from '../components/dashboard/DeploysList'
import { StatCard } from '../components/dashboard/StatCard'
import { useDeploys } from '../hooks/useDeploys'

export function DeploysPage() {
  const deploysState = useDeploys()

  const pendingCount = deploysState.deploys.filter((deploy) => deploy.status === 'pending' || deploy.status === 'running').length
  const successCount = deploysState.deploys.filter((deploy) => deploy.status === 'success').length
  const failedCount = deploysState.deploys.filter((deploy) => deploy.status === 'failed').length

  return (
    <div className="space-y-6">
      <section className="max-w-3xl">
        <p className="font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
          Deploys
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Acompanhe o histórico de deploy e seus resultados
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
          Acompanhe solicitações enfileiradas, reimplantações recentes e execuções com falha usando dados reais do serviço de deploy.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Deploys recentes"
          value={String(deploysState.deploys.length)}
          helper="Registros retornados por /api/deploy"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m15.59 14.37-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.63 8.41m5.96 5.96a14.94 14.94 0 0 1-5.84 2.58m-.12-8.54a6 6 0 0 0-7.38 5.84h4.8" />
            </svg>
          }
        />
        <StatCard
          label="Em andamento"
          value={String(pendingCount)}
          helper="Fluxos de deploy enfileirados ou em execução"
          tone="warning"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2.25m5.25-.75a9 9 0 11-18 0 9 9 0 0118 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Concluídos com sucesso"
          value={String(successCount)}
          helper={`${failedCount} deploys com falha precisam de revisão`}
          tone={failedCount > 0 ? 'danger' : 'success'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 12.75 2.25 2.25L15 9.75m6 2.25a9 9 0 11-18 0 9 9 0 0118 0Z" />
            </svg>
          }
        />
      </section>

      <DeploysList
        deploys={deploysState.deploys}
        loading={deploysState.loading}
        error={deploysState.error}
        mutating={deploysState.mutating}
        onRetry={deploysState.refetch}
        onRedeploy={deploysState.redeploy}
      />
    </div>
  )
}
