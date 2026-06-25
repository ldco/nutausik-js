import type { SQLiteBackend } from './database.js'
import { utcnowIso } from '../utils/helpers.js'
import type {
  EpicRow, StoryRow, TaskRow, SessionRow, DecisionRow, MemoryRow,
  ExplorationRow, EventRow, RoleRow, TaskLogRow,
  VerificationRunRow,
} from '../types/index.js'

// ── Meta ──────────────────────────────────────────────────────────────

export function metaGet(be: SQLiteBackend, key: string): string | undefined {
  const row = be.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value
}

export function metaSet(be: SQLiteBackend, key: string, value: string): void {
  be.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value)
}

export function metaIncrement(be: SQLiteBackend, key: string): void {
  be.db.prepare(`INSERT INTO meta (key, value) VALUES (?, 1)
    ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`).run(key)
}

// ── Epics ─────────────────────────────────────────────────────────────

export function epicAdd(be: SQLiteBackend, slug: string, title: string, description?: string | null, status?: string): string {
  const now = utcnowIso()
  be.db.prepare('INSERT INTO epics (slug, title, status, description, created_at) VALUES (?, ?, ?, ?, ?)').run(slug, title, status ?? 'active', description ?? null, now)
  return `Epic '${slug}' created.`
}

export function epicGet(be: SQLiteBackend, slug: string): EpicRow | undefined {
  return be.db.prepare('SELECT * FROM epics WHERE slug = ?').get(slug) as EpicRow | undefined
}

export function epicList(be: SQLiteBackend, status?: string): EpicRow[] {
  if (status) return be.db.prepare('SELECT * FROM epics WHERE status = ? ORDER BY created_at DESC').all(status) as EpicRow[]
  return be.db.prepare('SELECT * FROM epics ORDER BY created_at DESC').all() as EpicRow[]
}

export function epicUpdate(be: SQLiteBackend, slug: string, fields: Record<string, unknown>): string {
  const allowed = new Set(['title', 'status', 'description'])
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.has(k)) { sets.push(`${k} = ?`); vals.push(v) }
  }
  if (!sets.length) return 'Nothing to update.'
  vals.push(slug)
  be.db.prepare(`UPDATE epics SET ${sets.join(', ')} WHERE slug = ?`).run(...vals)
  return `Epic '${slug}' updated.`
}

export function epicDelete(be: SQLiteBackend, slug: string): string {
  be.db.prepare('DELETE FROM epics WHERE slug = ?').run(slug)
  return `Epic '${slug}' deleted.`
}

// ── Stories ───────────────────────────────────────────────────────────

export function storyAdd(be: SQLiteBackend, epicSlug: string, slug: string, title: string, description?: string | null): string {
  const epic = epicGet(be, epicSlug)
  if (!epic) throw new Error(`Epic '${epicSlug}' not found`)
  const now = utcnowIso()
  be.db.prepare('INSERT INTO stories (epic_id, slug, title, description, created_at) VALUES (?, ?, ?, ?, ?)').run(epic.id, slug, title, description ?? null, now)
  return `Story '${slug}' created in epic '${epicSlug}'.`
}

export function storyGet(be: SQLiteBackend, slug: string): StoryRow | undefined {
  return be.db.prepare('SELECT * FROM stories WHERE slug = ?').get(slug) as StoryRow | undefined
}

export function storyList(be: SQLiteBackend, options?: { epic?: string; status?: string }): StoryRow[] {
  const conditions: string[] = []
  const vals: unknown[] = []
  if (options?.epic) {
    const epic = epicGet(be, options.epic)
    if (epic) { conditions.push('epic_id = ?'); vals.push(epic.id) }
  }
  if (options?.status) { conditions.push('status = ?'); vals.push(options.status) }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  return be.db.prepare(`SELECT * FROM stories ${where} ORDER BY created_at DESC`).all(...vals) as StoryRow[]
}

export function storyUpdate(be: SQLiteBackend, slug: string, fields: Record<string, unknown>): string {
  const allowed = new Set(['title', 'status', 'description'])
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.has(k)) { sets.push(`${k} = ?`); vals.push(v) }
  }
  if (!sets.length) return 'Nothing to update.'
  vals.push(slug)
  be.db.prepare(`UPDATE stories SET ${sets.join(', ')} WHERE slug = ?`).run(...vals)
  return `Story '${slug}' updated.`
}

export function storyDelete(be: SQLiteBackend, slug: string): string {
  be.db.prepare('DELETE FROM stories WHERE slug = ?').run(slug)
  return `Story '${slug}' deleted.`
}

