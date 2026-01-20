import { useEffect, useState } from 'react'
import type { HoneypotLog } from '@/features/offline/db/schema'

interface HoneypotLogsSummary {
  total: number
  uniqueIPs: number
  topIPs: Array<{ ip: string; count: number }>
  topPaths: Array<{ path: string; count: number }>
}

interface HoneypotLogsResponse {
  success: boolean
  logs: HoneypotLog[]
  summary: HoneypotLogsSummary
}

export function useHoneypotLogs(limit = 100) {
  const [logs, setLogs] = useState<HoneypotLog[]>([])
  const [summary, setSummary] = useState<HoneypotLogsSummary>({
    total: 0,
    uniqueIPs: 0,
    topIPs: [],
    topPaths: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/honeypot/log?limit=${limit}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: HoneypotLogsResponse = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setSummary(data.summary)
      } else {
        setError(data.error || 'Failed to fetch logs')
      }
    } catch (err) {
      console.error('Failed to fetch honeypot logs:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all honeypot logs?')) {
      return false
    }

    try {
      const response = await fetch('/api/honeypot/log', { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        await fetchLogs() // Refresh
        return true
      } else {
        setError(data.error || 'Failed to clear logs')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [limit])

  return {
    logs,
    summary,
    loading,
    error,
    refresh: fetchLogs,
    clearLogs,
  }
}
