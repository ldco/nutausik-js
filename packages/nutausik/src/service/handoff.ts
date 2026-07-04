import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import { ServiceError } from '../utils/helpers.js'

interface HandoffData {
  session_id: string
  task_slug?: string
  summary: string
  last_message?: string
  state: Record<string, string>
  created_at: string
}

/**
 * handoff_save — saves handoff data for the next session.
 */
export function handoffSave(be: SQLiteBackend, data: HandoffData): string {
  if (!data.session_id) throw new ServiceError('session_id is required')
  if (!data.summary) throw new ServiceError('summary is required')

  // Store handoff in meta table (slug = "handoff:{session_id}")
  const slug = `handoff:${data.session_id}`
  const content = JSON.stringify({
    ...data,
    state: data.state ?? {},
    created_at: new Date().toISOString(),
  })

  // Upsert: try to update existing, or create new
  const existing = crud.metaGet(be, slug)
  if (existing) {
    crud.metaSet(be, slug, content)
  } else {
    crud.metaSet(be, slug, content)
  }

  return `Handoff saved for session '${data.session_id}'.`
}

/**
 * handoff_load — loads handoff data for a session.
 */
export function handoffLoad(be: SQLiteBackend, sessionID?: string): string {
  // If sessionID is given, load specific handoff
  if (sessionID) {
    const slug = `handoff:${sessionID}`
    const data = crud.metaGet(be, slug)
    if (!data) return `No handoff found for session '${sessionID}'.`
    return data
  }

  // Otherwise, find the most recent handoff
  const rows = be.db.prepare("SELECT key, value FROM meta WHERE key LIKE 'handoff:%' ORDER BY rowid DESC LIMIT 1").all() as { key: string; value: string }[]
  if (rows.length === 0) return 'No handoff data found.'
  return rows[0]!.value
}
