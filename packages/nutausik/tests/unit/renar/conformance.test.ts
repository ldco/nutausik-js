import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runConformanceCheck } from '../../../src/renar/conformance.js'
import { checkDrift } from '../../../src/renar/drift.js'
import { buildConformanceReport, formatReportMarkdown } from '../../../src/renar/export.js'

describe('runConformanceCheck', () => {
  let tmpDir: string
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'renar-test-'))
    mkdirSync(join(tmpDir, '.nutausik'), { recursive: true })
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('flunks when project is empty', () => {
    const issues = runConformanceCheck(tmpDir)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every(i => !i.passed)).toBe(false)
  })

  it('passes when all required files exist', () => {
    writeFileSync(join(tmpDir, 'AGENTS.md'), '# agents')
    writeFileSync(join(tmpDir, 'CLAUDE.md'), '# claude')
    writeFileSync(join(tmpDir, '.nutausik', 'config.json'), '{}')
    writeFileSync(join(tmpDir, '.nutausik', 'nutausik.db'), '')
    const issues = runConformanceCheck(tmpDir)
    const allPassed = issues.every(i => i.passed)
    expect(allPassed).toBe(true)
  })
})

describe('checkDrift', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'drift-test-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('returns empty when doc files missing', () => {
    const issues = checkDrift(tmpDir, '1.0.0')
    expect(issues).toEqual([])
  })

  it('detects version mismatch in AGENTS.md', () => {
    writeFileSync(join(tmpDir, 'AGENTS.md'), '# Project\nVersion: 0.5.0\n')
    const issues = checkDrift(tmpDir, '1.0.0')
    expect(issues.length).toBe(1)
    expect(issues[0]!.expected).toBe('1.0.0')
    expect(issues[0]!.actual).toBe('0.5.0')
  })

  it('skips matching versions', () => {
    writeFileSync(join(tmpDir, 'AGENTS.md'), '# Project\nversion 1.0.0\n')
    const issues = checkDrift(tmpDir, '1.0.0')
    expect(issues).toEqual([])
  })
})

describe('buildConformanceReport', () => {
  it('generates report with passed/failed counts', () => {
    const conformance = [
      { rule: 'Check 1', passed: true, detail: 'OK' },
      { rule: 'Check 2', passed: false, detail: 'FAIL' },
    ]
    const report = buildConformanceReport(conformance, [])
    expect(report.total_checks).toBe(2)
    expect(report.passed).toBe(1)
    expect(report.failed).toBe(1)
  })

  it('formatReportMarkdown produces valid output', () => {
    const conformance = [
      { rule: 'Check 1', passed: true, detail: 'OK' },
    ]
    const report = buildConformanceReport(conformance, [])
    const md = formatReportMarkdown(report)
    expect(md).toContain('Conformance Report')
    expect(md).toContain('[x] Check 1')
  })
})
