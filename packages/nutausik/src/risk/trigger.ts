import { readFileSync } from 'node:fs'

export interface RiskTrigger {
  file: string
  trigger: string
  severity: 'low' | 'medium' | 'high'
  suggestion: string
}

const TRIGGER_PATTERNS: { pattern: RegExp; severity: 'low' | 'medium' | 'high'; suggestion: string }[] = [
  { pattern: /TODO/i, severity: 'low', suggestion: 'Resolve TODO before shipping' },
  { pattern: /FIXME/i, severity: 'medium', suggestion: 'Fix known issue before release' },
  { pattern: /HACK/i, severity: 'medium', suggestion: 'Replace hack with proper implementation' },
  { pattern: /console\.(log|debug)/i, severity: 'low', suggestion: 'Remove debug logging before production' },
  { pattern: /skip\.only|only\.it|describe\.only/i, severity: 'high', suggestion: 'Remove test .only() — it skips all other tests' },
  { pattern: /api.?key|secret|password|passwd/i, severity: 'high', suggestion: 'Potential hardcoded credential — use env vars' },
  { pattern: /eslint-.*-next-line|ts-ignore|ts-expect-error/i, severity: 'medium', suggestion: 'Remove suppression and fix the underlying issue' },
]

export function scanForTriggers(filePath: string): RiskTrigger[] {
  const triggers: RiskTrigger[] = []
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      for (const tp of TRIGGER_PATTERNS) {
        const match = lines[i]!.match(tp.pattern)
        if (match) {
          triggers.push({
            file: filePath,
            trigger: `Line ${i + 1}: ${match[0]}`,
            severity: tp.severity,
            suggestion: tp.suggestion,
          })
        }
      }
    }
  } catch { /* skip unreadable files */ }
  return triggers
}
