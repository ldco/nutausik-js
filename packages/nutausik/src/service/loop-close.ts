import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import { ServiceError } from '../utils/helpers.js'

/**
 * loop_close — compares plan vs actual, generates SUMMARY.
 *
 * Input: task slug
 * Output: markdown summary of what was planned vs what happened
 */
export function loopClose(be: SQLiteBackend, taskSlug: string): string {
  const task = crud.taskGet(be, taskSlug)
  if (!task) throw new ServiceError(`Task '${taskSlug}' not found.`)

  const lines: string[] = []
  lines.push(`# UNIFY Loop Close: ${task.slug} — ${task.title}`)
  lines.push('')

  // Plan
  const planSteps: string[] = task.plan ? JSON.parse(task.plan) : []
  if (planSteps.length > 0) {
    lines.push('## 📋 Planned')
    for (const s of planSteps) lines.push(`- ${s}`)
  } else {
    lines.push('## 📋 Planned')
    lines.push('(No plan recorded)')
  }
  lines.push('')

  // Actual — from task logs
  const logs = crud.taskLogList(be, taskSlug)
  if (logs.length > 0) {
    lines.push('## 📝 Actual (logs)')
    for (const log of logs) {
      const ts = log.created_at ? new Date(log.created_at).toISOString().slice(0, 19).replace('T', ' ') : ''
      lines.push(`- [${ts}] ${log.message}`)
    }
  } else {
    lines.push('## 📝 Actual')
    lines.push('(No logs recorded)')
  }
  lines.push('')

  // Goal vs result
  if (task.goal) {
    lines.push(`## 🎯 Goal`)
    lines.push(task.goal)
    lines.push('')
  }

  // Status
  lines.push(`## Status: ${task.status}`)
  if (task.status === 'done') {
    lines.push('✅ Task completed successfully.')
  } else if (task.status === 'blocked') {
    lines.push('🔴 Task blocked.')
  } else if (task.status === 'active') {
    lines.push('🟡 Task in progress.')
  }

  return lines.join('\n')
}