// ── Tasks ─────────────────────────────────────────────────────────────

const TASK_INSERT_COLS = ['slug', 'story_id', 'title', 'status', 'stack', 'complexity', 'role', 'goal', 'acceptance_criteria', 'scope', 'scope_exclude', 'scope_paths', 'scope_tools', 'tier', 'call_budget', 'cost_budget_usd', 'token_budget', 'defect_of', 'relevant_files', 'created_at', 'updated_at']

export function taskAdd(be: SQLiteBackend, slug: string, title: string, fields?: Partial<Pick<TaskRow, 'story_id' | 'stack' | 'complexity' | 'role' | 'goal' | 'acceptance_criteria' | 'tier' | 'call_budget' | 'defect_of' | 'scope' | 'scope_exclude'>>): void {
  const now = utcnowIso()
  const f = fields ?? {}
  const vals: unknown[] = [slug, f.story_id ?? null, title, 'planning', f.stack ?? null, f.complexity ?? null, f.role ?? null, f.goal ?? null, f.acceptance_criteria ?? null, f.scope ?? null, f.scope_exclude ?? null, null, null, f.tier ?? null, f.call_budget ?? null, null, null, f.defect_of ?? null, null, now, now]
  be.db.prepare(`INSERT INTO tasks (${TASK_INSERT_COLS.join(',')}) VALUES (${TASK_INSERT_COLS.map(() => '?').join(',')})`).run(...vals)
}

export function taskGet(be: SQLiteBackend, slug: string): TaskRow | undefined {
  return be.db.prepare('SELECT * FROM tasks WHERE slug = ?').get(slug) as TaskRow | undefined
}

const TASK_UPDATE_FIELDS = new Set(['title', 'status', 'stack', 'complexity', 'role', 'score', 'goal', 'plan', 'notes', 'acceptance_criteria', 'scope', 'scope_exclude', 'rollback_plan', 'scope_paths', 'scope_tools', 'risk_score', 'risk_json', 'relevant_files', 'started_at', 'completed_at', 'blocked_at', 'attempts', 'claimed_by', 'defect_of', 'call_budget', 'call_actual', 'cost_budget_usd', 'cost_actual_usd', 'token_budget', 'tokens_actual', 'tier', 'story_id', 'started_model_id', 'started_model_version', 'done_model_id', 'done_model_version', 'model_mismatch'])

