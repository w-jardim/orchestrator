import { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { gitCredentialsService } from '../services/git-credentials.service'
import type { GitKey } from '../types/git-credentials'

export function GitCredentialsPage() {
  const [keys, setKeys] = useState<GitKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadKeys = async () => {
      try {
        setLoading(true)
        const data = await gitCredentialsService.listKeys()
        setKeys(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar credenciais')
      } finally {
        setLoading(false)
      }
    }

    loadKeys()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">Credenciais Git</h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && <ErrorState message={error} />}

      {!loading && !error && keys.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">Nenhuma chave SSH configurada</p>
        </div>
      )}

      {!loading && !error && keys.length > 0 && (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.name} className="p-4">
              <div className="space-y-2">
                <div>
                  <h3 className="font-semibold text-slate-50">{key.name}</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">Fingerprint</p>
                    <p className="text-slate-300 font-mono text-xs break-all">{key.fingerprint}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Criada em</p>
                    <p className="text-slate-300">{formatDate(key.createdAt)}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
