import { describe, it, expect } from 'vitest'
import { buildReceipt, canonicalBytes, type Receipt } from '../../../src/crypto/receipt.js'

describe('buildReceipt', () => {
  it('builds a receipt with all fields', () => {
    const r = buildReceipt('task-1', 'abc123', 'standard', [
      { name: 'ruff', passed: true, severity: 'block' },
      { name: 'filesize', passed: true, severity: 'warn' },
    ], true, '2026-01-01T00:00:00Z', 'abc123def', 'fp1234')
    expect(r.schema).toBe('tausik-receipt/v1')
    expect(r.task_slug).toBe('task-1')
    expect(r.git_sha).toBe('abc123')
    expect(r.passed).toBe(true)
    expect(r.gates).toHaveLength(2)
  })
})

describe('canonicalBytes', () => {
  it('produces deterministic output', () => {
    const r = buildReceipt('task-1', null, 'standard', [], true, '2026-01-01T00:00:00Z', null, null)
    const bytes1 = canonicalBytes(r)
    const bytes2 = canonicalBytes(r)
    expect(bytes1).toEqual(bytes2)
  })

  it('serializes with sorted keys', () => {
    const r = buildReceipt('t1', null, 'lightweight', [], false, '2026-06-01T00:00:00Z', null, null)
    const bytes = canonicalBytes(r)
    const str = new TextDecoder().decode(bytes)
    expect(str).toContain('"files_hash":null')
    expect(str).toContain('"gates":[]')
    expect(str).toContain('"git_sha":null')
    expect(str).toContain('"key_fingerprint":null')
    expect(str).toContain('"passed":false')
    expect(str).toContain('"schema":')
    expect(str).toContain('"task_slug":')
    // Verify sorted keys by position
    const keys = ['files_hash', 'gates', 'git_sha', 'key_fingerprint', 'passed', 'ran_at', 'schema', 'scope', 'task_slug']
    for (let i = 1; i < keys.length; i++) {
      expect(str.indexOf(keys[i]!)).toBeGreaterThan(str.indexOf(keys[i - 1]!))
    }
  })

  it('produces the same output for identical receipts on multiple runs', () => {
    const r1 = buildReceipt('task-x', 'deadbeef', 'high', [{ name: 'test', passed: true, severity: 'block' }], true, '2026-06-01T00:00:00Z', 'hash123', 'fp999')
    const r2 = buildReceipt('task-x', 'deadbeef', 'high', [{ name: 'test', passed: true, severity: 'block' }], true, '2026-06-01T00:00:00Z', 'hash123', 'fp999')
    expect(canonicalBytes(r1)).toEqual(canonicalBytes(r2))
  })
})
