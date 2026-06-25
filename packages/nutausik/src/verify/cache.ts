import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'

export interface VerifyCacheEntry {
  id: number
  taskSlug: string | null
  scope: string
  command: string
  exitCode: number
  summary: string | null
  filesHash: string
  ranAt: string
}

export function lookupRecent(be: SQLiteBackend, taskSlug: string, filesHash: string, ttlMinutes = 10): VerifyCacheEntry | undefined {
  const recent = crud.verificationRunRecent(be, taskSlug, filesHash, ttlMinutes)
  if (!recent) return undefined
  return {
    id: recent.id,
    taskSlug: recent.task_slug,
    scope: recent.scope,
    command: recent.command,
    exitCode: recent.exit_code,
    summary: recent.summary,
    filesHash: recent.files_hash,
    ranAt: recent.ran_at,
  }
}

export function recordRun(be: SQLiteBackend, taskSlug: string | null, scope: string, command: string, exitCode: number, filesHash: string, summary?: string | null, durationMs?: number | null): number {
  return crud.verificationRunAdd(be, taskSlug, scope, command, exitCode, filesHash, summary, durationMs)
}
