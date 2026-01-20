import { NextRequest, NextResponse } from 'next/server'
import {
  getServerHoneypotLogs,
  getServerUniqueIPs,
  getServerHoneypotLogsCount,
  getServerIPStats,
  getServerPathStats,
  clearServerHoneypotLogs,
  addServerHoneypotLog,
} from '@/lib/honeypot-server-logs'

export const dynamic = 'force-dynamic'

/**
 * POST: Log honeypot access (also supports logging from client-side)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              request.headers.get('x-real-ip') ||
              body.ip ||
              'unknown'

    const userAgent = request.headers.get('user-agent') || body.userAgent || 'unknown'

    const logEntry = {
      timestamp: new Date(),
      ip,
      userAgent,
      path: body.path || 'unknown',
      method: body.method || 'POST',
      headers: body.headers,
      query: body.query,
      body: body.data || body.body,
    }

    const id = addServerHoneypotLog(logEntry)

    console.log(`[HONEYPOT] Logged access: ${ip} -> ${logEntry.path} (${id})`)

    return NextResponse.json({
      success: true,
      id,
      logged: true,
      message: 'Honeypot access logged'
    })
  } catch (error) {
    console.error('[HONEYPOT] Failed to log access:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log access' },
      { status: 500 }
    )
  }
}

/**
 * GET: Retrieve all honeypot logs for settings display
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    const [logs, uniqueIPs, totalCount, topIPs, topPaths] = [
      getServerHoneypotLogs(limit),
      getServerUniqueIPs(),
      getServerHoneypotLogsCount(),
      getServerIPStats().slice(0, 10),
      getServerPathStats().slice(0, 10),
    ]

    return NextResponse.json({
      success: true,
      logs,
      summary: {
        total: totalCount,
        uniqueIPs: uniqueIPs.length,
        topIPs,
        topPaths,
      },
    })
  } catch (error) {
    console.error('[HONEYPOT] Failed to retrieve logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve logs',
        logs: [],
        summary: { total: 0, uniqueIPs: 0, topIPs: [], topPaths: [] }
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Clear honeypot logs
 */
export async function DELETE() {
  try {
    clearServerHoneypotLogs()

    return NextResponse.json({
      success: true,
      message: 'All honeypot logs cleared'
    })
  } catch (error) {
    console.error('[HONEYPOT] Failed to clear logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear logs' },
      { status: 500 }
    )
  }
}
