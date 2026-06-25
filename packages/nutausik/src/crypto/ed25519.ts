import { getPublicKey, sign as nobleSign, verify as nobleVerify, utils, etc } from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'
import { concatBytes } from '@noble/hashes/utils.js'

etc.sha512Sync = (...msgs: Uint8Array[]): Uint8Array => sha512(concatBytes(...msgs))

export function generateSeed(): Uint8Array {
  return utils.randomPrivateKey()
}

export function publicFromSeed(seed: Uint8Array): Uint8Array {
  return getPublicKey(seed)
}

export function sign(seed: Uint8Array, message: Uint8Array): Uint8Array {
  return nobleSign(message, seed)
}

export function verify(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
): boolean {
  return nobleVerify(signature, message, publicKey)
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
