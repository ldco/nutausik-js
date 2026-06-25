import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import { ServiceError, utcnowIso, safeSingleLine } from '../utils/helpers.js'
import { validateSlug, validateTaskAddInputs, validateContent } from './validation.js'

const LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  planning: ['active'],
  active: ['blocked', 'review', 'done'],
  blocked: ['active', 'done'],
  review: ['active', 'done'],
  done: [],
}

function requireStatusTransition(from: string, to: string): void {
  const allowed = LIFECYCLE_TRANSITIONS[from]
  if (!allowed?.includes(to)) {
    throw new ServiceError(`Cannot transition task from '${from}' to '${to}'. Allowed transitions from '${from}': ${(allowed ?? []).join(', ') || '(none)'}`)
  }
}

export function taskAdd(
  be: SQLiteBackend,
  slug: string,
  title: string,
  fields?: {
    storySlug?: string | null
    stack?: string | null
    complexity?: string | null
    role?: string | null
    goal?: string | null
    acceptanceCriteria?: string | null
    tier?: string | null
    callBudget?: number | null
    defectOf?: string | null
    scope?: string | null
    scopeExclude?: string | null
  },
): string {
  validateSlug(slug)
  validateTaskAddInputs(fields?.stack, fields?.complexity, fields?.callBudget, fields?.tier)

  const existing = crud.taskGet(be, slug)
  if (existing) throw new ServiceError(`Task '${slug}' already exists.`)

  let storyId: number | null = null
  if (fields?.storySlug) {
    const story = crud.storyGet(be, fields.storySlug)
    if (!story) throw new ServiceError(`Story '${fields.storySlug}' not found.`)
    storyId = story.id
  }

  if (fields?.defectOf) {
    const parent = crud.taskGet(be, fields.defectOf)
    if (!parent) throw new ServiceError(`Defect parent task '${fields.defectOf}' not found.`)
  }

  crud.taskAdd(be, slug, safeSingleLine(title), {
    story_id: storyId,
    stack: fields?.stack ?? null,
    complexity: (fields?.complexity as 'simple' | 'medium' | 'complex' | null) ?? null,
    role: fields?.role ?? null,
    goal: fields?.goal ?? null,
    acceptance_criteria: fields?.acceptanceCriteria ?? null,
    tier: (fields?.tier as 'trivial' | 'light' | 'moderate' | 'substantial' | 'deep' | null) ?? null,
    call_budget: fields?.callBudget ?? null,
    defect_of: fields?.defectOf ?? null,
    scope: fields?.scope ?? null,
    scope_exclude: fields?.scopeExclude ?? null,
  })

  return `Task '${slug}' created (status: planning).`
}

export function taskAddQuick(
  be: SQLiteBackend,
  title: string,
  goal?: string | null,
  role?: string | null,
  stack?: string | null,
  acceptance?: string | null,
): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'task'
  const uniq = `${slug}-${Date.now().toString(36)}`
  return taskAdd(be, uniq, title, { goal, role, stack, acceptanceCriteria: acceptance })
}

export function taskStart(be: SQLiteBackend, slug: string): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)

  if (task.status === 'active') return `Task '${slug}' is already active.`

  requireStatusTransition(task.status, 'active')

  if (!task.goal || !task.acceptance_criteria) {
    throw new ServiceError(
      `QG-0 BLOCKED: Task '${slug}' has no goal or acceptance criteria.\n` +
      `  Define both before starting: task_update('${slug}', goal='...', acceptance_criteria='...')`
    )
  }

  crud.taskUpdate(be, slug, {
    status: 'active',
    started_at: utcnowIso(),
    attempts: (task.attempts ?? 0) + 1,
  })

  crud.eventAdd(be, 'task', slug, 'status_changed', JSON.stringify({ from: task.status, to: 'active' }))

  return `Task '${slug}' started. QG-0 passed (goal + AC present).`
}

