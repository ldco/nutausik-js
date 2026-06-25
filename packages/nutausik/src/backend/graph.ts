import type { SQLiteBackend } from './database.js'
import { utcnowIso } from '../utils/helpers.js'
import type { MemoryEdgeRow } from '../types/index.js'

export function memoryEdgeAdd(
  be: SQLiteBackend,
  sourceType: string, sourceId: number,
  targetType: string, targetId: number,
  relation: string,
  confidence = 1.0,
  createdBy?: string | null,
): number {
  const now = utcnowIso()
  const result = be.db.prepare(
    'INSERT INTO memory_edges (source_type, source_id, target_type, target_id, relation, confidence, created_by, valid_from, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(sourceType, sourceId, targetType, targetId, relation, confidence, createdBy ?? null, now, now)
  return Number(result.lastInsertRowid)
}

export function memoryEdgeList(be: SQLiteBackend): MemoryEdgeRow[] {
  return be.db.prepare('SELECT * FROM memory_edges WHERE valid_to IS NULL ORDER BY created_at DESC').all() as MemoryEdgeRow[]
}

export function memoryEdgeDelete(be: SQLiteBackend, id: number): void {
  be.db.prepare('UPDATE memory_edges SET valid_to = ? WHERE id = ?').run(utcnowIso(), id)
}

export function memoryEdgesFor(be: SQLiteBackend, nodeType: string, nodeId: number): MemoryEdgeRow[] {
  return be.db.prepare(
    'SELECT * FROM memory_edges WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?) AND valid_to IS NULL ORDER BY created_at DESC'
  ).all(nodeType, nodeId, nodeType, nodeId) as MemoryEdgeRow[]
}
