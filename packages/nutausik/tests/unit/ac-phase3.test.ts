import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { initFreshSchema } from '../../src/backend/init.js'
import * as crud from '../../src/backend/crud.js'
import { lookupRecent, recordRun } from '../../src/verify/cache.js'
import { filesizeGate } from '../../src/gates/filesize.js'
import { checkQG0 } from '../../src/gates/qg0.js'
import { checkAC } from '../../src/gates/ac.js'
import { gatesForFiles } from '../../src/gates/stack-dispatch.js'

function makeBe() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initFreshSchema(db)
  return { db, be: { db, close: () => db.close(), inTransaction: (fn: () => unknown) => fn(), dbPath: ':memory:' } as never }
}

describe('Phase 3 — Verify + Gates AC items', () => {
  describe('AC-3.1/3.2/3.3: Verify cache', () => {
    it('AC-3.1: record_run inserts verification run', () => {
      const { be: b } = makeBe()
      const id = recordRun(b, 'test-task', 'lightweight', 'npm test', 0, 'abc123')
      expect(id).toBeGreaterThan(0)
    })

    it('AC-3.2: lookup_recent returns cached result for same hash', () => {
      const { be: b } = makeBe()
      crud.taskAdd(b, 't1', 'T1', { goal: 'g', acceptance_criteria: 'ac' })
      recordRun(b, 't1', 'standard', 'npm test', 0, 'abc123')
      const recent = lookupRecent(b, 't1', 'abc123')
      expect(recent).not.toBeUndefined()
      expect(recent!.exitCode).toBe(0)
    })

    it('AC-3.3: lookup_recent returns undefined for non-existent', () => {
      const { be: b } = makeBe()
      expect(lookupRecent(b, 'nonexistent', '')).toBeUndefined()
    })
  })

  describe('AC-3.5/3.6: Stack dispatch', () => {
    it('AC-3.5: .py file → gatesForFiles returns gates', () => {
      const gates = gatesForFiles(['src/test.py'])
      expect(gates.length).toBeGreaterThan(0)
    })

    it('AC-3.6: .ts file → gatesForFiles returns gates', () => {
      const gates = gatesForFiles(['src/app.ts'])
      expect(gates.length).toBeGreaterThan(0)
    })

    it('handles unknown extensions without error', () => {
      expect(() => gatesForFiles(['file.xyz'])).not.toThrow()
    })
  })

  describe('AC-3.7/3.15: Filesize gate', () => {
    let tmpDir: string
    beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'fsgate-')) })
    afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

    it('AC-3.7: blocks files over 400 lines', () => {
      const path = join(tmpDir, 'big.ts')
      writeFileSync(path, Array(450).fill('line\n').join(''))
      const result = filesizeGate([path], 400)
      expect(result.passed).toBe(false)
    })

    it('allows files under 400 lines', () => {
      const path = join(tmpDir, 'small.ts')
      writeFileSync(path, Array(50).fill('line\n').join(''))
      const result = filesizeGate([path], 400)
      expect(result.passed).toBe(true)
    })

    it('AC-3.15: counts lines for .ts files', () => {
      const path = join(tmpDir, 'test.ts')
      writeFileSync(path, Array(10).fill('line\n').join(''))
      const result = filesizeGate([path], 400)
      expect(result.passed).toBe(true)
    })
  })

  describe('AC-3.10/3.11: QG-0 check', () => {
    it('AC-3.10: rejects without goal', () => {
      const { be: b } = makeBe()
      crud.taskAdd(b, 't1', 'T1', { acceptance_criteria: 'AC' })
      expect(checkQG0(b, 't1').passed).toBe(false)
    })

    it('AC-3.11: rejects without acceptance_criteria', () => {
      const { be: b } = makeBe()
      crud.taskAdd(b, 't1', 'T1', { goal: 'Goal here' })
      expect(checkQG0(b, 't1').passed).toBe(false)
    })
  })

  describe('AC-3.12: AC check', () => {
    it('validates tier-based length', () => {
      const { be: b } = makeBe()
      crud.taskAdd(b, 't1', 'T1', { acceptance_criteria: 'x', tier: 'deep' })
      expect(checkAC(b, 't1').passed).toBe(false)
    })
  })
})
