import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdtempSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadSeed, saveSeed, fingerprint, loadOrCreateSeed, KeyError } from '../../../src/crypto/keys.js'
import { publicFromSeed } from '../../../src/crypto/ed25519.js'

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nutausik-key-test-'))
  mkdirSync(join(dir, '.nutausik'), { recursive: true })
  return dir
}

describe('saveSeed and loadSeed', () => {
  it('saves and loads a 32-byte key', () => {
    const dir = tempDir()
    const seed = new Uint8Array(32).fill(42)
    saveSeed(dir, seed)
    const loaded = loadSeed(dir)
    expect(loaded).toEqual(seed)
  })

  it('generates a key when none provided', () => {
    const dir = tempDir()
    const seed = saveSeed(dir)
    expect(seed.length).toBe(32)
    const loaded = loadSeed(dir)
    expect(loaded).toEqual(seed)
  })

  it('throws KeyError when no key file exists', () => {
    expect(() => loadSeed('/nonexistent')).toThrow(KeyError)
  })
})

describe('loadOrCreateSeed', () => {
  it('creates key when missing', () => {
    const dir = tempDir()
    const seed = loadOrCreateSeed(dir)
    expect(seed.length).toBe(32)
  })

  it('reuses existing key', () => {
    const dir = tempDir()
    const seed1 = loadOrCreateSeed(dir)
    const seed2 = loadOrCreateSeed(dir)
    expect(seed1).toEqual(seed2)
  })
})

describe('fingerprint', () => {
  it('produces a 16-char hex string', () => {
    const seed = new Uint8Array(32).fill(1)
    const pub = publicFromSeed(seed)
    const fp = fingerprint(pub)
    expect(fp).toMatch(/^[0-9a-f]{16}$/)
  })

  it('is deterministic for the same public key', () => {
    const seed = new Uint8Array(32).fill(1)
    const pub = publicFromSeed(seed)
    expect(fingerprint(pub)).toBe(fingerprint(pub))
  })
})
