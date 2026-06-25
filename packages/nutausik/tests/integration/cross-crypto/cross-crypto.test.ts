import { describe, it, expect } from 'vitest'
import { generateSeed, publicFromSeed, sign, verify, bytesToHex, hexToBytes } from '../../../src/crypto/ed25519.js'
import { buildReceipt, canonicalBytes, type Receipt } from '../../../src/crypto/receipt.js'
import vectors from './test_vectors.json'

// ── Test helpers ──────────────────────────────────────────────────

function hexStr(b: Uint8Array): string {
  return bytesToHex(b)
}

function fromHex(h: string): Uint8Array {
  return hexToBytes(h)
}

function decodeHex(s: string): string {
  return new TextDecoder().decode(fromHex(s))
}

// ── Cross-platform crypto tests ──────────────────────────────────

describe('RFC 8032 Section 7.1 — cross-platform reference vectors', () => {
  const v = vectors.rfc8032_section_7_1

  it('derives correct public key from known seed', () => {
    const seed = fromHex(v.seed_hex)
    const pub = publicFromSeed(seed)
    expect(hexStr(pub)).toBe(v.expected_public_hex)
  })

  it('produces known signature for empty message', () => {
    const seed = fromHex(v.seed_hex)
    const msg = fromHex(v.message_hex)
    const sig = sign(seed, msg)
    expect(hexStr(sig)).toBe(v.expected_signature_hex)
  })

  it('verifies known signature', () => {
    const pub = fromHex(v.expected_public_hex)
    const msg = fromHex(v.message_hex)
    const sig = fromHex(v.expected_signature_hex)
    expect(verify(pub, msg, sig)).toBe(true)
  })

  it('rejects tampered message against known public key', () => {
    const pub = fromHex(v.expected_public_hex)
    const msg = new TextEncoder().encode('tampered')
    const sig = fromHex(v.expected_signature_hex)
    expect(verify(pub, msg, sig)).toBe(false)
  })
})

describe('TAUSIK deterministic test vectors — cross-platform', () => {
  const v = vectors.tausik_test

  it('derives correct public key from deterministic seed', () => {
    const seed = fromHex(v.seed_hex)
    const pub = publicFromSeed(seed)
    expect(hexStr(pub)).toBe(v.public_hex)
  })

  it('produces matching signature for known message', () => {
    const seed = fromHex(v.seed_hex)
    const msg = fromHex(v.message_hex)
    const sig = sign(seed, msg)
    expect(hexStr(sig)).toBe(v.signature_hex)
  })

  it('verifies Python-generated signature in TS', () => {
    const pub = fromHex(v.public_hex)
    const msg = fromHex(v.message_hex)
    const sig = fromHex(v.signature_hex)
    expect(verify(pub, msg, sig)).toBe(true)
  })
})

describe('Canonical receipt bytes — Python↔TS identical', () => {
  const v = vectors.canonical_receipt

  it('produces identical canonical bytes to Python', () => {
    const r = buildReceipt(
      v.input.task_slug,
      v.input.git_sha,
      v.input.scope,
      v.input.gates,
      v.input.passed,
      v.input.ran_at,
      v.input.files_hash,
      v.input.key_fingerprint,
    )
    const tsBytes = canonicalBytes(r)
    expect(hexStr(tsBytes)).toBe(v.canonical_bytes_hex)
  })

  it('verify Python-signed receipt in TS', () => {
    const r = buildReceipt(
      v.input.task_slug,
      v.input.git_sha,
      v.input.scope,
      v.input.gates,
      v.input.passed,
      v.input.ran_at,
      v.input.files_hash,
      v.input.key_fingerprint,
    )
    const pub = fromHex(vectors.tausik_test.public_hex)
    const receiptBytes = canonicalBytes(r)
    const sig = fromHex(v.signature_on_receipt_hex)
    expect(verify(pub, receiptBytes, sig)).toBe(true)
  })

  it('canonical JSON format matches (sorted keys, no whitespace)', () => {
    const r = buildReceipt(
      v.input.task_slug,
      v.input.git_sha,
      v.input.scope,
      v.input.gates,
      v.input.passed,
      v.input.ran_at,
      v.input.files_hash,
      v.input.key_fingerprint,
    )
    const tsJson = new TextDecoder().decode(canonicalBytes(r))
    const pyJson = decodeHex(v.canonical_bytes_hex)
    expect(tsJson).toBe(pyJson)
    // Verify it's compact: no spaces after : or ,
    expect(tsJson).not.toMatch(/:\s/)
    expect(tsJson).not.toMatch(/,\s/)
    // Verify top-level keys are sorted
    const top = tsJson.match(/^\{"[^"]+"/)
    expect(top).toBeTruthy()
    // Verify the JSON string starts with the alphabetically first key
    expect(tsJson).toMatch(/^\{("files_hash"):/)
  })
})

describe('Cross-platform envelope round-trip', () => {
  const v = vectors.canonical_receipt

  it('TS can build and verify its own envelope', () => {
    const r = buildReceipt(
      v.input.task_slug,
      v.input.git_sha,
      v.input.scope,
      v.input.gates,
      v.input.passed,
      v.input.ran_at,
      v.input.files_hash,
      v.input.key_fingerprint,
    )
    const seed = fromHex(vectors.tausik_test.seed_hex)
    const pub = publicFromSeed(seed)
    const receiptBytes = canonicalBytes(r)
    const sig = sign(seed, receiptBytes)
    expect(verify(pub, receiptBytes, sig)).toBe(true)
  })

  it('schema version is tausik-receipt/v1 (Python compatible)', () => {
    const r = buildReceipt('t1', null, 'standard', [], true, '2026-01-01T00:00:00Z', null, null)
    expect(r.schema).toBe('tausik-receipt/v1')
  })
})
