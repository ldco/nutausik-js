import { type ConformanceIssue } from './conformance.js'
import { type DriftIssue } from './drift.js'

export interface ConformanceReport {
  generated_at: string
  total_checks: number
  passed: number
  failed: number
  conformance: ConformanceIssue[]
  drift: DriftIssue[]
}

export function buildConformanceReport(conformance: ConformanceIssue[], drift: DriftIssue[]): ConformanceReport {
  const passed = conformance.filter(c => c.passed).length
  return {
    generated_at: new Date().toISOString(),
    total_checks: conformance.length + drift.length,
    passed,
    failed: conformance.length + drift.length - passed,
    conformance,
    drift,
  }
}

export function formatReportMarkdown(report: ConformanceReport): string {
  const lines: string[] = [
    '# Conformance Report',
    '',
    `Generated: ${report.generated_at}`,
    `Checks: ${report.total_checks} total, ${report.passed} passed, ${report.failed} failed`,
    '',
    '## Conformance',
    '',
  ]
  for (const c of report.conformance) {
    lines.push(`- [${c.passed ? 'x' : ' '}] ${c.rule} — ${c.detail}`)
  }
  lines.push('', '## Drift', '')
  if (report.drift.length === 0) {
    lines.push('- No drift detected')
  } else {
    for (const d of report.drift) {
      lines.push(`- ${d.file}: expected ${d.expected}, actual ${d.actual}`)
    }
  }
  return lines.join('\n')
}
