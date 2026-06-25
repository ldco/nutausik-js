import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import type { GateResult } from '../types/index.js'

const TIER_MIN_AC_LENGTHS: Record<string, number> = {
  trivial: 10,
  light: 20,
  moderate: 50,
  substantial: 100,
  deep: 200,
}

export function checkAC(be: SQLiteBackend, slug: string): GateResult {
  const task = crud.taskGet(be, slug)
  if (!task) {
    return { name: 'ac', passed: false, severity: 'block', skipped: false, duration_ms: 0, output: `Task '${slug}' not found` }
  }

  const ac = task.acceptance_criteria ?? ''
  const tier = task.tier ?? 'moderate'
  const minLength = TIER_MIN_AC_LENGTHS[tier] ?? 50

  const issues: string[] = []
  if (!ac) issues.push('acceptance_criteria is empty')
  else if (ac.length < minLength) issues.push(`acceptance_criteria too short (${ac.length} chars, minimum ${minLength} for tier '${tier}')`)

  const acLines = ac.split('\n').filter(l => l.trim())
  if (acLines.length < 2 && ac.length > 0) issues.push('acceptance_criteria should have multiple items (one per line)')

  if (issues.length === 0) {
    return { name: 'ac', passed: true, severity: 'warn', skipped: false, duration_ms: 0, output: 'AC check passed' }
  }

  return { name: 'ac', passed: false, severity: 'warn', skipped: false, duration_ms: 0, output: issues.join('; ') }
}
