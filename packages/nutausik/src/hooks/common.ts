import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'

const NUTAUSIK_DIR = '.nutausik'

export interface HookContext {
  tool_name: string
  tool_input: Record<string, unknown>
}

export function isNutausikProject(projectDir: string): boolean {
  return existsSync(join(projectDir, NUTAUSIK_DIR))
}

export function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk) => { data += chunk })
    process.stdin.on('end', () => resolve(data))
  })
}

export async function parseHookInput(): Promise<HookContext> {
  const raw = await readStdin()
  try {
    const parsed = JSON.parse(raw)
    return {
      tool_name: parsed.tool_name ?? '',
      tool_input: parsed.tool_input ?? {},
    }
  } catch {
    return { tool_name: '', tool_input: {} }
  }
}

export function hasActiveTask(dbPath: string): boolean {
  try {
    const db = new Database(dbPath, { readonly: true, timeout: 2000 })
    const row = db.prepare("SELECT 1 FROM tasks WHERE status = 'active' LIMIT 1").get()
    db.close()
    return !!row
  } catch {
    return false
  }
}
