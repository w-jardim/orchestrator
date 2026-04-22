import { HealthWidget } from '../components/dashboard/HealthWidget'
import { StatCard } from '../components/dashboard/StatCard'
import { useHealth } from '../hooks/useHealth'

export function HealthPage() {
  const healthState = useHealth()
  const checks = healthState.health?.checks ? Object.values(healthState.health.checks) : []
  const okChecks = checks.filter((check) => check?.status === 'ok').length
  const degradedChecks = checks.filter((check) => check?.status === 'degraded' || check?.status === 'error').length

  return (
    <div className="space-y-6">
      <section className="max-w-3xl">
        <p className="font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
          Saúde
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Acompanhe a prontidão dos serviços da plataforma
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
          Monitore banco, Redis, Docker, filas e heartbeat do worker usando o endpoint consolidado `/health/full`.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Status geral"
          value={healthState.health?.status ?? 'unknown'}
          helper={healthState.health?.environment ?? 'Ambiente indisponível'}
          tone={healthState.health?.status === 'ok' ? 'success' : healthState.health?.status === 'degraded' ? 'warning' : 'danger'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 11-18 0 9 9 0 0118 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Checagens saudáveis"
          value={String(okChecks)}
          helper="Checagens respondendo como esperado"
          tone="success"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 12.75 10.5 18l9-13.5" />
            </svg>
          }
        />
        <StatCard
          label="Checagens degradadas"
          value={String(degradedChecks)}
          helper={`Versão ${healthState.health?.version ?? 'desconhecida'}`}
          tone={degradedChecks > 0 ? 'danger' : 'default'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm9-3.758a9 9 0 11-18 0 9 9 0 0118 0Z" />
            </svg>
          }
        />
      </section>

      <HealthWidget
        health={healthState.health}
        loading={healthState.loading}
        error={healthState.error}
        onRetry={healthState.refetch}
      />
    </div>
  )
}
