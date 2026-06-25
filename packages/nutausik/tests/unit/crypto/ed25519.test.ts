import { describe, it, expect } from 'vitest'
import { generateSeed, publicFromSeed, sign, verify, bytesToHex, hexToBytes } from '../../../src/crypto/ed25519.js'

describe('ed25519 key generation', () => {
  it('generates a 32-byte seed', () => {
    const seed = generateSeed()
    expect(seed.length).toBe(32)
  })

  it('derives a 32-byte public key from seed', () => {
    const seed = generateSeed()
    const pub = publicFromSeed(seed)
    expect(pub.length).toBe(32)
  })

  it('produces deterministic public key from the same seed', () => {
    const seed = generateSeed()
    const pub1 = publicFromSeed(seed)
    const pub2 = publicFromSeed(seed)
    expect(pub1).toEqual(pub2)
  })
})

describe('ed25519 sign/verify round trip', () => {
  it('signs and verifies a message', () => {
    const seed = generateSeed()
    const pub = publicFromSeed(seed)
    const msg = new TextEncoder().encode('test message')
    const sig = sign(seed, msg)
    expect(sig.length).toBe(64)
    expect(verify(pub, msg, sig)).toBe(true)
  })

  it('rejects tampered signature', () => {
    const seed = generateSeed()
    const pub = publicFromSeed(seed)
    const msg = new TextEncoder().encode('test message')
    const sig = sign(seed, msg)
    const tamperedMsg = new TextEncoder().encode('tampered message')
    expect(verify(pub, tamperedMsg, sig)).toBe(false)
  })

  it('rejects wrong public key', () => {
    const seed1 = generateSeed()
    const seed2 = generateSeed()
    const pub2 = publicFromSeed(seed2)
    const msg = new TextEncoder().encode('test')
    const sig = sign(seed1, msg)
    expect(verify(pub2, msg, sig)).toBe(false)
  })
})

describe('hex conversion', () => {
  it('converts bytes to hex and back', () => {
    const original = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
    const hex = bytesToHex(original)
    expect(hex).toBe('deadbeef')
    expect(hexToBytes(hex)).toEqual(original)
  })
})
