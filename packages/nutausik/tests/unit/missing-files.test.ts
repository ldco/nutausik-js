import { describe, it, expect } from 'vitest'
import { checkQG0 } from '../../src/gates/qg0.js'
import { checkAC } from '../../src/gates/ac.js'
import { selfCheck } from '../../src/mcp/self-check.js'
import { emitReceipt } from '../../src/verify/receipt-emit.js'
import { checkReceiptStructure } from '../../src/verify/receipt-check.js'
import { buildReceipt } from '../../src/crypto/receipt.js'
import Database from 'better-sqlite3'

function emptyBe(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
  db.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planning',
    goal TEXT, acceptance_criteria TEXT, tier TEXT, complexity TEXT, plan TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  return db
}

function makeBackend(db: Database.Database): never {
  return { db, close: () => db.close(), inTransaction: (fn: () => unknown) => fn(), dbPath: ':memory:' } as never
}

describe('gates/qg0.ts', () => {
  it('blocks when task not found', () => {
    const be = makeBackend(emptyBe())
    const r = checkQG0(be, 'nonexistent')
    expect(r.passed).toBe(false)
    expect(r.severity).toBe('block')
  })

  it('blocks when goal empty', () => {
    const db = emptyBe()
    db.prepare("INSERT INTO tasks (slug, title, goal, acceptance_criteria) VALUES ('t1', 'T1', '', 'AC')").run()
    const r = checkQG0(makeBackend(db), 't1')
    expect(r.passed).toBe(false)
    expect(r.output).toContain('QG-0')
    db.close()
  })

  it('blocks when acceptance_criteria empty', () => {
    const db = emptyBe()
    db.prepare("INSERT INTO tasks (slug, title, goal, acceptance_criteria) VALUES ('t1', 'T1', 'Goal', '')").run()
    const r = checkQG0(makeBackend(db), 't1')
    expect(r.passed).toBe(false)
    db.close()
  })

  it('passes when both goal and AC present and sufficient length', () => {
    const db = emptyBe()
    db.prepare("INSERT INTO tasks (slug, title, goal, acceptance_criteria) VALUES ('t1', 'T1', 'Long enough goal', 'Long enough acceptance')").run()
    const r = checkQG0(makeBackend(db), 't1')
    expect(r.passed).toBe(true)
    db.close()
  })
})

describe('gates/ac.ts', () => {
  it('passes with sufficient AC', () => {
    const db = emptyBe()
    db.prepare("INSERT INTO tasks (slug, title, acceptance_criteria, tier) VALUES ('t1', 'T1', 'Line 1\nLine 2\nLine 3', 'trivial')").run()
    const r = checkAC(makeBackend(db), 't1')
    expect(r.passed).toBe(true)
    db.close()
  })

  it('warns on empty AC', () => {
    const db = emptyBe()
    db.prepare("INSERT INTO tasks (slug, title) VALUES ('t1', 'T1')").run()
    const r = checkAC(makeBackend(db), 't1')
    expect(r.passed).toBe(false)
    db.close()
  })
})

describe('mcp/self-check.ts', () => {
  it('passes all checks', () => {
    const r = selfCheck()
    expect(r.ok).toBe(true)
    expect(r.checks.length).toBeGreaterThanOrEqual(5)
  })
})

describe('verify/receipt-check.ts', () => {
  it('rejects non-object', () => {
    const r = checkReceiptStructure(null)
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('not an object')
  })

  it('rejects unknown schema', () => {
    const r = checkReceiptStructure({ schema: 'v2' })
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('Unknown schema')
  })

  it('rejects missing task_slug', () => {
    const r = checkReceiptStructure({ schema: 'tausik-receipt/v1' })
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('task_slug')
  })

  it('passes for valid structure', () => {
    const r = checkReceiptStructure({
      schema: 'tausik-receipt/v1',
      task_slug: 'test',
      gates: [],
    })
    expect(r.valid).toBe(true)
  })
})

describe('verify/receipt-emit.ts', () => {
  it('emits receipt to meta store', () => {
    const db = emptyBe()
    const receipt = emitReceipt(makeBackend(db), 'test-task', 'standard', [{ name: 'tsc', passed: true, severity: 'block' }], true)
    expect(receipt.schema).toBe('tausik-receipt/v1')
    expect(receipt.task_slug).toBe('test-task')
    db.close()
  })
})
