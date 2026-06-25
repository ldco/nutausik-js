import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import type { GateResult } from '../types/index.js'

export function checkQG0(be: SQLiteBackend, slug: string): GateResult {
  const task = crud.taskGet(be, slug)
  if (!task) {
    return { name: 'qg0', passed: false, severity: 'block', skipped: false, duration_ms: 0, output: `Task '${slug}' not found` }
  }

  const issues: string[] = []
  if (!task.goal) issues.push('goal is empty')
  if (!task.acceptance_criteria) issues.push('acceptance_criteria is empty')
  if (task.goal && task.goal.length < 10) issues.push('goal too short (<10 chars)')
  if (task.acceptance_criteria && task.acceptance_criteria.length < 10) issues.push('acceptance_criteria too short (<10 chars)')

  if (issues.length === 0) {
    return { name: 'qg0', passed: true, severity: 'block', skipped: false, duration_ms: 0, output: 'QG-0 passed' }
  }

  return {
    name: 'qg0', passed: false, severity: 'block', skipped: false, duration_ms: 0,
    output: `QG-0 BLOCKED: ${issues.join('; ')}. task_update('${slug}', goal='...', acceptance_criteria='...')`,
  }
}
