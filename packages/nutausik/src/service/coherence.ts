import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'

interface CoherenceResult {
  passed: boolean
  warnings: string[]
  conflicts: string[]
}

/**
 * coherence_check — validates a plan against memory, decisions, and existing tasks.
 *
 * Checks:
 * 1. Plan steps don't contradict active ADRs (decisions)
 * 2. Plan doesn't repeat known dead-ends (memory type: dead_end)
 * 3. Plan doesn't conflict with active memory (patterns/gotchas)
 * 4. Task doesn't already exist with similar title
 */
export function coherenceCheck(be: SQLiteBackend, planSteps: string[], taskSlug?: string): string {
  const result: CoherenceResult = {
    passed: true,
    warnings: [],
    conflicts: [],
  }

  const joinedPlan = planSteps.join(' ').toLowerCase()

  // 1. Check against active decisions
  const decisions = crud.decisionList(be)
  for (const d of decisions) {
    const decisionLower = d.decision.toLowerCase()
    // If the decision says "don't do X" and the plan does X → conflict
    if (decisionLower.includes('not') || decisionLower.includes('avoid') || decisionLower.includes('reject')) {
      const subject = decisionLower.replace(/not |avoid |reject /, '').trim()
      if (subject && joinedPlan.includes(subject)) {
        result.conflicts.push(`Decision contradicts: "${d.decision}"`)
        result.passed = false
      }
    }
  }

  // 2. Check against dead_end memories
  const memories = crud.memoryList(be)
  const deadEnds = memories.filter((m) => m.type === 'dead_end')
  for (const de of deadEnds) {
    const deLower = de.title.toLowerCase()
    if (joinedPlan.includes(deLower)) {
      result.conflicts.push(`Dead end memory: "${de.title}" — "${de.content}"`)
      result.passed = false
    }
  }

  // 3. Check patterns/gotchas
  const patterns = memories.filter((m) => m.type === 'pattern' || m.type === 'gotcha')
  for (const p of patterns) {
    const pLower = p.title.toLowerCase()
    if (joinedPlan.includes(pLower)) {
      result.warnings.push(`${p.type}: "${p.title}" — ${p.content}`)
    }
  }

  // 4. Check for duplicate task
  if (taskSlug) {
    const existing = crud.taskGet(be, taskSlug)
    if (existing) {
      result.warnings.push(`Task '${taskSlug}' already exists (status: ${existing.status}). Use nutausik_task_show to review.`)
    }
  }

  // Format output
  const lines: string[] = ['# Coherence Check']
  if (result.passed) {
    lines.push('✅ PASSED — no conflicts found.')
  } else {
    lines.push('❌ FAILED — conflicts detected.')
  }
  if (result.conflicts.length > 0) {
    lines.push('', '## 🔴 Conflicts')
    for (const c of result.conflicts) lines.push(`- ${c}`)
  }
  if (result.warnings.length > 0) {
    lines.push('', '## 🟡 Warnings')
    for (const w in result.warnings) lines.push(`- ${result.warnings[w]}`)
  }

  return lines.join('\n')
}
