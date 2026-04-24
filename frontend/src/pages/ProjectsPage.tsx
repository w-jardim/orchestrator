import { useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'

export function ProjectsPage() {
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'nodejs',
    status: 'ativo',
  })

  const { projects, stats, loading, error, createProject } = useProjects(page, 10)

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProject(formData)
      setFormData({ nome: '', descricao: '', tipo: 'nodejs', status: 'ativo' })
      setShowForm(false)
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
    }
  }

  const tipoOptions = ['nodejs', 'python', 'docker', 'static', 'custom']
  const statusOptions = ['ativo', 'pausado', 'deletado']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-50">Projetos</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {showForm ? '✕ Cancelar' : '+ Novo Projeto'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-800/50 p-6">
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Nome do projeto"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50 placeholder-slate-400"
              />
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
              >
                {tipoOptions.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Descrição"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50 placeholder-slate-400"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Criar Projeto
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && <ErrorState message={error} />}

      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">Nenhum projeto encontrado</p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="bg-slate-800/50 p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-50">{project.nome}</h3>
                  <p className="text-sm text-slate-400">{project.descricao}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      label={project.tipo}
                      color={
                        project.tipo === 'nodejs'
                          ? 'green'
                          : project.tipo === 'python'
                            ? 'blue'
                            : 'purple'
                      }
                    />
                    <Badge
                      label={project.status}
                      color={project.status === 'ativo' ? 'green' : 'red'}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Criado em {new Date(project.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {stats.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
              >
                Anterior
              </Button>
              <span className="text-slate-400">
                Página {stats.page} de {stats.pages}
              </span>
              <Button
                onClick={() => setPage(page + 1)}
                disabled={page >= stats.pages}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
