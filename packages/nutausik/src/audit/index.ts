import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

export interface AuditEntry {
  type: 'file' | 'config' | 'security' | 'coverage'
  path: string
  status: 'ok' | 'warn' | 'fail'
  message: string
}

export function runAudit(projectDir: string): AuditEntry[] {
  const entries: AuditEntry[] = []

  const configPath = join(projectDir, '.nutausik', 'config.json')
  if (existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, 'utf-8'))
      if (!cfg.project) entries.push({ type: 'config', path: 'config.json', status: 'warn', message: 'Missing project name in config' })
      else entries.push({ type: 'config', path: 'config.json', status: 'ok', message: `Project: ${cfg.project}` })
    } catch {
      entries.push({ type: 'config', path: 'config.json', status: 'fail', message: 'Invalid JSON in config' })
    }
  } else {
    entries.push({ type: 'config', path: 'config.json', status: 'fail', message: 'Missing config.json' })
  }

  const dbPath = join(projectDir, '.nutausik', 'nutausik.db')
  if (existsSync(dbPath)) {
    const sizeKb = statSync(dbPath).size / 1024
    entries.push({ type: 'file', path: 'nutausik.db', status: sizeKb > 100 ? 'warn' : 'ok', message: `${sizeKb.toFixed(0)} KB` })
  } else {
    entries.push({ type: 'file', path: 'nutausik.db', status: 'warn', message: 'No database yet' })
  }

  const stubFiles = ['package.json', 'tsconfig.json']
  for (const f of stubFiles) {
    if (existsSync(join(projectDir, f))) {
      entries.push({ type: 'coverage', path: f, status: 'ok', message: 'Present' })
    }
  }

  return entries
}
