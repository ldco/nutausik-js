import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import { ServiceError, safeSingleLine } from '../utils/helpers.js'
import { validateLength } from './validation.js'

const VALID_MEMORY_TYPES = ['pattern', 'gotcha', 'convention', 'context', 'dead_end'] as const

export function memoryAdd(be: SQLiteBackend, type: string, title: string, content: string, tags?: string | null, taskSlug?: string | null): string {
  if (!(VALID_MEMORY_TYPES as readonly string[]).includes(type)) {
    throw new ServiceError(`Invalid memory type '${type}'. Valid: ${VALID_MEMORY_TYPES.join(', ')}`)
  }
  validateLength(title, 'Title')
  validateLength(content, 'Content')
  if (taskSlug) {
    const task = crud.taskGet(be, taskSlug)
    if (!task) throw new ServiceError(`Task '${taskSlug}' not found.`)
  }
  const id = crud.memoryAdd(be, type, safeSingleLine(title), content, tags ?? null, taskSlug ?? null)
  return `Memory #${id} added (${type}).`
}

export function memoryGet(be: SQLiteBackend, id: number) {
  const mem = crud.memoryGet(be, id)
  if (!mem) throw new ServiceError(`Memory #${id} not found.`)
  return mem
}

export function memoryList(be: SQLiteBackend, options?: { type?: string; taskSlug?: string }) {
  return crud.memoryList(be, options)
}

export function memoryUpdate(be: SQLiteBackend, id: number, fields: { title?: string; content?: string; tags?: string }): string {
  memoryGet(be, id)
  crud.memoryUpdate(be, id, fields)
  return `Memory #${id} updated.`
}

export function memoryDelete(be: SQLiteBackend, id: number): string {
  memoryGet(be, id)
  crud.memoryDelete(be, id)
  return `Memory #${id} deleted.`
}

export async function memorySearch(be: SQLiteBackend, query: string): Promise<string> {
  const { ftsSearch } = await import('../backend/fts.js')
  const results = ftsSearch(be, query)
  if (!results.length) return 'No results found.'
  return results.map(r => `[${r.table}] ${r.title ?? r.slug ?? ''} (rank: ${r.rank.toFixed(1)})`).join('\n')
}

export function memoryCompact(be: SQLiteBackend, lastN = 10): string {
  const items = crud.memoryList(be)
  const recent = items.slice(0, lastN)
  if (!recent.length) return 'No memory entries.'
  return recent.map(m => `- [${m.type}] ${m.title}: ${m.content.slice(0, 200)}`).join('\n')
}