export function taskUpdate(be: SQLiteBackend, slug: string, fields: Partial<TaskRow>): void {
  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, v] of Object.entries(fields)) {
    if (TASK_UPDATE_FIELDS.has(k)) { sets.push(`${k} = ?`); vals.push(v) }
  }
  if (!sets.length) return
  sets.push('updated_at = ?')
  vals.push(utcnowIso())
  vals.push(slug)
  be.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE slug = ?`).run(...vals)
}

export function taskList(be: SQLiteBackend, options?: { status?: string; story?: string; epic?: string; role?: string; stack?: string }): TaskRow[] {
  const conditions: string[] = ['archived_at IS NULL']
  const vals: unknown[] = []
  if (options?.status) {
    const statuses = options.status.split(',').map(s => s.trim())
    conditions.push(`status IN (${statuses.map(() => '?').join(',')})`)
    vals.push(...statuses)
  }
  if (options?.story) { conditions.push('story_id = (SELECT id FROM stories WHERE slug = ?)'); vals.push(options.story) }
  if (options?.epic) { conditions.push('story_id IN (SELECT id FROM stories WHERE epic_id = (SELECT id FROM epics WHERE slug = ?))'); vals.push(options.epic) }
  if (options?.role) { conditions.push('role = ?'); vals.push(options.role) }
  if (options?.stack) { conditions.push('stack = ?'); vals.push(options.stack) }
  return be.db.prepare(`SELECT * FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`).all(...vals) as TaskRow[]
}

export function taskDelete(be: SQLiteBackend, slug: string): void {
  be.db.prepare('DELETE FROM tasks WHERE slug = ?').run(slug)
}

export function taskNext(be: SQLiteBackend, agentId?: string): TaskRow | undefined {
  if (agentId) return be.db.prepare("SELECT * FROM tasks WHERE status = 'planning' AND (claimed_by IS NULL OR claimed_by = ?) ORDER BY score DESC NULLS LAST, created_at ASC LIMIT 1").get(agentId) as TaskRow | undefined
  return be.db.prepare("SELECT * FROM tasks WHERE status = 'planning' ORDER BY score DESC NULLS LAST, created_at ASC LIMIT 1").get() as TaskRow | undefined
}

// ── Sessions ──────────────────────────────────────────────────────────

export function sessionStart(be: SQLiteBackend): number {
  const now = utcnowIso()
  be.db.prepare('UPDATE sessions SET ended_at = ? WHERE ended_at IS NULL').run(now)
  const result = be.db.prepare('INSERT INTO sessions (started_at) VALUES (?)').run(now)
  return Number(result.lastInsertRowid)
}

export function sessionEnd(be: SQLiteBackend): void {
  const now = utcnowIso()
  be.db.prepare('UPDATE sessions SET ended_at = ? WHERE ended_at IS NULL').run(now)
}

export function sessionCurrent(be: SQLiteBackend): SessionRow | undefined {
  return be.db.prepare("SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1").get() as SessionRow | undefined
}

export function sessionList(be: SQLiteBackend, limit = 20): SessionRow[] {
  return be.db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?').all(limit) as SessionRow[]
}

export function sessionGet(be: SQLiteBackend, id: number): SessionRow | undefined {
  return be.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined
}

// ── Decisions ─────────────────────────────────────────────────────────

export function decisionAdd(be: SQLiteBackend, decision: string, taskSlug?: string | null, rationale?: string | null): string {
  const now = utcnowIso()
  be.db.prepare('INSERT INTO decisions (decision, task_slug, rationale, created_at) VALUES (?, ?, ?, ?)').run(decision, taskSlug ?? null, rationale ?? null, now)
  return `Decision recorded: ${decision}`
}

export function decisionList(be: SQLiteBackend, taskSlug?: string): DecisionRow[] {
  if (taskSlug) return be.db.prepare('SELECT * FROM decisions WHERE task_slug = ? ORDER BY created_at DESC').all(taskSlug) as DecisionRow[]
  return be.db.prepare('SELECT * FROM decisions ORDER BY created_at DESC').all() as DecisionRow[]
}

// ── Memory ────────────────────────────────────────────────────────────

export function memoryAdd(be: SQLiteBackend, type: string, title: string, content: string, tags?: string | null, taskSlug?: string | null): number {
  const now = utcnowIso()
  const result = be.db.prepare('INSERT INTO memory (type, title, content, tags, task_slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(type, title, content, tags ?? null, taskSlug ?? null, now, now)
  return Number(result.lastInsertRowid)
}

export function memoryGet(be: SQLiteBackend, id: number): MemoryRow | undefined {
  return be.db.prepare('SELECT * FROM memory WHERE id = ?').get(id) as MemoryRow | undefined
}

export function memoryList(be: SQLiteBackend, options?: { type?: string; taskSlug?: string; archived?: boolean }): MemoryRow[] {
  const conditions: string[] = []
  const vals: unknown[] = []
  if (options?.type) { conditions.push('type = ?'); vals.push(options.type) }
  if (options?.taskSlug) { conditions.push('task_slug = ?'); vals.push(options.taskSlug) }
  if (!options?.archived) conditions.push('archived_at IS NULL')
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  return be.db.prepare(`SELECT * FROM memory ${where} ORDER BY created_at DESC`).all(...vals) as MemoryRow[]
}

export function memoryUpdate(be: SQLiteBackend, id: number, fields: Record<string, unknown>): void {
  const sets: string[] = []
  const vals: unknown[] = []
  const allowed = new Set(['title', 'content', 'tags'])
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.has(k)) { sets.push(`${k} = ?`); vals.push(v) }
  }
  if (!sets.length) return
  sets.push('updated_at = ?')
  vals.push(utcnowIso())
  vals.push(id)
  be.db.prepare(`UPDATE memory SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
}

export function memoryDelete(be: SQLiteBackend, id: number): void {
  be.db.prepare('DELETE FROM memory WHERE id = ?').run(id)
}

// ── Events ────────────────────────────────────────────────────────────

