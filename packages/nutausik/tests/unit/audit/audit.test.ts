import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runAudit } from '../../../src/audit/index.js'

describe('runAudit', () => {
  let tmpDir: string
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'audit-test-'))
    mkdirSync(join(tmpDir, '.nutausik'), { recursive: true })
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('reports fail when config missing', () => {
    const entries = runAudit(tmpDir)
    const cfgIssue = entries.find(e => e.path === 'config.json')
    expect(cfgIssue).toBeDefined()
    expect(cfgIssue!.status).toBe('fail')
  })

  it('reports ok for well-configured project', () => {
    writeFileSync(join(tmpDir, '.nutausik', 'config.json'), JSON.stringify({ project: 'test' }))
    writeFileSync(join(tmpDir, '.nutausik', 'nutausik.db'), '')
    writeFileSync(join(tmpDir, 'package.json'), '{}')
    writeFileSync(join(tmpDir, 'tsconfig.json'), '{}')
    const entries = runAudit(tmpDir)
    const failures = entries.filter(e => e.status === 'fail')
    expect(failures).toEqual([])
  })

  it('detects missing project name in config', () => {
    writeFileSync(join(tmpDir, '.nutausik', 'config.json'), '{}')
    const entries = runAudit(tmpDir)
    const cfgIssue = entries.find(e => e.message.includes('Missing project name'))
    expect(cfgIssue).toBeTruthy()
  })
})
