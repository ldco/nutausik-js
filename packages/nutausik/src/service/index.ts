import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import * as queries from '../backend/queries.js'

export * from './task.js'
export * from './session.js'
export * from './hierarchy.js'
export * from './knowledge.js'
export * from './validation.js'

export function getStatus(be: SQLiteBackend): Record<string, unknown> {
  const counts = queries.taskCounts(be)
  const current = crud.sessionCurrent(be)
  const vals = Object.values(counts) as number[]
  return {
    project: 'default',
    version: '0.1.0',
    tasks: {
      total: vals.reduce((a, b) => a + b, 0),
      ...counts,
    },
    session: current
      ? { active: true, id: current.id, started_at: current.started_at }
      : { active: false },
    epics: queries.epicCount(be),
    stories: queries.storyCount(be),
  }
}

export function formatStatus(be: SQLiteBackend): string {
  const s = getStatus(be)
  const tasks = s.tasks as Record<string, number>
  const session = s.session as Record<string, unknown>
  const lines = [
    `Tasks: ${tasks.total} total`,
    `  ${tasks.planning} planning`,
    `  ${tasks.active} active`,
    `  ${tasks.blocked} blocked`,
    `  ${tasks.review} review`,
    `  ${tasks.done} done`,
    '',
  ]
  if (session.active) {
    lines.push(`Session #${session.id}: active`)
  } else {
    lines.push('Session: none')
  }
  return lines.join('\n')
}
