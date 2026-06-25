import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import * as serviceTask from '../../src/service/task.js'
import * as serviceSession from '../../src/service/session.js'
import * as serviceHierarchy from '../../src/service/hierarchy.js'
import * as serviceKnowledge from '../../src/service/knowledge.js'
import * as crud from '../../src/backend/crud.js'
import { initFreshSchema } from '../../src/backend/init.js'
import { ServiceError } from '../../src/service/task.js'

function makeUnitBackend() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initFreshSchema(db)
  const be = { db, close: () => db.close(), inTransaction: (fn: () => unknown) => fn(), dbPath: ':memory:' } as never
  return { db, be }
}

describe('Phase 2 — Service AC items', () => {
  describe('AC-2.1: task_add validates', () => {
    it('validates slug', () => {
      const { be } = makeUnitBackend()
      expect(() => serviceTask.taskAdd(be, '', 'T')).toThrow()
    })

    it('accepts valid task', () => {
      const { be } = makeUnitBackend()
      const r = serviceTask.taskAdd(be, 'my-task', 'My Task', { goal: 'G', acceptanceCriteria: 'AC' })
      expect(r).toContain("Task 'my-task' created")
    })
  })

  describe('AC-2.2: QG-0 enforcement', () => {
    it('blocks without goal', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1', { acceptanceCriteria: 'AC' })
      expect(() => serviceTask.taskStart(be, 't1')).toThrow(ServiceError)
    })

    it('blocks without acceptance_criteria', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1', { goal: 'G' })
      expect(() => serviceTask.taskStart(be, 't1')).toThrow(ServiceError)
    })

    it('succeeds with both', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1', { goal: 'Test goal text', acceptanceCriteria: 'Test AC text' })
      const r = serviceTask.taskStart(be, 't1')
      expect(r).toContain('started')
    })
  })

  describe('AC-2.3: task_start transitions', () => {
    it('is idempotent on already-active', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1', { goal: 'G', acceptanceCriteria: 'AC' })
      serviceTask.taskStart(be, 't1')
      const r = serviceTask.taskStart(be, 't1')
      expect(r).toContain('active')
    })
  })

  describe('AC-2.7: block/unblock', () => {
    it('task_block transitions to blocked', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1', { goal: 'G', acceptanceCriteria: 'AC' })
      serviceTask.taskStart(be, 't1')
      const r = serviceTask.taskBlock(be, 't1')
      expect(r).toContain('blocked')
    })

    it('task_unblock reverts', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1', { goal: 'G', acceptanceCriteria: 'AC' })
      serviceTask.taskStart(be, 't1')
      serviceTask.taskBlock(be, 't1')
      const r = serviceTask.taskUnblock(be, 't1')
      expect(r).toContain('unblocked')
    })
  })

  describe('AC-2.8: task_review', () => {
    it('transitions to review', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1', { goal: 'G', acceptanceCriteria: 'AC' })
      serviceTask.taskStart(be, 't1')
      const r = serviceTask.taskReview(be, 't1')
      expect(r).toContain('review')
    })
  })

  describe('AC-2.9: task_delete', () => {
    it('deletes task', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1')
      const r = serviceTask.taskDelete(be, 't1')
      expect(r).toContain('deleted')
    })
  })

  describe('AC-2.11: claim/unclaim', () => {
    it('task_claim sets claimed_by', () => {
      const { be } = makeUnitBackend()
      serviceTask.taskAdd(be, 't1', 'T1')
      const r = serviceTask.taskClaim(be, 't1', 'agent-1')
      expect(r).toContain('claimed')
    })
  })

  describe('AC-2.13: session lifecycle', () => {
    it('start/end flow', () => {
      const { be } = makeUnitBackend()
      const r = serviceSession.sessionStart(be)
      expect(r).toContain('Session #')
      const r2 = serviceSession.sessionEnd(be)
      expect(r2).toContain('ended')
    })
  })

  describe('AC-2.16: epic lifecycle', () => {
    it('full epic lifecycle', async () => {
      const { be } = makeUnitBackend()
      expect(serviceHierarchy.epicAdd(be, 'e1', 'E1')).toContain('created')
      expect(serviceHierarchy.epicGet(be, 'e1')).toBeDefined()
      expect(serviceHierarchy.epicList(be).length).toBe(1)
      const delResult = serviceHierarchy.epicDelete(be, 'e1')
      expect(delResult).toContain('deleted')
      const { epicGet } = await import('../../src/backend/crud.js')
      expect(epicGet(be, 'e1')).toBeUndefined()
    })
  })

  describe('AC-2.18: memory add', () => {
    it('memory_add creates with validation', () => {
      const { be } = makeUnitBackend()
      const r = serviceKnowledge.memoryAdd(be, 'pattern', 'Test', 'Content', 'tags')
      expect(r).toContain('added')
    })

    it('memory_compact returns markdown', () => {
      const { be } = makeUnitBackend()
      serviceKnowledge.memoryAdd(be, 'pattern', 'P1', 'Content')
      const r = serviceKnowledge.memoryCompact(be, 10)
      expect(r).toContain('[pattern]')
    })
  })
})
