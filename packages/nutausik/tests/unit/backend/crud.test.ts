import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFreshSchema } from '../../../src/backend/init.js'
import * as crud from '../../../src/backend/crud.js'
import type { SQLiteBackend } from '../../../src/backend/database.js'
import { utcnowIso } from '../../../src/utils/helpers.js'

function createBackend(): SQLiteBackend {
  const db = new Database(':memory:')
  initFreshSchema(db)
  return { db, dbPath: ':memory:', close: () => db.close(), inTransaction: <T>(fn: () => T) => db.transaction(fn)() } as SQLiteBackend
}

describe('Epic CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('adds and retrieves an epic', () => {
    crud.epicAdd(be, 'my-epic', 'My Epic', 'A test epic')
    const epic = crud.epicGet(be, 'my-epic')
    expect(epic).toBeDefined()
    expect(epic!.slug).toBe('my-epic')
    expect(epic!.title).toBe('My Epic')
    expect(epic!.description).toBe('A test epic')
    expect(epic!.status).toBe('active')
  })

  it('lists epics', () => {
    crud.epicAdd(be, 'epic-1', 'Epic 1')
    crud.epicAdd(be, 'epic-2', 'Epic 2')
    const list = crud.epicList(be)
    expect(list).toHaveLength(2)
  })

  it('lists epics filtered by status', () => {
    crud.epicAdd(be, 'epic-1', 'Epic 1')
    crud.epicUpdate(be, 'epic-1', { status: 'done' })
    const list = crud.epicList(be, 'done')
    expect(list).toHaveLength(1)
  })

  it('updates an epic', () => {
    crud.epicAdd(be, 'my-epic', 'Original')
    crud.epicUpdate(be, 'my-epic', { title: 'Updated', status: 'done' })
    const epic = crud.epicGet(be, 'my-epic')
    expect(epic!.title).toBe('Updated')
    expect(epic!.status).toBe('done')
  })

  it('deletes an epic', () => {
    crud.epicAdd(be, 'my-epic', 'My Epic')
    crud.epicDelete(be, 'my-epic')
    expect(crud.epicGet(be, 'my-epic')).toBeUndefined()
  })
})

describe('Story CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('adds a story under an epic', () => {
    crud.epicAdd(be, 'epic-1', 'Epic 1')
    crud.storyAdd(be, 'epic-1', 'story-1', 'Story 1', 'Test story')
    const story = crud.storyGet(be, 'story-1')
    expect(story).toBeDefined()
    expect(story!.slug).toBe('story-1')
    expect(story!.title).toBe('Story 1')
    expect(story!.description).toBe('Test story')
  })

  it('lists stories for an epic', () => {
    crud.epicAdd(be, 'epic-1', 'Epic 1')
    crud.storyAdd(be, 'epic-1', 'story-1', 'Story 1')
    crud.storyAdd(be, 'epic-1', 'story-2', 'Story 2')
    const list = crud.storyList(be, { epic: 'epic-1' })
    expect(list).toHaveLength(2)
  })

  it('cascade deletes stories when epic is deleted', () => {
    crud.epicAdd(be, 'epic-1', 'Epic 1')
    crud.storyAdd(be, 'epic-1', 'story-1', 'Story 1')
    crud.epicDelete(be, 'epic-1')
    expect(crud.storyGet(be, 'story-1')).toBeUndefined()
  })
})

