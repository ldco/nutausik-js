import { publicFromSeed, sign, verify, bytesToHex, hexToBytes } from './ed25519.js'
import { loadSeed, fingerprint } from './keys.js'
import { canonicalBytes, type Receipt } from './receipt.js'

const ENVELOPE_SCHEMA = 'tausik-signed/v1'

export class SignError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignError'
  }
}

export interface SignedEnvelope {
  envelope: string
  receipt: Receipt
  signature: {
    algorithm: string
    key_fingerprint: string
    value: string
  }
}

export function signReceipt(projectDir: string, receipt: Receipt): SignedEnvelope {
  const seed = loadSeed(projectDir)
  const publicKey = publicFromSeed(seed)
  const payload = canonicalBytes(receipt)
  const sig = sign(seed, payload)
  return {
    envelope: ENVELOPE_SCHEMA,
    receipt,
    signature: {
      algorithm: 'ed25519',
      key_fingerprint: fingerprint(publicKey),
      value: bytesToHex(sig),
    },
  }
}

export function verifyReceipt(
  envelope: SignedEnvelope,
  publicKey: Uint8Array,
): boolean {
  if (envelope.envelope !== ENVELOPE_SCHEMA) {
    throw new SignError(`Unknown envelope schema: ${envelope.envelope}`)
  }
  const payload = canonicalBytes(envelope.receipt)
  const sigBytes = hexToBytes(envelope.signature.value)
  return verify(publicKey, payload, sigBytes)
}

export function verifyReceiptWithSeed(
  envelope: SignedEnvelope,
  seed: Uint8Array,
): boolean {
  const publicKey = publicFromSeed(seed)
  return verifyReceipt(envelope, publicKey)
}
