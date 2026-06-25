import { readFileSync, existsSync } from 'node:fs'
import type { GateResult } from '../types/index.js'

export function filesizeGate(files: string[], maxLines = 400): GateResult {
  const start = Date.now()
  const violations: string[] = []

  for (const file of files) {
    if (!existsSync(file)) continue
    const content = readFileSync(file, 'utf-8')
    const lines = content.split('\n').length
    if (lines > maxLines) {
      violations.push(`${file}: ${lines} lines (max ${maxLines})`)
    }
  }

  const duration_ms = Date.now() - start
  const passed = violations.length === 0

  return {
    name: 'filesize',
    passed,
    severity: 'block',
    skipped: false,
    duration_ms,
    output: passed ? undefined : violations.join('\n'),
  }
}
