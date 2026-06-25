import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { generateSeed, publicFromSeed, bytesToHex } from './ed25519.js'
import { configPath } from '../config.js'

const KEY_FILENAME = 'nutausik.key'
const KEY_LENGTH = 32

export class KeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KeyError'
  }
}

export function seedPath(projectDir: string): string {
  const cfgPath = configPath(projectDir)
  return join(cfgPath, '..', KEY_FILENAME)
}

export function loadSeed(projectDir: string): Uint8Array {
  const path = seedPath(projectDir)
  if (!existsSync(path)) {
    throw new KeyError(`No project key found at ${path}. Run 'nutausik key generate'.`)
  }
  const data = readFileSync(path)
  if (data.length !== KEY_LENGTH) {
    throw new KeyError(`Invalid key file at ${path}: expected ${KEY_LENGTH} bytes, got ${data.length}`)
  }
  return new Uint8Array(data)
}

export function saveSeed(projectDir: string, seed?: Uint8Array): Uint8Array {
  const key = seed ?? generateSeed()
  const path = seedPath(projectDir)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, Buffer.from(key), { mode: 0o600 })
  return key
}

export function loadOrCreateSeed(projectDir: string): Uint8Array {
  const path = seedPath(projectDir)
  if (existsSync(path)) {
    return loadSeed(projectDir)
  }
  return saveSeed(projectDir)
}

export function fingerprint(publicKey: Uint8Array): string {
  const hash = createHash('sha256').update(Buffer.from(publicKey)).digest()
  return bytesToHex(new Uint8Array(hash.slice(0, 8)))
}

export function projectKeypair(projectDir: string): { seed: Uint8Array; publicKey: Uint8Array; fingerprint: string } {
  const seed = loadOrCreateSeed(projectDir)
  const publicKey = publicFromSeed(seed)
  return { seed, publicKey, fingerprint: fingerprint(publicKey) }
}
