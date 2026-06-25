import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFreshSchema } from '../../../src/backend/init.js'
import type { SQLiteBackend } from '../../../src/backend/database.js'
import * as hierarchy from '../../../src/service/hierarchy.js'
import * as crud from '../../../src/backend/crud.js'

function createBE(): SQLiteBackend {
  const db = new Database(':memory:')
  initFreshSchema(db)
  return { db, dbPath: ':memory:', close: () => db.close(), inTransaction: <T>(fn: () => T) => db.transaction(fn)() } as SQLiteBackend
}

describe('epics', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('adds and retrieves an epic', () => {
    hierarchy.epicAdd(be, 'my-epic', 'My Epic', 'Description')
    const epic = hierarchy.epicGet(be, 'my-epic')
    expect(epic.slug).toBe('my-epic')
    expect(epic.title).toBe('My Epic')
  })

  it('rejects duplicate slug', () => {
    hierarchy.epicAdd(be, 'my-epic', 'My Epic')
    expect(() => hierarchy.epicAdd(be, 'my-epic', 'Again')).toThrow(/already exists/)
  })

  it('rejects invalid slug', () => {
    expect(() => hierarchy.epicAdd(be, '-bad', 'Bad')).toThrow(/Invalid slug/)
  })

  it('lists epics', () => {
    hierarchy.epicAdd(be, 'e1', 'E1')
    hierarchy.epicAdd(be, 'e2', 'E2')
    const list = hierarchy.epicList(be)
    expect(list).toHaveLength(2)
  })

  it('filters by status', () => {
    hierarchy.epicAdd(be, 'e1', 'E1')
    hierarchy.epicDelete(be, 'e1')
    const list = hierarchy.epicList(be, 'done')
    expect(list).toHaveLength(0)
  })
})

describe('stories', () => {
  let be: SQLiteBackend
  beforeEach(() => {
    be = createBE()
    hierarchy.epicAdd(be, 'epic-1', 'Epic 1')
  })
  afterEach(() => be.close())

  it('adds a story under an epic', () => {
    hierarchy.storyAdd(be, 'epic-1', 'story-1', 'Story 1', 'A story')
    const story = hierarchy.storyGet(be, 'story-1')
    expect(story.slug).toBe('story-1')
    expect(story.title).toBe('Story 1')
  })

  it('rejects story when epic not found', () => {
    expect(() => hierarchy.storyAdd(be, 'no-epic', 's1', 'S1')).toThrow(/not found/)
  })

  it('lists stories for an epic', () => {
    hierarchy.storyAdd(be, 'epic-1', 's1', 'S1')
    hierarchy.storyAdd(be, 'epic-1', 's2', 'S2')
    const list = hierarchy.storyList(be, { epic: 'epic-1' })
    expect(list).toHaveLength(2)
  })
})
