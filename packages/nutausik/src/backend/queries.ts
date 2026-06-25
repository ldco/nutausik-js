import type { SQLiteBackend } from './database.js'
import type { TaskRow, EventRow } from '../types/index.js'

export function tasksByStatus(be: SQLiteBackend, status: string): number {
  const row = be.db.prepare('SELECT COUNT(*) as cnt FROM tasks WHERE status = ?').get(status) as { cnt: number }
  return row.cnt
}

export function taskCounts(be: SQLiteBackend): Record<string, number> {
  const rows = be.db.prepare('SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status').all() as { status: string; cnt: number }[]
  const counts: Record<string, number> = { planning: 0, active: 0, blocked: 0, review: 0, done: 0 }
  for (const r of rows) counts[r.status] = r.cnt
  return counts
}

export function epicCount(be: SQLiteBackend): number {
  const row = be.db.prepare('SELECT COUNT(*) as cnt FROM epics').get() as { cnt: number }
  return row.cnt
}

export function storyCount(be: SQLiteBackend): number {
  const row = be.db.prepare('SELECT COUNT(*) as cnt FROM stories').get() as { cnt: number }
  return row.cnt
}

export function sessionActiveCount(be: SQLiteBackend): number {
  const row = be.db.prepare("SELECT COUNT(*) as cnt FROM sessions WHERE ended_at IS NULL").get() as { cnt: number }
  return row.cnt
}

export function tasksForStory(be: SQLiteBackend, storySlug: string): TaskRow[] {
  return be.db.prepare('SELECT t.* FROM tasks t JOIN stories s ON t.story_id = s.id WHERE s.slug = ? ORDER BY t.created_at DESC').all(storySlug) as TaskRow[]
}

export function tasksForEpic(be: SQLiteBackend, epicSlug: string): TaskRow[] {
  return be.db.prepare('SELECT t.* FROM tasks t JOIN stories s ON t.story_id = s.id JOIN epics e ON s.epic_id = e.id WHERE e.slug = ? ORDER BY t.created_at DESC').all(epicSlug) as TaskRow[]
}

export function eventsByEntity(be: SQLiteBackend, entityType: string, entityId: string, limit = 50): EventRow[] {
  return be.db.prepare('SELECT * FROM events WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ?').all(entityType, entityId, limit) as EventRow[]
}

export function findProjectDir(be: SQLiteBackend): string {
  return be.dbPath.replace('/\.nutausik/nutausik.db', '')
}

export function dbSize(be: SQLiteBackend): { pageCount: number; pageSize: number } {
  const pc = be.db.pragma('page_count') as { page_count: number }[]
  const ps = be.db.pragma('page_size') as { page_size: number }[]
  return { pageCount: pc[0]?.page_count ?? 0, pageSize: ps[0]?.page_size ?? 0 }
}
