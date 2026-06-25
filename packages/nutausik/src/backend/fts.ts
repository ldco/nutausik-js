import type { SQLiteBackend } from './database.js'

export interface FtsResult {
  rank: number
  table: string
  slug?: string
  title?: string
  content?: string
}

export function ftsSearch(be: SQLiteBackend, query: string, limit = 10): FtsResult[] {
  const sanitized = query.replace(/[^\w\s-]/g, ' ').trim()
  if (!sanitized) return []

  const results: FtsResult[] = []

  const taskRows = be.db.prepare(
    `SELECT rank, slug, title, goal FROM fts_tasks WHERE fts_tasks MATCH ? ORDER BY rank LIMIT ?`
  ).all(sanitized, limit) as { rank: number; slug: string; title: string; goal: string | null }[]
  for (const r of taskRows) {
    results.push({ rank: r.rank, table: 'tasks', slug: r.slug, title: r.title, content: r.goal ?? undefined })
  }

  const memRows = be.db.prepare(
    `SELECT rank, title, content FROM fts_memory WHERE fts_memory MATCH ? ORDER BY rank LIMIT ?`
  ).all(sanitized, limit) as { rank: number; title: string; content: string }[]
  for (const r of memRows) {
    results.push({ rank: r.rank, table: 'memory', title: r.title, content: r.content })
  }

  const decRows = be.db.prepare(
    `SELECT rank, decision, rationale FROM fts_decisions WHERE fts_decisions MATCH ? ORDER BY rank LIMIT ?`
  ).all(sanitized, limit) as { rank: number; decision: string; rationale: string | null }[]
  for (const r of decRows) {
    results.push({ rank: r.rank, table: 'decisions', title: r.decision, content: r.rationale ?? undefined })
  }

  return results.sort((a, b) => a.rank - b.rank).slice(0, limit)
}
