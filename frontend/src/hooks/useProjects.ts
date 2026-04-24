import { useEffect, useState } from 'react'
import { apiClient } from '../services/api'

export interface Project {
  id: number
  nome: string
  descricao: string
  slug: string
  tipo: string
  status: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface ProjectStats {
  total: number
  pages: number
  page: number
  count: number
}

export function useProjects(page = 1, limit = 10) {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    pages: 0,
    page: 1,
    count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await apiClient.listProjects(page, limit)
      if (response.success && response.data) {
        setProjects(response.data)
        setStats({
          total: response.total || 0,
          pages: response.pages || 0,
          page: response.page || page,
          count: response.count || 0,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (project: {
    nome: string
    descricao: string
    tipo: string
    status?: string
  }) => {
    try {
      const response = await apiClient.createProject({
        ...project,
        status: project.status || 'ativo',
      })
      if (response.success) {
        await fetchProjects()
        return response.data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      throw err
    }
  }

  const updateProject = async (id: number, updates: any) => {
    try {
      const response = await apiClient.updateProject(id, updates)
      if (response.success) {
        await fetchProjects()
        return response.data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
      throw err
    }
  }

  const deleteProject = async (id: number) => {
    try {
      const response = await apiClient.deleteProject(id)
      if (response.success) {
        await fetchProjects()
        return response.data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      throw err
    }
  }

  const getProjectStatus = async (id: number) => {
    try {
      const response = await apiClient.getProjectStatus(id)
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
      throw err
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [page, limit])

  return {
    projects,
    stats,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectStatus,
  }
}
