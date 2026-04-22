import { useState, useEffect, useCallback } from 'react'
import { deploysService } from '../services/deploys.service'
import type { Deploy, CreateDeployPayload } from '../types/deploy'

export function useDeploys() {
  const [deploys, setDeploys] = useState<Deploy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await deploysService.list()
      setDeploys(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load deploys')
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (payload: CreateDeployPayload) => {
    setMutating(true)
    try {
      const deploy = await deploysService.create(payload)
      setDeploys((prev) => [deploy, ...prev])
      return deploy
    } finally {
      setMutating(false)
    }
  }, [])

  const redeploy = useCallback(async (id: number) => {
    setMutating(true)
    try {
      const updated = await deploysService.redeploy(id)
      setDeploys((prev) => prev.map((d) => (d.id === id ? updated : d)))
    } finally {
      setMutating(false)
    }
  }, [])

  const stop = useCallback(async (id: number) => {
    setMutating(true)
    try {
      const updated = await deploysService.stop(id)
      setDeploys((prev) => prev.map((d) => (d.id === id ? updated : d)))
    } finally {
      setMutating(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { deploys, loading, error, mutating, refetch: fetch, create, redeploy, stop }
}
