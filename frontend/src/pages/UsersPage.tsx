import { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { usersService } from '../services/users.service'
import { tenantsService } from '../services/tenants.service'
import type { UserDetails } from '../types/user'
import type { Tenant } from '../types/tenant'

export function UsersPage() {
  const [users, setUsers] = useState<UserDetails[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER',
    tenantId: '',
  })

  const roles = ['VIEWER', 'OPERATOR', 'ADMIN', 'ADMIN_MASTER']

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const [userData, tenantData] = await Promise.all([
        usersService.list({ page: 1, limit: 50 }),
        tenantsService.list(),
      ])
      setUsers(userData)
      setTenants(tenantData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const needsTenant = formData.role !== 'ADMIN_MASTER'

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      await usersService.create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as UserDetails['role'],
        tenantId: formData.tenantId ? Number(formData.tenantId) : undefined,
      })
      setFormData({ name: '', email: '', password: '', role: 'VIEWER', tenantId: '' })
      setShowForm(false)
      await fetchUsers()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao criar usuário')
    }
  }

  const handleDeleteUser = async (id: number) => {
    if (confirm('Tem certeza que deseja deletar este usuário?')) {
      try {
        await usersService.delete(id)
        await fetchUsers()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao deletar usuário')
      }
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

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
            {formError && (
              <div className="rounded-lg bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-300">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="password"
                placeholder="Senha (mín. 8 caracteres)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value, tenantId: '' })}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              {needsTenant && (
                <select
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  required
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                >
                  <option value="">Selecione o tenant</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
            {needsTenant && (
              <p className="text-xs text-slate-500">
                Selecione o tenant ao qual este usuário pertence.
              </p>
            )}
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
                <th className="text-left px-4 py-2 text-slate-300 font-semibold">Tenant</th>
                <th className="text-right px-4 py-2 text-slate-300 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-50">{user.name}</td>
                  <td className="px-4 py-3 text-slate-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN_MASTER' ? 'red' : user.role === 'ADMIN' ? 'blue' : 'gray'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.active ? 'green' : 'red'}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {user.tenant_id ?? '—'}
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
