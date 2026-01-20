/**
 * Server-side honeypot log storage
 * In-memory storage for server-side honeypot routes
 */

export interface ServerHoneypotLog {
  id: string
  timestamp: Date
  ip: string
  userAgent: string
  path: string
  method: string
  headers?: Record<string, string | undefined>
}

// In-memory storage (resets on server restart)
const logs: ServerHoneypotLog[] = []
const MAX_LOGS = 1000

export function addServerHoneypotLog(log: Omit<ServerHoneypotLog, 'id'>): string {
  const id = crypto.randomUUID()
  const fullLog: ServerHoneypotLog = { ...log, id }
  logs.unshift(fullLog) // Add to beginning (newest first)

  // Keep only the most recent logs
  if (logs.length > MAX_LOGS) {
    logs.splice(MAX_LOGS)
  }

  console.log(`[HONEYPOT] Logged: ${log.ip} -> ${log.path}`)
  return id
}

export function getServerHoneypotLogs(limit = 100): ServerHoneypotLog[] {
  return logs.slice(0, limit)
}

export function getServerHoneypotLogsCount(): number {
  return logs.length
}

export function getServerUniqueIPs(): string[] {
  const ips = new Set(logs.map(log => log.ip))
  return Array.from(ips).sort()
}

export function clearServerHoneypotLogs(): void {
  logs.length = 0
  console.log('[HONEYPOT] All server logs cleared')
}

export function getServerIPStats(): Array<{ ip: string; count: number }> {
  const ipStats = new Map<string, number>()
  for (const log of logs) {
    ipStats.set(log.ip, (ipStats.get(log.ip) || 0) + 1)
  }
  return Array.from(ipStats.entries())
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
}

export function getServerPathStats(): Array<{ path: string; count: number }> {
  const pathStats = new Map<string, number>()
  for (const log of logs) {
    pathStats.set(log.path, (pathStats.get(log.path) || 0) + 1)
  }
  return Array.from(pathStats.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
}
