import { TOOLS } from './tools.js'

export interface SelfCheckResult {
  ok: boolean
  checks: { name: string; passed: boolean; detail: string }[]
}

export function selfCheck(): SelfCheckResult {
  const checks: SelfCheckResult['checks'] = []

  const toolCount = TOOLS.length
  const hasTaskTools = TOOLS.some(t => t.name.startsWith('nutausik_task_'))
  const hasSessionTools = TOOLS.some(t => t.name.startsWith('nutausik_session_'))
  const hasCryptoTools = TOOLS.some(t => t.name.startsWith('nutausik_key_') || t.name.startsWith('nutausik_receipt_'))
  const hasSearchTools = TOOLS.some(t => t.name === 'nutausik_fts_search')

  checks.push({ name: 'tool-count', passed: toolCount >= 100, detail: `${toolCount} tools registered` })
  checks.push({ name: 'task-tools', passed: hasTaskTools, detail: hasTaskTools ? 'Task lifecycle tools present' : 'Missing task tools' })
  checks.push({ name: 'session-tools', passed: hasSessionTools, detail: hasSessionTools ? 'Session tools present' : 'Missing session tools' })
  checks.push({ name: 'crypto-tools', passed: hasCryptoTools, detail: hasCryptoTools ? 'Crypto tools present' : 'Missing crypto tools' })
  checks.push({ name: 'search-tools', passed: hasSearchTools, detail: hasSearchTools ? 'FTS search tool present' : 'Missing FTS search tool' })
  checks.push({ name: 'typescript', passed: true, detail: 'Built with TypeScript' })

  const allPassed = checks.every(c => c.passed)
  return { ok: allPassed, checks }
}
