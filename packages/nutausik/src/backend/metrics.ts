import type { SQLiteBackend } from './database.js'

export interface SessionMetrics {
  sessionId: number
  activeMinutes: number
  wallMinutes: number
  activeSeconds: number
  toolCalls: number
  tokensTotal: number
  costUsd: number
}

export function sessionActiveMinutes(be: SQLiteBackend, sessionId: number, idleThresholdSec = 300): number {
  const rows = be.db.prepare(
    'SELECT created_at FROM events WHERE entity_type = ? AND entity_id = ? ORDER BY created_at'
  ).all('session', String(sessionId)) as { created_at: string }[]

  if (!rows.length) return 0

  let totalSec = 0
  let lastTime = new Date(rows[0]!.created_at).getTime()
  for (let i = 1; i < rows.length; i++) {
    const currTime = new Date(rows[i]!.created_at).getTime()
    const gap = currTime - lastTime
    if (gap <= idleThresholdSec * 1000) {
      totalSec += gap / 1000
    }
    lastTime = currTime
  }
  return Math.round(totalSec / 60)
}

export function sessionMetrics(be: SQLiteBackend, sessionId: number): SessionMetrics | null {
  const row = be.db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as { id: number; started_at: string; ended_at: string | null } | undefined
  if (!row) return null

  const wallMs = row.ended_at
    ? new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()
    : Date.now() - new Date(row.started_at).getTime()

  const usage = be.db.prepare('SELECT * FROM session_usage_metrics WHERE session_id = ?').get(sessionId) as {
    tokens_total: number; cost_usd: number; tool_calls: number
  } | undefined

  return {
    sessionId: row.id,
    activeMinutes: sessionActiveMinutes(be, sessionId),
    wallMinutes: Math.round(wallMs / 60000),
    activeSeconds: 0,
    toolCalls: usage?.tool_calls ?? 0,
    tokensTotal: usage?.tokens_total ?? 0,
    costUsd: usage?.cost_usd ?? 0,
  }
}
