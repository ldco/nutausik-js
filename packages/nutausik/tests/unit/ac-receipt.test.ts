import { describe, it, expect } from 'vitest'
import { emitReceipt } from '../../src/verify/receipt-emit.js'
import { checkReceiptStructure } from '../../src/verify/receipt-check.js'
import { buildReceipt } from '../../src/crypto/receipt.js'
import { projectKeypair, saveSeed } from '../../src/crypto/keys.js'
import { signReceipt } from '../../src/crypto/sign.js'
import Database from 'better-sqlite3'
import * as crud from '../../src/backend/crud.js'
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { initFreshSchema } from '../../src/backend/init.js'

function makeBackend() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initFreshSchema(db)
  return { db, be: { db, close: () => db.close(), inTransaction: (fn: () => unknown) => fn(), dbPath: ':memory:' } as never }
}

describe('Receipt wiring (Session 11)', () => {
  describe('emitReceipt', () => {
    it('writes receipt to meta store after verify', () => {
      const { be } = makeBackend()
      crud.taskAdd(be, 't1', 'T1', { goal: 'G', acceptance_criteria: 'AC' })
      const gates = [{ name: 'tsc', passed: true, severity: 'block' as const }]
      const receipt = emitReceipt(be, 't1', 'standard', gates, true)
      expect(receipt.schema).toBe('tausik-receipt/v1')
      expect(receipt.task_slug).toBe('t1')

      const stored = crud.metaGet(be, `receipt:t1:${receipt.ran_at}`)
      expect(stored).toBeDefined()
      expect(stored).toContain('tausik-receipt/v1')
    })
  })

  describe('checkReceiptStructure', () => {
    it('validates correct receipt', () => {
      const r = buildReceipt('t1', null, 'standard', [{ name: 'tsc', passed: true, severity: 'block' }], true, '2026-01-01T00:00:00Z', null, null)
      expect(checkReceiptStructure(r).valid).toBe(true)
    })

    it('rejects null receipt', () => {
      expect(checkReceiptStructure(null).valid).toBe(false)
    })

    it('rejects missing schema', () => {
      expect(checkReceiptStructure({ task_slug: 't1', gates: [] }).valid).toBe(false)
    })
  })

  describe('receipt round-trip with crypto', () => {
    it('signs and verifies receipt', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'receipt-test-'))
      mkdirSync(join(dir, '.nutausik'), { recursive: true })
      saveSeed(dir)
      try {
        const receipt = buildReceipt('t1', null, 'standard', [{ name: 'tsc', passed: true, severity: 'block' }], true, '2026-01-01T00:00:00Z', null, null)
        const { signReceipt, verifyReceipt } = await import('../../src/crypto/sign.js')
        const envelope = signReceipt(dir, receipt)
        expect(envelope.envelope).toBe('tausik-signed/v1')
        const kp = projectKeypair(dir)
        expect(verifyReceipt(envelope, kp.publicKey)).toBe(true)
      } finally { rmSync(dir, { recursive: true, force: true }) }
    })
  })
})
