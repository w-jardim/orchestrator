import { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { tenantsService } from '../services/tenants.service'
import type { Tenant } from '../types/tenant'

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTenants = async () => {
      try {
        setLoading(true)
        const data = await tenantsService.list()
        setTenants(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar tenants')
      } finally {
        setLoading(false)
      }
    }

    loadTenants()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">Tenants</h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && <ErrorState message={error} />}

      {!loading && !error && tenants.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">Nenhum tenant encontrado</p>
        </div>
      )}

      {!loading && !error && tenants.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-50">{tenant.name}</h3>
                    <p className="text-xs text-slate-400">ID: {tenant.id}</p>
                  </div>
                  <Badge>{tenant.status}</Badge>
                </div>
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-slate-300">Slug:</span> {tenant.slug}
                </p>
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-slate-300">Plano:</span> {tenant.plan}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
