import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SqlJsWrapper } from '../../../src/backend/sqljs-adapter.js'

describe('SqlJsWrapper (WASM fallback)', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'sqljs-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('creates a new database file on close', async () => {
    const path = join(tmpDir, 'test.db')
    const w = await SqlJsWrapper.create(path)
    expect(w.db).toBeDefined()
    w.close()
    expect(existsSync(path)).toBe(true)
  })

  it('creates tables and inserts data', async () => {
    const path = join(tmpDir, 'test.db')
    const w = await SqlJsWrapper.create(path)
    w.db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)')
    w.prepare('INSERT INTO test (name) VALUES (?)').run('hello')
    const rows = w.prepare('SELECT * FROM test').all()
    expect(rows.length).toBe(1)
    expect(rows[0]!.name).toBe('hello')
    w.close()
  })

  it('supports .get() for single row', async () => {
    const path = join(tmpDir, 'test.db')
    const w = await SqlJsWrapper.create(path)
    w.db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)')
    w.prepare('INSERT INTO test (name) VALUES (?)').run('hello')
    const row = w.prepare('SELECT * FROM test WHERE id = ?').get(1)
    expect(row).toBeDefined()
    expect(row!.name).toBe('hello')
    const missing = w.prepare('SELECT * FROM test WHERE id = ?').get(999)
    expect(missing).toBeUndefined()
    w.close()
  })

  it('supports .all() with params', async () => {
    const path = join(tmpDir, 'test.db')
    const w = await SqlJsWrapper.create(path)
    w.db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)')
    w.prepare('INSERT INTO test (name) VALUES (?)').run('a')
    w.prepare('INSERT INTO test (name) VALUES (?)').run('b')
    const rows = w.prepare('SELECT * FROM test WHERE name = ?').all('a')
    expect(rows.length).toBe(1)
    w.close()
  })

  it('supports .run() returning lastInsertRowid', async () => {
    const path = join(tmpDir, 'test.db')
    const w = await SqlJsWrapper.create(path)
    w.db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)')
    const result = w.prepare('INSERT INTO test (name) VALUES (?)').run('first')
    expect(result.lastInsertRowid).toBeGreaterThan(0)
    expect(result.changes).toBe(1)
    w.close()
  })

  it('supports transactions', async () => {
    const path = join(tmpDir, 'test.db')
    const w = await SqlJsWrapper.create(path)
    w.db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)')
    const tx = w.transaction(() => {
      w.prepare('INSERT INTO test (name) VALUES (?)').run('tx1')
      w.prepare('INSERT INTO test (name) VALUES (?)').run('tx2')
    })
    tx()
    const rows = w.prepare('SELECT * FROM test').all()
    expect(rows.length).toBe(2)
    w.close()
  })

  it('persists data across close/reopen', async () => {
    const path = join(tmpDir, 'persist.db')
    let w = await SqlJsWrapper.create(path)
    w.db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)')
    w.prepare('INSERT INTO test (name) VALUES (?)').run('persisted')
    w.close()

    w = await SqlJsWrapper.create(path)
    const rows = w.prepare('SELECT * FROM test').all()
    expect(rows.length).toBe(1)
    expect(rows[0]!.name).toBe('persisted')
    w.close()
  })

  it('handles NULL values', async () => {
    const path = join(tmpDir, 'nulls.db')
    const w = await SqlJsWrapper.create(path)
    w.db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)')
    w.prepare('INSERT INTO test (name, value) VALUES (?, ?)').run('nullable', null)
    const row = w.prepare('SELECT * FROM test WHERE id = ?').get(1)
    expect(row!.name).toBe('nullable')
    expect(row!.value).toBeNull()
    w.close()
  })
})