export function taskDone(be: SQLiteBackend, slug: string, acVerified = false): Record<string, unknown> {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)

  if (task.status === 'done') {
    return { ok: true, slug, message: `Task '${slug}' was already done.`, warnings: [] }
  }

  requireStatusTransition(task.status, 'done')

  if (!acVerified) {
    // check verification cache for recent run
    if (!crud.hasRecentVerification(be, slug)) {
      throw new ServiceError(
        `QG-2 BLOCKED: Task '${slug}' has no recent verification.\n` +
        `  Run verify (nutausik_verify) before closing.`
      )
    }
  }

  const blockingFailures: string[] = []
  const warnings: string[] = []

  if (!task.acceptance_criteria) warnings.push('Task has no acceptance criteria defined.')
  if (!task.goal) warnings.push('Task has no goal defined.')
  if (!task.plan) warnings.push('Task has no plan defined.')

  crud.taskUpdate(be, slug, {
    status: 'done',
    completed_at: utcnowIso(),
  })

  crud.eventAdd(be, 'task', slug, 'status_changed', JSON.stringify({ from: task.status, to: 'done' }))

  crud.taskLogAdd(be, slug, 'Task completed.', 'done')

  return {
    ok: true,
    slug,
    plan_complete: !!task.plan,
    ac_verified: true,
    gates_passed: blockingFailures.length === 0,
    blocking_failures: blockingFailures,
    warnings,
    cache_status: 'manual',
    evidence_logged: true,
  }
}

export function taskBlock(be: SQLiteBackend, slug: string): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)
  requireStatusTransition(task.status, 'blocked')
  crud.taskUpdate(be, slug, { status: 'blocked', blocked_at: utcnowIso() })
  crud.eventAdd(be, 'task', slug, 'status_changed', JSON.stringify({ from: task.status, to: 'blocked' }))
  return `Task '${slug}' blocked.`
}

export function taskUnblock(be: SQLiteBackend, slug: string): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)
  requireStatusTransition(task.status, 'active')
  crud.taskUpdate(be, slug, { status: 'active', blocked_at: null })
  crud.eventAdd(be, 'task', slug, 'status_changed', JSON.stringify({ from: task.status, to: 'active' }))
  return `Task '${slug}' unblocked.`
}

export function taskReview(be: SQLiteBackend, slug: string): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)
  requireStatusTransition(task.status, 'review')
  crud.taskUpdate(be, slug, { status: 'review' })
  crud.eventAdd(be, 'task', slug, 'status_changed', JSON.stringify({ from: task.status, to: 'review' }))
  return `Task '${slug}' moved to review.`
}

export function taskDelete(be: SQLiteBackend, slug: string): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)
  crud.taskDelete(be, slug)
  return `Task '${slug}' deleted.`
}

export function taskMove(be: SQLiteBackend, slug: string, newStorySlug: string): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)
  const story = crud.storyGet(be, newStorySlug)
  if (!story) throw new ServiceError(`Story '${newStorySlug}' not found.`)
  crud.taskUpdate(be, slug, { story_id: story.id })
  return `Task '${slug}' moved to story '${newStorySlug}'.`
}

export function taskClaim(be: SQLiteBackend, slug: string, agentId: string): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)
  crud.taskUpdate(be, slug, { claimed_by: agentId })
  crud.eventAdd(be, 'task', slug, 'claimed', undefined, agentId)
  return `Task '${slug}' claimed by ${agentId}.`
}

export function taskUnclaim(be: SQLiteBackend, slug: string): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)
  crud.taskUpdate(be, slug, { claimed_by: null })
  crud.eventAdd(be, 'task', slug, 'unclaimed')
  return `Task '${slug}' released.`
}

export function taskNext(be: SQLiteBackend, agentId?: string): string {
  const task = crud.taskNext(be, agentId)
  if (!task) return 'No available tasks.'
  return `Next task: ${task.slug} — ${task.title} (score: ${task.score ?? 'N/A'})`
}

export function taskLog(be: SQLiteBackend, slug: string, message: string, phase?: string | null): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)
  validateContent(message, 'Message')
  crud.taskLogAdd(be, slug, safeSingleLine(message), phase ?? null)
  return `Logged to task '${slug}'.`
}

export function taskUpdate(
  be: SQLiteBackend,
  slug: string,
  fields: Record<string, unknown>,
): string {
  const task = crud.taskGet(be, slug)
  if (!task) throw new ServiceError(`Task '${slug}' not found.`)

  const updateFields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) updateFields[k] = v
  }
  if (Object.keys(updateFields).length === 0) return 'Nothing to update.'
  crud.taskUpdate(be, slug, updateFields)
  return `Task '${slug}' updated.`
}
