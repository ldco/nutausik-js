export interface Receipt {
  schema: string
  task_slug: string
  git_sha: string | null
  scope: string
  gates: { name: string; passed: boolean; severity: string }[]
  passed: boolean
  ran_at: string
  files_hash: string | null
  key_fingerprint: string | null
}

export class ReceiptError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReceiptError'
  }
}

export function buildReceipt(
  taskSlug: string,
  gitSha: string | null,
  scope: string,
  gates: { name: string; passed: boolean; severity: string }[],
  passed: boolean,
  ranAt: string,
  filesHash: string | null,
  keyFingerprint: string | null,
): Receipt {
  const sortedGates = [...gates].sort((a, b) => a.name.localeCompare(b.name))
  return {
    schema: 'tausik-receipt/v1',
    task_slug: taskSlug,
    git_sha: gitSha,
    scope,
    gates: sortedGates,
    passed,
    ran_at: ranAt,
    files_hash: filesHash,
    key_fingerprint: keyFingerprint,
  }
}

export function canonicalBytes(receipt: Receipt): Uint8Array {
  const json = canonicalJson(receipt)
  return new TextEncoder().encode(json)
}

function canonicalJson(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null'
  if (typeof obj === 'string') return JSON.stringify(obj)
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  if (Array.isArray(obj)) {
    const items = obj.map((v) => canonicalJson(v))
    return `[${items.join(',')}]`
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>).sort()
    const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((obj as Record<string, unknown>)[k])}`)
    return `{${pairs.join(',')}}`
  }
  throw new ReceiptError(`Cannot canonicalize value of type ${typeof obj}`)
}
