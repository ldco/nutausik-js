import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFreshSchema } from '../../../src/backend/init.js'
import type { SQLiteBackend } from '../../../src/backend/database.js'
import * as knowledge from '../../../src/service/knowledge.js'
import * as crud from '../../../src/backend/crud.js'

function createBE(): SQLiteBackend {
  const db = new Database(':memory:')
  initFreshSchema(db)
  return { db, dbPath: ':memory:', close: () => db.close(), inTransaction: <T>(fn: () => T) => db.transaction(fn)() } as SQLiteBackend
}

describe('memoryAdd', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('adds a memory entry', () => {
    const result = knowledge.memoryAdd(be, 'pattern', 'Use vitest', 'Vitest is fast')
    expect(result).toContain('Memory #')
    expect(result).toContain('pattern')
  })

  it('rejects invalid memory type', () => {
    expect(() => knowledge.memoryAdd(be, 'invalid', 'Test', 'test')).toThrow(/Invalid memory type/)
  })

  it('links memory to a task', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    const result = knowledge.memoryAdd(be, 'gotcha', 'Got it', 'Detail', null, 'task-1')
    expect(result).toContain('gotcha')
  })

  it('rejects linking to nonexistent task', () => {
    expect(() => knowledge.memoryAdd(be, 'pattern', 'Test', 'test', null, 'no-task'))
      .toThrow(/not found/)
  })
})

describe('memoryGet', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('retrieves a memory entry', () => {
    const result = knowledge.memoryAdd(be, 'pattern', 'Title', 'Content')
    const id = parseInt(result.match(/#(\d+)/)![1]!, 10)
    const mem = knowledge.memoryGet(be, id)
    expect(mem.title).toBe('Title')
  })

  it('throws for nonexistent entry', () => {
    expect(() => knowledge.memoryGet(be, 999)).toThrow(/not found/)
  })
})

describe('memoryCompact', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('returns empty string when no memory', () => {
    const result = knowledge.memoryCompact(be)
    expect(result).toContain('No memory')
  })

  it('returns recent memory entries', () => {
    knowledge.memoryAdd(be, 'pattern', 'P1', 'Pattern one')
    knowledge.memoryAdd(be, 'gotcha', 'G1', 'Gotcha one')
    const result = knowledge.memoryCompact(be, 5)
    expect(result).toContain('P1')
    expect(result).toContain('G1')
  })
})

describe('memorySearch', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('searches memory and returns results', async () => {
    knowledge.memoryAdd(be, 'pattern', 'Use vitest', 'Vitest is the recommended test runner')
    const result = await knowledge.memorySearch(be, 'vitest')
    expect(result).toContain('Use vitest')
  })

  it('returns no results message for no match', async () => {
    const result = await knowledge.memorySearch(be, 'zzzz_nonexistent')
    expect(result).toContain('No results')
  })
})
