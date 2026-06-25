import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildReceipt } from '../../../src/crypto/receipt.js'
import { saveSeed } from '../../../src/crypto/keys.js'
import { signReceipt, verifyReceipt, verifyReceiptWithSeed } from '../../../src/crypto/sign.js'
import { publicFromSeed } from '../../../src/crypto/ed25519.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tausik-sign-test-'))
  mkdirSync(join(dir, '.tausik'), { recursive: true })
  return dir
}

describe('signReceipt / verifyReceipt', () => {
  let projectDir: string
  let seed: Uint8Array

  beforeEach(() => {
    projectDir = tempProject()
    seed = new Uint8Array(32).fill(99)
    saveSeed(projectDir, seed)
  })

  it('signs and verifies a receipt', () => {
    const receipt = buildReceipt('task-1', 'abc123', 'standard', [
      { name: 'ruff', passed: true, severity: 'block' },
    ], true, '2026-01-01T00:00:00Z', 'hash123', null)

    const envelope = signReceipt(projectDir, receipt)
    expect(envelope.envelope).toBe('tausik-signed/v1')
    expect(envelope.signature.algorithm).toBe('ed25519')
    expect(envelope.signature.value.length).toBe(128) // 64 bytes hex

    const pub = publicFromSeed(seed)
    expect(verifyReceipt(envelope, pub)).toBe(true)
  })

  it('rejects tampered receipt', () => {
    const receipt = buildReceipt('task-1', 'abc123', 'standard', [], true, '2026-01-01T00:00:00Z', null, null)
    const envelope = signReceipt(projectDir, receipt)

    envelope.receipt.task_slug = 'task-2' // tamper
    const pub = publicFromSeed(seed)
    expect(verifyReceipt(envelope, pub)).toBe(false)
  })

  it('verifies with seed directly', () => {
    const receipt = buildReceipt('task-1', null, 'standard', [], true, '2026-01-01T00:00:00Z', null, null)
    const envelope = signReceipt(projectDir, receipt)
    expect(verifyReceiptWithSeed(envelope, seed)).toBe(true)
  })

  it('rejects wrong key', () => {
    const receipt = buildReceipt('task-1', null, 'standard', [], true, '2026-01-01T00:00:00Z', null, null)
    const envelope = signReceipt(projectDir, receipt)
    const wrongSeed = new Uint8Array(32).fill(1)
    expect(verifyReceiptWithSeed(envelope, wrongSeed)).toBe(false)
  })
})
