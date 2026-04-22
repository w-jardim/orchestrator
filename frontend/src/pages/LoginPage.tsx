import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'

interface LocationState {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, error, clearError, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const from = (location.state as LocationState | null)?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [from, isAuthenticated, navigate])

  useEffect(() => {
    clearError()
  }, [clearError])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch {
      // Error state is handled by the auth hook.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/75 shadow-2xl shadow-cyan-950/30 backdrop-blur xl:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden border-r border-slate-800 p-10 xl:block">
          <p className="font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
            Plagard orchestrator
          </p>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold tracking-tight text-white">
            Controle seguro para containers, deploys e health checks multi-tenant.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
            Entre com sua conta real para consumir a API protegida, manter a sessao persistida e operar o ambiente sem falhas de autenticacao.
          </p>

          <div className="mt-10 grid gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm font-medium text-slate-200">JWT automatico</p>
              <p className="mt-2 text-sm text-slate-400">
                Todas as chamadas para `/api/docker/containers`, `/api/deploy` e `/health/full` usam a mesma instancia autenticada do Axios.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm font-medium text-slate-200">Sessao persistida</p>
              <p className="mt-2 text-sm text-slate-400">
                O token e os dados minimos do usuario ficam salvos localmente para restaurar a sessao ao recarregar a aplicacao.
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <p className="font-['Space_Grotesk'] text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Entrar
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Acesse o dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Use suas credenciais reais do backend para liberar o acesso aos recursos protegidos.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="email">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  placeholder="admin@plagard.local"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="password">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  placeholder="Sua senha"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <Button className="w-full justify-center rounded-2xl" type="submit" loading={loading}>
                Entrar
              </Button>
            </form>

            <p className="mt-6 text-sm text-slate-500">
              Após autenticar, você será redirecionado automaticamente para a última rota protegida acessada.
            </p>
            <p className="mt-3 text-xs text-slate-600">Use as credenciais reais provisionadas no backend para o tenant correspondente.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
