import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import * as queries from '../backend/queries.js'

/**
 * context_inject — generates a context block for injection into agent prompts.
 *
 * Phase 2: Enhanced TODO injection. Shows:
 *  - Active task (full details: goal, AC, plan steps)
 *  - TODO list (all planning tasks)
 *  - In Review list (tasks awaiting verification)
 *  - Blocked tasks
 *  - Recent memory (3)
 *  - Active decisions (2)
 *  - Task summary bar
 */
export function contextInject(be: SQLiteBackend): string {
  const blocks: string[] = ['<nutausik_context>']
  const allTasks = crud.taskList(be, {})

  // ── Active task ──────────────────────────────────────────────
  const activeTask = allTasks.find((t) => t.status === 'active')
  if (activeTask) {
    blocks.push(`Active task: ${activeTask.slug} — ${activeTask.title}`)
    if (activeTask.goal) blocks.push(`  Goal: ${activeTask.goal}`)
    if (activeTask.acceptance_criteria) blocks.push(`  AC: ${activeTask.acceptance_criteria}`)
    const steps = activeTask.plan ? JSON.parse(activeTask.plan) : []
    if (Array.isArray(steps) && steps.length > 0) {
      blocks.push(`  Plan steps:`)
      steps.forEach((s: string, i: number) => blocks.push(`    ${i + 1}. ${s}`))
    }
  }

  // ── TODO: Planning tasks ─────────────────────────────────────
  const planningTasks = allTasks.filter((t) => t.status === 'planning')
  if (planningTasks.length > 0) {
    blocks.push(`TODO (${planningTasks.length}):`)
    for (const t of planningTasks) {
      const info = t.stack ? ` [${t.stack}]` : ''
      blocks.push(`  - ${t.slug}: ${t.title}${info}`)
    }
  }

  // ── In Review ────────────────────────────────────────────────
  const reviewTasks = allTasks.filter((t) => t.status === 'review')
  if (reviewTasks.length > 0) {
    blocks.push(`In Review (${reviewTasks.length}):`)
    for (const t of reviewTasks) {
      blocks.push(`  - ${t.slug}: ${t.title}`)
    }
  }

  // ── Blocked ──────────────────────────────────────────────────
  const blockedTasks = allTasks.filter((t) => t.status === 'blocked')
  if (blockedTasks.length > 0) {
    blocks.push(`Blocked (${blockedTasks.length}):`)
    for (const t of blockedTasks) {
      blocks.push(`  - ${t.slug}: ${t.title}`)
    }
  }

  // ── Task summary bar ─────────────────────────────────────────
  const counts = queries.taskCounts(be)
  const c = { planning: 0, active: 0, blocked: 0, review: 0, done: 0, done_with_concerns: 0, ...counts } as { planning: number; active: number; blocked: number; review: number; done: number; done_with_concerns: number }
  const total = c.planning + c.active + c.blocked + c.review + c.done + c.done_with_concerns
  if (total > 0) {
    const parts: string[] = []
    if (c.planning > 0) parts.push(`${c.planning} planning`)
    if (c.active > 0) parts.push(`${c.active} active`)
    if (c.blocked > 0) parts.push(`${c.blocked} blocked`)
    if (c.review > 0) parts.push(`${c.review} review`)
    if (c.done_with_concerns > 0) parts.push(`${c.done_with_concerns} done-with-concerns`)
    if (c.done > 0) parts.push(`${c.done} done`)
    blocks.push(`Tasks: ${total} total (${parts.join(', ')})`)
  }

  // ── Recent memory (3) ────────────────────────────────────────
  const memories = crud.memoryList(be, {})
  const recentMemories = memories.slice(-3).reverse()
  if (recentMemories.length > 0) {
    blocks.push('Recent memory:')
    for (const m of recentMemories) {
      const label = m.type === 'pattern' ? '📐' : m.type === 'gotcha' ? '⚠️' : m.type === 'dead_end' ? '💀' : '📝'
      blocks.push(`  ${label} ${m.title}${m.tags ? ` (tags: ${m.tags})` : ''}`)
    }
  }

  // ── Active decisions (2) ─────────────────────────────────────
  const decisions = crud.decisionList(be)
  const activeDecisions = decisions.slice(-2)
  if (activeDecisions.length > 0) {
    blocks.push('Active decisions:')
    for (const d of activeDecisions) {
      blocks.push(`  📋 ${d.decision}`)
    }
  }

  blocks.push('</nutausik_context>')
  return blocks.join('\n')
}

/**
 * getActiveTaskPlan — returns the plan steps of the active task, if any.
 * Used by coherence_check to validate against actual plan steps.
 */
export function getActiveTaskPlan(be: SQLiteBackend): string[] {
  const allTasks = crud.taskList(be, {})
  const activeTask = allTasks.find((t) => t.status === 'active')
  if (!activeTask?.plan) return []
  try {
    const steps = JSON.parse(activeTask.plan)
    return Array.isArray(steps) ? steps.map(String) : []
  } catch {
    return []
  }
}

export function getActiveTask(be: SQLiteBackend): object | null {
  const allTasks = crud.taskList(be, {})
  return allTasks.find((t) => t.status === 'active') ?? null
}
