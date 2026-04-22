import { useState, useEffect, useCallback } from 'react'
import { containersService } from '../services/containers.service'
import type { Container, ContainerAction } from '../types/container'

interface UseContainersOptions {
  all?: boolean
}

export function useContainers({ all = true }: UseContainersOptions = {}) {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await containersService.list(all)
      setContainers(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load containers')
    } finally {
      setLoading(false)
    }
  }, [all])

  const runAction = useCallback(async (id: string, action: ContainerAction) => {
    setActionLoading(`${id}-${action}`)
    try {
      await containersService.action(id, action)
      await fetch()
    } finally {
      setActionLoading(null)
    }
  }, [fetch])

  useEffect(() => { fetch() }, [fetch])

  return { containers, loading, error, refetch: fetch, runAction, actionLoading }
}
