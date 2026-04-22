import { useState, useEffect, useCallback } from 'react'
import { healthService } from '../services/health.service'
import type { FullHealth } from '../types/health'

export function useHealth(pollInterval = 30_000) {
  const [health, setHealth] = useState<FullHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await healthService.full()
      setHealth(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Health check failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, pollInterval)
    return () => clearInterval(interval)
  }, [fetch, pollInterval])

  return { health, loading, error, refetch: fetch }
}
