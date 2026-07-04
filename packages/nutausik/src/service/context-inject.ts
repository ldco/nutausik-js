import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'

/**
 * context_inject — generates a context block for injection into agent prompts.
 *
 * Reads: active task, recent memory (3), active decisions (2), current session.
 * Returns a formatted string that can be injected into the system prompt.
 */
export function contextInject(be: SQLiteBackend): string {
  const blocks: string[] = ['<nutausik_context>']

  // Active task
  const allTasks = crud.taskList(be, {})
  const activeTask = allTasks.find((t) => t.status === 'active')
  if (activeTask) {
    blocks.push(`Active task: ${activeTask.slug} — ${activeTask.title} (status: ${activeTask.status})`)
    if (activeTask.goal) blocks.push(`Goal: ${activeTask.goal}`)
    if (activeTask.acceptance_criteria) blocks.push(`AC: ${activeTask.acceptance_criteria}`)

    // Plan steps
    const steps = activeTask.plan ? JSON.parse(activeTask.plan) : []
    if (Array.isArray(steps) && steps.length > 0) {
      blocks.push(`Plan steps:`)
      steps.forEach((s: string, i: number) => blocks.push(`  ${i + 1}. ${s}`))
    }
  } else {
    // No active task — suggest creating one
    const planningTasks = allTasks.filter((t) => t.status === 'planning')
    if (planningTasks.length > 0) {
      blocks.push(`Next task: ${planningTasks[0]!.slug} — ${planningTasks[0]!.title} (status: planning)`)
    } else {
      blocks.push('No active task. Create one with nutausik_task_quick().')
    }
  }

  // Recent memory (3)
  const memories = crud.memoryList(be, {})
  const recentMemories = memories.slice(-3).reverse()
  if (recentMemories.length > 0) {
    blocks.push(`Recent memory:`)
    for (const m of recentMemories) {
      const label = m.type === 'pattern' ? '📐' : m.type === 'gotcha' ? '⚠️' : m.type === 'dead_end' ? '💀' : '📝'
      blocks.push(`  ${label} ${m.title}${m.tags ? ` (tags: ${m.tags})` : ''}`)
    }
  }

  // Active decisions (2)
  const decisions = crud.decisionList(be)
  const activeDecisions = decisions.slice(-2)
  if (activeDecisions.length > 0) {
    blocks.push(`Active decisions:`)
    for (const d of activeDecisions) {
      blocks.push(`  📋 ${d.decision}`)
    }
  }

  blocks.push('')
  blocks.push('💡 On session end, call nutausik_memory_add with key learnings (type: pattern/gotcha/convention).')
  blocks.push('</nutausik_context>')
  return blocks.join('\n')
}
