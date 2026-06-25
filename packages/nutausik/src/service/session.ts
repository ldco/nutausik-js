import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import { ServiceError } from '../utils/helpers.js'

export function sessionStart(be: SQLiteBackend): string {
  const current = crud.sessionCurrent(be)
  if (current) return `Session #${current.id} already active (started ${current.started_at}).`
  const id = crud.sessionStart(be)
  return `Session #${id} started.`
}

export function sessionEnd(be: SQLiteBackend): string {
  const current = crud.sessionCurrent(be)
  if (!current) return 'No active session to end.'
  crud.sessionEnd(be)
  return `Session #${current.id} ended.`
}

export function sessionCurrent(be: SQLiteBackend): string {
  const s = crud.sessionCurrent(be)
  if (!s) return 'No active session.'
  return `Session #${s.id} (started ${s.started_at})`
}

export function sessionList(be: SQLiteBackend): string {
  const list = crud.sessionList(be)
  if (!list.length) return 'No sessions.'
  return list.map(s => `#${s.id}: started ${s.started_at}${s.ended_at ? `, ended ${s.ended_at}` : ', active'}`).join('\n')
}

export function sessionExtend(be: SQLiteBackend, _minutes = 60): string {
  const current = crud.sessionCurrent(be)
  if (!current) throw new ServiceError('No active session to extend.')
  crud.eventAdd(be, 'session', String(current.id), 'session_extend', JSON.stringify({ minutes: _minutes }))
  return `Session #${current.id} extended by ${_minutes} min.`
}