describe('Task CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('adds a task', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    const task = crud.taskGet(be, 'task-1')
    expect(task).toBeDefined()
    expect(task!.slug).toBe('task-1')
    expect(task!.title).toBe('Task 1')
    expect(task!.status).toBe('planning')
  })

  it('adds a task with optional fields', () => {
    crud.taskAdd(be, 'task-1', 'Task 1', { stack: 'python', complexity: 'medium', goal: 'Do the thing', tier: 'moderate' })
    const task = crud.taskGet(be, 'task-1')
    expect(task!.stack).toBe('python')
    expect(task!.complexity).toBe('medium')
    expect(task!.goal).toBe('Do the thing')
    expect(task!.tier).toBe('moderate')
  })

  it('updates a task', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    crud.taskUpdate(be, 'task-1', { status: 'active', goal: 'New goal', acceptance_criteria: 'Must work' })
    const task = crud.taskGet(be, 'task-1')
    expect(task!.status).toBe('active')
    expect(task!.goal).toBe('New goal')
    expect(task!.acceptance_criteria).toBe('Must work')
  })

  it('lists tasks filtered by status', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    crud.taskAdd(be, 'task-2', 'Task 2')
    crud.taskUpdate(be, 'task-1', { status: 'active' })
    const list = crud.taskList(be, { status: 'active' })
    expect(list).toHaveLength(1)
    expect(list[0]!.slug).toBe('task-1')
  })

  it('gets next planning task by score', () => {
    crud.taskAdd(be, 'task-a', 'A')
    crud.taskAdd(be, 'task-b', 'B')
    crud.taskUpdate(be, 'task-a', { score: 5 })
    crud.taskUpdate(be, 'task-b', { score: 10 })
    const next = crud.taskNext(be)
    expect(next!.slug).toBe('task-b')
  })

  it('deletes a task', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    crud.taskDelete(be, 'task-1')
    expect(crud.taskGet(be, 'task-1')).toBeUndefined()
  })
})

describe('Session CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('starts a session', () => {
    const id = crud.sessionStart(be)
    expect(id).toBeGreaterThan(0)
    const current = crud.sessionCurrent(be)
    expect(current!.id).toBe(id)
  })

  it('ends a session', () => {
    crud.sessionStart(be)
    crud.sessionEnd(be)
    expect(crud.sessionCurrent(be)).toBeUndefined()
  })

  it('lists sessions', () => {
    crud.sessionStart(be)
    crud.sessionEnd(be)
    crud.sessionStart(be)
    const list = crud.sessionList(be)
    expect(list.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Decision CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('adds a decision', () => {
    crud.decisionAdd(be, 'Use SQLite', null, 'Best for single-binary deployment')
    const list = crud.decisionList(be)
    expect(list).toHaveLength(1)
    expect(list[0]!.decision).toBe('Use SQLite')
  })

  it('adds a decision linked to a task', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    crud.decisionAdd(be, 'Use TS', 'task-1', 'Better type safety')
    const list = crud.decisionList(be, 'task-1')
    expect(list).toHaveLength(1)
  })
})

describe('Memory CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('adds a memory entry', () => {
    const id = crud.memoryAdd(be, 'pattern', 'Use vitest', 'Vitest is faster than jest for TS projects')
    expect(id).toBeGreaterThan(0)
    const mem = crud.memoryGet(be, id)
    expect(mem!.title).toBe('Use vitest')
    expect(mem!.type).toBe('pattern')
  })

  it('lists memory entries filtered by type', () => {
    crud.memoryAdd(be, 'pattern', 'P1', 'Pattern 1')
    crud.memoryAdd(be, 'gotcha', 'G1', 'Gotcha 1')
    crud.memoryAdd(be, 'convention', 'C1', 'Conv 1')
    const list = crud.memoryList(be, { type: 'pattern' })
    expect(list).toHaveLength(1)
  })

  it('updates memory', () => {
    const id = crud.memoryAdd(be, 'pattern', 'Original', 'Original content')
    crud.memoryUpdate(be, id, { title: 'Updated', content: 'Updated content' })
    const mem = crud.memoryGet(be, id)
    expect(mem!.title).toBe('Updated')
    expect(mem!.content).toBe('Updated content')
  })

  it('deletes memory', () => {
    const id = crud.memoryAdd(be, 'pattern', 'Temp', 'Temporary')
    crud.memoryDelete(be, id)
    expect(crud.memoryGet(be, id)).toBeUndefined()
  })
})

