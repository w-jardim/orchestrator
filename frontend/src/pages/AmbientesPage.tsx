import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { ambientesService } from '../services/ambientes.service'
import type { Environment } from '../types/environment'

export function AmbientesPage() {
  const { projectId = '1' } = useParams()
  const [ambientes, setAmbientes] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAmbientes = async () => {
      try {
        setLoading(true)
        const data = await ambientesService.list(parseInt(projectId))
        setAmbientes(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar ambientes')
      } finally {
        setLoading(false)
      }
    }

    loadAmbientes()
  }, [projectId])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">Ambientes</h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && <ErrorState message={error} />}

      {!loading && !error && ambientes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">Nenhum ambiente encontrado</p>
        </div>
      )}

      {!loading && !error && ambientes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ambientes.map((ambiente) => (
            <Card key={ambiente.id} className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-50">{ambiente.nome}</h3>
                    <p className="text-xs text-slate-400">ID: {ambiente.id}</p>
                  </div>
                  <Badge>{ambiente.tipo}</Badge>
                </div>
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-slate-300">Slug:</span> {ambiente.slug}
                </p>
                {ambiente.dominio && (
                  <p className="text-sm text-slate-400">
                    <span className="font-medium text-slate-300">Domínio:</span> {ambiente.dominio}
                  </p>
                )}
                {ambiente.porta && (
                  <p className="text-sm text-slate-400">
                    <span className="font-medium text-slate-300">Porta:</span> {ambiente.porta}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
