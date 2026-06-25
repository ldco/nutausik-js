import { canonicalBytes, type Receipt } from '../crypto/receipt.js'
import { verify } from '../crypto/ed25519.js'

export interface ReceiptVerification {
  valid: boolean
  reason: string
}

export function checkReceiptSignature(receipt: Receipt, signatureHex: string, publicKeyHex: string): ReceiptVerification {
  const bytes = canonicalBytes(receipt)
  const signature = Buffer.from(signatureHex, 'hex')
  const publicKey = Buffer.from(publicKeyHex, 'hex')

  const result = verify(publicKey, bytes, signature)
  return {
    valid: result,
    reason: result ? 'Signature valid' : 'Signature mismatch',
  }
}

export function checkReceiptStructure(receipt: unknown): ReceiptVerification {
  if (!receipt || typeof receipt !== 'object') {
    return { valid: false, reason: 'Receipt is not an object' }
  }
  const r = receipt as Record<string, unknown>
  if (r.schema !== 'tausik-receipt/v1') {
    return { valid: false, reason: `Unknown schema: ${r.schema}` }
  }
  if (!r.task_slug || typeof r.task_slug !== 'string') {
    return { valid: false, reason: 'Missing or invalid task_slug' }
  }
  if (!Array.isArray(r.gates)) {
    return { valid: false, reason: 'Missing or invalid gates array' }
  }
  return { valid: true, reason: 'Structure valid' }
}