describe('Event CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('adds an event', () => {
    const id = crud.eventAdd(be, 'task', 'task-1', 'created', '{"title":"Test"}')
    expect(id).toBeGreaterThan(0)
  })

  it('lists events for entity', () => {
    crud.eventAdd(be, 'task', 'task-1', 'created')
    crud.eventAdd(be, 'task', 'task-1', 'status_changed')
    const list = crud.eventList(be, 'task', 'task-1')
    expect(list).toHaveLength(2)
  })
})

describe('Task Log CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('adds a task log entry', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    const id = crud.taskLogAdd(be, 'task-1', 'Started work', 'implementation')
    expect(id).toBeGreaterThan(0)
  })

  it('lists task logs', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    crud.taskLogAdd(be, 'task-1', 'Step 1', 'planning')
    crud.taskLogAdd(be, 'task-1', 'Step 2', 'implementation')
    const logs = crud.taskLogList(be, 'task-1')
    expect(logs).toHaveLength(2)
  })

  it('filters task logs by phase', () => {
    crud.taskAdd(be, 'task-1', 'Task 1')
    crud.taskLogAdd(be, 'task-1', 'Planning', 'planning')
    crud.taskLogAdd(be, 'task-1', 'Coding', 'implementation')
    const logs = crud.taskLogList(be, 'task-1', 'planning')
    expect(logs).toHaveLength(1)
  })
})

describe('Metadata CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('sets and gets metadata', () => {
    crud.metaSet(be, 'project', 'my-project')
    expect(crud.metaGet(be, 'project')).toBe('my-project')
  })

  it('returns undefined for missing key', () => {
    expect(crud.metaGet(be, 'nonexistent')).toBeUndefined()
  })

  it('increments metadata counter', () => {
    crud.metaIncrement(be, 'counter')
    expect(crud.metaGet(be, 'counter')).toBe('1')
    crud.metaIncrement(be, 'counter')
    expect(crud.metaGet(be, 'counter')).toBe('2')
  })
})

describe('Verification Run CRUD', () => {
  let be: SQLiteBackend

  beforeEach(() => { be = createBackend() })
  afterEach(() => be.close())

  it('adds a verification run', () => {
    const id = crud.verificationRunAdd(be, 'task-1', 'standard', 'ruff check', 0, 'abc123', 'All clean')
    expect(id).toBeGreaterThan(0)
  })

  it('looks up recent run by files_hash', () => {
    crud.verificationRunAdd(be, 'task-1', 'standard', 'ruff check', 0, 'abc123')
    const recent = crud.verificationRunRecent(be, 'task-1', 'abc123')
    expect(recent).toBeDefined()
    expect(recent!.exit_code).toBe(0)
  })
})

describe('FTS5 Search', () => {
  let be: SQLiteBackend
  // We need to import ftsSearch
  let fts: typeof import('../../../src/backend/fts.js')

  beforeEach(async () => {
    be = createBackend()
    fts = await import('../../../src/backend/fts.js')
  })
  afterEach(() => be.close())

  it('searches tasks via FTS5', () => {
    crud.taskAdd(be, 'auth-task', 'Implement authentication', { goal: 'Add login with JWT', acceptance_criteria: 'Users can log in' })
    const results = fts.ftsSearch(be, 'authentication')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.table === 'tasks' && r.slug === 'auth-task')).toBe(true)
  })

  it('searches memory via FTS5', () => {
    crud.memoryAdd(be, 'pattern', 'Use vitest for testing', 'Vitest is the recommended test runner for this project')
    const results = fts.ftsSearch(be, 'vitest')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.table === 'memory' && r.title === 'Use vitest for testing')).toBe(true)
  })

  it('returns empty array for empty query', () => {
    expect(fts.ftsSearch(be, '')).toEqual([])
    expect(fts.ftsSearch(be, '   ')).toEqual([])
  })
})
