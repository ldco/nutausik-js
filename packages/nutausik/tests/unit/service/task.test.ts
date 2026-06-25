import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFreshSchema } from '../../../src/backend/init.js'
import type { SQLiteBackend } from '../../../src/backend/database.js'
import * as task from '../../../src/service/task.js'
import * as crud from '../../../src/backend/crud.js'

function createBE(): SQLiteBackend {
  const db = new Database(':memory:')
  initFreshSchema(db)
  return { db, dbPath: ':memory:', close: () => db.close(), inTransaction: <T>(fn: () => T) => db.transaction(fn)() } as SQLiteBackend
}

describe('taskAdd', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('creates a task in planning status', () => {
    const result = task.taskAdd(be, 'my-task', 'My Task')
    expect(result).toContain("Task 'my-task' created")
    const t = crud.taskGet(be, 'my-task')!
    expect(t.status).toBe('planning')
  })

  it('rejects duplicate slug', () => {
    task.taskAdd(be, 'my-task', 'My Task')
    expect(() => task.taskAdd(be, 'my-task', 'My Task')).toThrow(/already exists/)
  })

  it('rejects invalid slug', () => {
    expect(() => task.taskAdd(be, '-bad', 'Bad')).toThrow(/Invalid slug/)
  })
})

describe('taskAddQuick', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('creates a task from title with auto-slug', () => {
    const result = task.taskAddQuick(be, 'Fix login bug', 'Make login work', 'developer', 'typescript', 'User can log in')
    expect(result).toContain("Task 'fix-login-bug-")
    expect(result).toContain('created')
  })
})

describe('taskStart — QG-0', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('starts a task with goal and acceptance criteria', () => {
    task.taskAdd(be, 'my-task', 'My Task', { goal: 'Do the thing', acceptanceCriteria: 'It works' })
    const result = task.taskStart(be, 'my-task')
    expect(result).toContain('started')
    const t = crud.taskGet(be, 'my-task')!
    expect(t.status).toBe('active')
  })

  it('blocks QG-0 without goal', () => {
    task.taskAdd(be, 'my-task', 'My Task', { acceptanceCriteria: 'It works' })
    expect(() => task.taskStart(be, 'my-task')).toThrow(/QG-0 BLOCKED/)
  })

  it('blocks QG-0 without acceptance criteria', () => {
    task.taskAdd(be, 'my-task', 'My Task', { goal: 'Do it' })
    expect(() => task.taskStart(be, 'my-task')).toThrow(/QG-0 BLOCKED/)
  })

  it('blocks QG-0 without both goal and AC', () => {
    task.taskAdd(be, 'my-task', 'My Task')
    expect(() => task.taskStart(be, 'my-task')).toThrow(/QG-0 BLOCKED/)
  })

  it('is idempotent on already active task', () => {
    task.taskAdd(be, 'my-task', 'My Task', { goal: 'Do it', acceptanceCriteria: 'Works' })
    task.taskStart(be, 'my-task')
    const result = task.taskStart(be, 'my-task')
    expect(result).toContain('already active')
  })

  it('throws for nonexistent task', () => {
    expect(() => task.taskStart(be, 'no-such-task')).toThrow(/not found/)
  })
})

describe('taskDone — QG-2', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('closes a task with ac_verified=true', () => {
    task.taskAdd(be, 'my-task', 'My Task', { goal: 'Do it', acceptanceCriteria: 'Works' })
    task.taskStart(be, 'my-task')
    const result = task.taskDone(be, 'my-task', true)
    expect(result.ok).toBe(true)
    const t = crud.taskGet(be, 'my-task')!
    expect(t.status).toBe('done')
  })

  it('blocks QG-2 without ac_verified', () => {
    task.taskAdd(be, 'my-task', 'My Task', { goal: 'Do it', acceptanceCriteria: 'Works' })
    task.taskStart(be, 'my-task')
    expect(() => task.taskDone(be, 'my-task', false)).toThrow(/QG-2 BLOCKED/)
  })

  it('returns done report with warnings for missing fields', () => {
    task.taskAdd(be, 'my-task', 'My Task', { goal: 'Do it', acceptanceCriteria: 'Works' })
    task.taskStart(be, 'my-task')
    const result = task.taskDone(be, 'my-task', true)
    expect(result.ok).toBe(true)
    expect(result.warnings).toContain('Task has no plan defined.')
  })

  it('is idempotent on already done task', () => {
    task.taskAdd(be, 'my-task', 'My Task', { goal: 'G', acceptanceCriteria: 'AC' })
    task.taskStart(be, 'my-task')
    task.taskDone(be, 'my-task', true)
    const result = task.taskDone(be, 'my-task', true)
    expect(result.warnings).toEqual([])
  })
})

describe('task lifecycle transitions', () => {
  let be: SQLiteBackend
  beforeEach(() => {
    be = createBE()
    task.taskAdd(be, 't1', 'T1', { goal: 'G', acceptanceCriteria: 'AC' })
    task.taskStart(be, 't1')
  })
  afterEach(() => be.close())

  it('blocks: done from planning', () => {
    task.taskAdd(be, 't2', 'T2')
    expect(() => task.taskDone(be, 't2', true)).toThrow(/Cannot transition/)
  })

  it('blocks: review from planning', () => {
    task.taskAdd(be, 't2', 'T2')
    expect(() => task.taskReview(be, 't2')).toThrow(/Cannot transition/)
  })

  it('allows: active → blocked → active → done', () => {
    task.taskBlock(be, 't1')
    expect(crud.taskGet(be, 't1')!.status).toBe('blocked')
    task.taskUnblock(be, 't1')
    expect(crud.taskGet(be, 't1')!.status).toBe('active')
    task.taskDone(be, 't1', true)
    expect(crud.taskGet(be, 't1')!.status).toBe('done')
  })
})

describe('task claim/unclaim', () => {
  let be: SQLiteBackend
  beforeEach(() => {
    be = createBE()
    task.taskAdd(be, 't1', 'T1')
  })
  afterEach(() => be.close())

  it('claims and unclaims a task', () => {
    task.taskClaim(be, 't1', 'agent-1')
    expect(crud.taskGet(be, 't1')!.claimed_by).toBe('agent-1')
    task.taskUnclaim(be, 't1')
    expect(crud.taskGet(be, 't1')!.claimed_by).toBeNull()
  })
})

describe('task delete', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE(); task.taskAdd(be, 't1', 'T1') })
  afterEach(() => be.close())

  it('deletes a task', () => {
    task.taskDelete(be, 't1')
    expect(crud.taskGet(be, 't1')).toBeUndefined()
  })

  it('throws for nonexistent task', () => {
    expect(() => task.taskDelete(be, 'nonexistent')).toThrow(/not found/)
  })
})

describe('task log', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE(); task.taskAdd(be, 't1', 'T1') })
  afterEach(() => be.close())

  it('logs to a task', () => {
    const result = task.taskLog(be, 't1', 'Did something', 'implementation')
    expect(result).toContain("Logged to task 't1'")
    const logs = crud.taskLogList(be, 't1')
    expect(logs).toHaveLength(1)
    expect(logs[0]!.message).toBe('Did something')
  })

  it('rejects empty log message', () => {
    expect(() => task.taskLog(be, 't1', '')).toThrow(/Message is required/)
  })
})
