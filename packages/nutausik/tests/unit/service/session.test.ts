import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFreshSchema } from '../../../src/backend/init.js'
import type { SQLiteBackend } from '../../../src/backend/database.js'
import * as session from '../../../src/service/session.js'

function createBE(): SQLiteBackend {
  const db = new Database(':memory:')
  initFreshSchema(db)
  return { db, dbPath: ':memory:', close: () => db.close(), inTransaction: <T>(fn: () => T) => db.transaction(fn)() } as SQLiteBackend
}

describe('sessionStart', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('starts a new session', () => {
    const result = session.sessionStart(be)
    expect(result).toContain('started')
  })

  it('refuses to start when one is active', () => {
    session.sessionStart(be)
    const result = session.sessionStart(be)
    expect(result).toContain('already active')
  })
})

describe('sessionEnd', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('ends the active session', () => {
    session.sessionStart(be)
    const result = session.sessionEnd(be)
    expect(result).toContain('ended')
  })

  it('returns message when no active session', () => {
    const result = session.sessionEnd(be)
    expect(result).toContain('No active session')
  })
})

describe('sessionCurrent', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('returns message when no active session', () => {
    expect(session.sessionCurrent(be)).toContain('No active session')
  })

  it('returns session info when active', () => {
    session.sessionStart(be)
    const result = session.sessionCurrent(be)
    expect(result).toContain('Session #')
  })
})

describe('sessionExtend', () => {
  let be: SQLiteBackend
  beforeEach(() => { be = createBE() })
  afterEach(() => be.close())

  it('extends the current session', () => {
    session.sessionStart(be)
    const result = session.sessionExtend(be, 30)
    expect(result).toContain('extended by 30 min')
  })

  it('throws when no active session', () => {
    expect(() => session.sessionExtend(be)).toThrow(/No active session/)
  })
})
