import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { componentesService } from '../services/componentes.service'
import type { Component } from '../types/component'

export function ComponentesPage() {
  const { projectId = '1' } = useParams()
  const [componentes, setComponentes] = useState<Component[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadComponentes = async () => {
      try {
        setLoading(true)
        const data = await componentesService.list(parseInt(projectId))
        setComponentes(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar componentes')
      } finally {
        setLoading(false)
      }
    }

    loadComponentes()
  }, [projectId])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">Componentes</h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && <ErrorState message={error} />}

      {!loading && !error && componentes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">Nenhum componente encontrado</p>
        </div>
      )}

      {!loading && !error && componentes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {componentes.map((componente) => (
            <Card key={componente.id} className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-50">{componente.nome}</h3>
                    <p className="text-xs text-slate-400">ID: {componente.id}</p>
                  </div>
                  <Badge>{componente.status}</Badge>
                </div>
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-slate-300">Slug:</span> {componente.slug}
                </p>
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-slate-300">Tipo:</span> {componente.tipo}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
