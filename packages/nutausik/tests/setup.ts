import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export function createTempDir(initTausik = true): string {
  const dir = mkdtempSync(join(tmpdir(), 'nutausik-test-'))
  if (initTausik) {
    mkdirSync(join(dir, '.nutausik'), { recursive: true })
  }
  return dir
}

export function createConfig(dir: string, config: Record<string, unknown>): void {
  writeFileSync(
    join(dir, '.nutausik', 'config.json'),
    JSON.stringify(config, null, 2) + '\n',
    'utf-8'
  )
}

export function cleanupDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}
