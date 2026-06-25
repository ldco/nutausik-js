import { buildReceipt, canonicalBytes, type Receipt } from '../crypto/receipt.js'
import { sign } from '../crypto/ed25519.js'
import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'

export function emitReceipt(be: SQLiteBackend, taskSlug: string, scope: string, gates: { name: string; passed: boolean; severity: string }[], passed: boolean): Receipt {
  const gitSha = null // could be read from git
  const ranAt = new Date().toISOString()
  const filesHash = null // set by verify
  const keyFingerprint = null // set by crypto

  const receipt = buildReceipt(taskSlug, gitSha, scope, gates, passed, ranAt, filesHash, keyFingerprint)
  const bytes = canonicalBytes(receipt)

  // Sign with project key if available
  let signature: string | null = null
  try {
    const { projectKeypair } = require('../crypto/keys.js')
    const kp = projectKeypair()
    if (kp) {
      const sig = sign(kp.secretKey, bytes)
      signature = Buffer.from(sig).toString('hex')
    }
  } catch { /* no key available, emit unsigned */ }

  crud.metaSet(be, `receipt:${taskSlug}:${ranAt}`, JSON.stringify({ receipt, signature }))

  return receipt
}
