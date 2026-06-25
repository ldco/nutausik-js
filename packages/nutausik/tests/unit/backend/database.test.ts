import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SQLiteBackend } from '../../../src/backend/database.js'
import { initFreshSchema } from '../../../src/backend/init.js'
import { memoryEdgeAdd, memoryEdgeList, memoryEdgeDelete, memoryEdgesFor } from '../../../src/backend/graph.js'
import { sessionMetrics } from '../../../src/backend/metrics.js'
import Database from 'better-sqlite3'

describe('SQLiteBackend', () => {
  let tmpDir: string
  let dbPath: string
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'db-test-'))
    dbPath = join(tmpDir, 'nutausik.db')
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('opens and initializes schema', () => {
    const be = new SQLiteBackend(dbPath)
    expect(be.db).toBeDefined()
    expect(be.dbPath).toBe(dbPath)
    be.close()
  })

  it('close is idempotent', () => {
    const be = new SQLiteBackend(dbPath)
    be.close()
    // second close should not throw
    be.close()
  })

  it('inTransaction wraps a function', () => {
    const be = new SQLiteBackend(dbPath)
    const result = be.inTransaction(() => 42)
    expect(result).toBe(42)
    be.close()
  })
})

describe('graph.ts — memory edges', () => {
  let be: SQLiteBackend
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'graph-test-'))
    be = new SQLiteBackend(join(tmpDir, 'nutausik.db'))
  })
  afterEach(() => { be.close(); rmSync(tmpDir, { recursive: true, force: true }) })

  it('memoryEdgeAdd inserts a new edge', () => {
    const id = memoryEdgeAdd(be, 'memory', 1, 'memory', 2, 'relates_to')
    expect(id).toBeGreaterThan(0)
  })

  it('memoryEdgeList returns inserted edges', () => {
    memoryEdgeAdd(be, 'memory', 1, 'decision', 1, 'relates_to')
    const list = memoryEdgeList(be)
    expect(list.length).toBe(1)
    expect(list[0]!.relation).toBe('relates_to') // CHECK allows any value, no constraint on relation
  })

  it('memoryEdgeDelete soft-deletes', () => {
    const id = memoryEdgeAdd(be, 'memory', 1, 'memory', 2, 'relates_to')
    memoryEdgeDelete(be, id)
    const list = memoryEdgeList(be)
    expect(list.length).toBe(0)
  })

  it('memoryEdgesFor finds edges for a node', () => {
    const parent = memoryEdgeAdd(be, 'memory', 42, 'memory', 99, 'relates_to')
    const edges = memoryEdgesFor(be, 'memory', 42)
    expect(edges.length).toBeGreaterThan(0)
  })

  it('memoryEdgeList returns empty when no edges', () => {
    const list = memoryEdgeList(be)
    expect(list).toEqual([])
  })

  it('memoryEdgeList returns inserted edges', () => {
    memoryEdgeAdd(be, 'memory', 1, 'decision', 1, 'relates_to')
    const list = memoryEdgeList(be)
    expect(list.length).toBe(1)
    expect(list[0]!.relation).toBe('relates_to')
  })

  it('memoryEdgeDelete soft-deletes', () => {
    const id = memoryEdgeAdd(be, 'memory', 1, 'memory', 2, 'relates_to')
    memoryEdgeDelete(be, id)
    const list = memoryEdgeList(be)
    expect(list.length).toBe(0)
  })

  it('memoryEdgesFor finds edges for a node', () => {
    const parent = memoryEdgeAdd(be, 'memory', 42, 'memory', 99, 'relates_to')
    const edges = memoryEdgesFor(be, 'memory', 42)
    expect(edges.length).toBeGreaterThan(0)
  })
})

describe('metrics.ts', () => {
  let be: SQLiteBackend
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'metrics-test-'))
    be = new SQLiteBackend(join(tmpDir, 'nutausik.db'))
  })
  afterEach(() => { be.close(); rmSync(tmpDir, { recursive: true, force: true }) })

  it('sessionMetrics returns null for nonexistent session', () => {
    const metrics = sessionMetrics(be, 999)
    expect(metrics).toBeNull()
  })

  it('sessionMetrics returns data for existing session', () => {
    const db = be.db
    db.prepare("INSERT INTO sessions (id, started_at) VALUES (1, datetime('now', '-1 hour'))").run()
    db.prepare("INSERT INTO session_usage_metrics (session_id, tokens_total, cost_usd, tool_calls, recorded_at) VALUES (1, 1000, 0.05, 10, datetime('now'))").run()

    const metrics = sessionMetrics(be, 1)
    expect(metrics).not.toBeNull()
    expect(metrics!.sessionId).toBe(1)
    expect(metrics!.toolCalls).toBe(10)
    expect(metrics!.tokensTotal).toBe(1000)
    expect(metrics!.costUsd).toBeCloseTo(0.05)
  })
})