export function eventAdd(be: SQLiteBackend, entityType: string, entityId: string, action: string, details?: string | null, actor?: string | null): number {
  const now = utcnowIso()
  const result = be.db.prepare('INSERT INTO events (entity_type, entity_id, action, actor, details, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(entityType, entityId, action, actor ?? null, details ?? null, now)
  return Number(result.lastInsertRowid)
}

export function eventList(be: SQLiteBackend, entityType?: string, entityId?: string, limit = 50): EventRow[] {
  const conditions: string[] = []
  const vals: unknown[] = []
  if (entityType) { conditions.push('entity_type = ?'); vals.push(entityType) }
  if (entityId) { conditions.push('entity_id = ?'); vals.push(entityId) }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  return be.db.prepare(`SELECT * FROM events ${where} ORDER BY created_at DESC LIMIT ?`).all(...vals, limit) as EventRow[]
}

// ── Explorations ──────────────────────────────────────────────────────

export function explorationAdd(be: SQLiteBackend, title: string, taskSlug?: string | null, timeLimitMin = 30): number {
  const now = utcnowIso()
  const result = be.db.prepare('INSERT INTO explorations (title, task_slug, time_limit_min, started_at, created_at) VALUES (?, ?, ?, ?, ?)').run(title, taskSlug ?? null, timeLimitMin, now, now)
  return Number(result.lastInsertRowid)
}

export function explorationList(be: SQLiteBackend, taskSlug?: string): ExplorationRow[] {
  if (taskSlug) return be.db.prepare('SELECT * FROM explorations WHERE task_slug = ? ORDER BY created_at DESC').all(taskSlug) as ExplorationRow[]
  return be.db.prepare('SELECT * FROM explorations ORDER BY created_at DESC').all() as ExplorationRow[]
}

// ── Roles ─────────────────────────────────────────────────────────────

export function roleAdd(be: SQLiteBackend, slug: string, title: string, description?: string | null): string {
  const now = utcnowIso()
  be.db.prepare('INSERT INTO roles (slug, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(slug, title, description ?? null, now, now)
  return `Role '${slug}' created.`
}

export function roleGet(be: SQLiteBackend, slug: string): RoleRow | undefined {
  return be.db.prepare('SELECT * FROM roles WHERE slug = ?').get(slug) as RoleRow | undefined
}

export function roleList(be: SQLiteBackend): RoleRow[] {
  return be.db.prepare('SELECT * FROM roles ORDER BY slug').all() as RoleRow[]
}

export function roleDelete(be: SQLiteBackend, slug: string): void {
  be.db.prepare('DELETE FROM roles WHERE slug = ?').run(slug)
}

// ── Verification Runs ──────────────────────────────────────────────────

export function verificationRunAdd(be: SQLiteBackend, taskSlug: string | null, scope: string, command: string, exitCode: number, filesHash: string, summary?: string | null, durationMs?: number | null): number {
  const now = utcnowIso()
  const result = be.db.prepare('INSERT INTO verification_runs (task_slug, scope, command, exit_code, summary, files_hash, ran_at, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(taskSlug, scope, command, exitCode, summary ?? null, filesHash, now, durationMs ?? null)
  return Number(result.lastInsertRowid)
}

export function verificationRunRecent(be: SQLiteBackend, taskSlug: string, filesHash: string, ttlMinutes = 10): VerificationRunRow | undefined {
  return be.db.prepare(`SELECT * FROM verification_runs WHERE task_slug = ? AND files_hash = ? AND exit_code = 0 AND ran_at >= datetime('now', ?)`).get(taskSlug, filesHash, `-${ttlMinutes} minutes`) as VerificationRunRow | undefined
}

export function hasRecentVerification(be: SQLiteBackend, taskSlug: string, ttlMinutes = 30): boolean {
  const row = be.db.prepare(`SELECT 1 FROM verification_runs WHERE task_slug = ? AND exit_code = 0 AND ran_at >= datetime('now', ?)`).get(taskSlug, `-${ttlMinutes} minutes`) as { '1': number } | undefined
  return !!row
}


// ── Task Logs ─────────────────────────────────────────────────────────

export function taskLogAdd(be: SQLiteBackend, taskSlug: string, message: string, phase?: string | null): number {
  const now = utcnowIso()
  const result = be.db.prepare('INSERT INTO task_logs (task_slug, message, phase, created_at) VALUES (?, ?, ?, ?)').run(taskSlug, message, phase ?? null, now)
  return Number(result.lastInsertRowid)
}

export function taskLogList(be: SQLiteBackend, taskSlug: string, phase?: string): TaskLogRow[] {
  if (phase) return be.db.prepare('SELECT * FROM task_logs WHERE task_slug = ? AND phase = ? ORDER BY created_at').all(taskSlug, phase) as TaskLogRow[]
  return be.db.prepare('SELECT * FROM task_logs WHERE task_slug = ? ORDER BY created_at').all(taskSlug) as TaskLogRow[]
}

// ── Reasoning Steps ───────────────────────────────────────────────────

export function reasoningStepAdd(be: SQLiteBackend, taskSlug: string, seq: number, kind: string, content: string): number {
  const now = utcnowIso()
  const result = be.db.prepare('INSERT INTO reasoning_steps (task_slug, seq, kind, content, created_at) VALUES (?, ?, ?, ?, ?)').run(taskSlug, seq, kind, content, now)
  return Number(result.lastInsertRowid)
}
