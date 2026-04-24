import { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { apiClient } from '../services/api'

interface User {
  id: number
  email: string
  nome: string
  role: string
  status: string
  created_at: string
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [page] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'VIEWER',
    status: 'ativo',
  })

  const roles = ['VIEWER', 'OPERATOR', 'ADMIN', 'ADMIN_MASTER']

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.listUsers(page, 10)
      if (response.success && response.data) {
        setUsers(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.createUser(formData)
      setFormData({ nome: '', email: '', password: '', role: 'VIEWER', status: 'ativo' })
      setShowForm(false)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar usuário')
    }
  }

  const handleDeleteUser = async (id: number) => {
    if (confirm('Tem certeza que deseja deletar este usuário?')) {
      try {
        await apiClient.deleteUser(id)
        await fetchUsers()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao deletar usuário')
      }
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-50">Usuários</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {showForm ? '✕ Cancelar' : '+ Novo Usuário'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-800/50 p-6">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="password"
                placeholder="Senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Criar Usuário
            </Button>
          </form>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && <ErrorState message={error} />}

      {!loading && !error && users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">Nenhum usuário encontrado</p>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-2 text-slate-300 font-semibold">Nome</th>
                <th className="text-left px-4 py-2 text-slate-300 font-semibold">Email</th>
                <th className="text-left px-4 py-2 text-slate-300 font-semibold">Role</th>
                <th className="text-left px-4 py-2 text-slate-300 font-semibold">Status</th>
                <th className="text-right px-4 py-2 text-slate-300 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-50">{user.nome}</td>
                  <td className="px-4 py-3 text-slate-50">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="blue">{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={user.status === 'ativo' ? 'green' : 'red'}
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      onClick={() => handleDeleteUser(user.id)}
                      className="bg-red-600 hover:bg-red-700 text-sm"
                    >
                      Deletar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
