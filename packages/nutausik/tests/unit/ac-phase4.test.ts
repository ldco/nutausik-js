import { describe, it, expect } from 'vitest'
import { generateSeed, publicFromSeed, sign, verify, bytesToHex } from '../../src/crypto/ed25519.js'
import { projectKeypair, fingerprint, saveSeed } from '../../src/crypto/keys.js'
import { buildReceipt, canonicalBytes } from '../../src/crypto/receipt.js'
import { signReceipt, verifyReceipt } from '../../src/crypto/sign.js'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

function withProject(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'crypto-ac-'))
  mkdirSync(join(dir, '.nutausik'), { recursive: true })
  saveSeed(dir)
  try { fn(dir) } finally { rmSync(dir, { recursive: true, force: true }) }
}

describe('Phase 4 — Crypto AC items', () => {
  describe('AC-4.1/4.2: Key generation', () => {
    it('AC-4.1: projectKeypair generates keypair', () => withProject((dir) => {
      const kp = projectKeypair(dir)
      expect(kp).toBeDefined()
      expect(kp.publicKey.length).toBe(32)
    }))

    it('AC-4.2: fingerprint derived from public key', () => withProject((dir) => {
      const kp = projectKeypair(dir)
      const fp = fingerprint(kp.publicKey)
      expect(fp.length).toBe(16) // fingerprint is first 8 bytes = 16 hex chars
    }))
  })

  describe('AC-4.5: RFC 8032 Section 7.1 vectors', () => {
    const seed = new Uint8Array([0x9d, 0x61, 0xb1, 0x9d, 0xef, 0xfd, 0x5a, 0x60, 0xba, 0x84, 0x4a, 0xf4, 0x92, 0xec, 0x2c, 0xc4, 0x44, 0x49, 0xc5, 0x69, 0x7b, 0x32, 0x69, 0x19, 0x70, 0x3b, 0xac, 0x03, 0x1c, 0xae, 0x7f, 0x60])
    const expectedPub = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
    const expectedSig = 'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'

    it('derives correct public key from seed', () => {
      expect(bytesToHex(publicFromSeed(seed))).toBe(expectedPub)
    })

    it('signs empty message with correct signature', () => {
      expect(bytesToHex(sign(seed, new Uint8Array(0)))).toBe(expectedSig)
    })

    it('verifies against public key (round-trip)', () => {
      const seed = generateSeed()
      const pub = publicFromSeed(seed)
      const msg = new TextEncoder().encode('test')
      const sig = sign(seed, msg)
      expect(verify(pub, msg, sig)).toBe(true)
    })
  })

  describe('AC-4.7: buildReceipt', () => {
    it('builds receipt with correct schema', () => {
      const r = buildReceipt('t1', null, 'standard', [{ name: 'tsc', passed: true, severity: 'block' }], true, '2026-01-01T00:00:00Z', 'abc', 'fp123')
      expect(r.schema).toBe('tausik-receipt/v1')
      expect(r.task_slug).toBe('t1')
    })
  })

  describe('AC-4.8: canonicalBytes deterministic', () => {
    it('produces same bytes for same input', () => {
      const r = buildReceipt('t1', null, 'standard', [], true, '2026-01-01T00:00:00Z', null, null)
      expect(canonicalBytes(r)).toEqual(canonicalBytes(r))
    })
  })

  describe('AC-4.9/4.10: sign/verify', () => {
    it('signs and verifies its own receipt', () => withProject((dir) => {
      const receipt = buildReceipt('t1', null, 'standard', [{ name: 'tsc', passed: true, severity: 'block' }], true, '2026-01-01T00:00:00Z', null, null)
      const envelope = signReceipt(dir, receipt)
      expect(envelope.envelope).toBe('tausik-signed/v1')
      const kp = projectKeypair(dir)
      expect(verifyReceipt(envelope, kp.publicKey)).toBe(true)
    }))

    it('rejects tampered receipt', () => withProject((dir) => {
      const receipt = buildReceipt('t1', null, 'standard', [], true, '2026-01-01T00:00:00Z', null, null)
      const envelope = signReceipt(dir, receipt)
      envelope.receipt.task_slug = 'tampered'
      const kp = projectKeypair(dir)
      expect(verifyReceipt(envelope, kp.publicKey)).toBe(false)
    }))
  })

  describe('AC-4.11: generateSeed', () => {
    it('generates random 32-byte seeds', () => {
      const s1 = generateSeed()
      const s2 = generateSeed()
      expect(s1.length).toBe(32)
      expect(bytesToHex(s1)).not.toBe(bytesToHex(s2))
    })
  })

  describe('AC-4.12: sign/verify round-trip', () => {
    it('sign/verify round-trip works for non-empty message', () => {
      const seed = generateSeed()
      const pub = publicFromSeed(seed)
      const msg = new TextEncoder().encode('test message')
      expect(verify(pub, msg, sign(seed, msg))).toBe(true)
    })
  })
})
