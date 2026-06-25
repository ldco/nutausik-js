#!/usr/bin/env node
import Database from 'better-sqlite3'
import { isNutausikProject } from './common.js'
import { join } from 'node:path'

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0
  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  if (!isNutausikProject(projectDir)) return 0

  try {
    const dbPath = join(projectDir, '.nutausik', 'nutausik.db')
    const db = new Database(dbPath, { readonly: true, timeout: 2000 })
    const tasks = db.prepare("SELECT slug, call_budget, call_actual FROM tasks WHERE status = 'active' AND call_budget IS NOT NULL").all() as { slug: string; call_budget: number; call_actual: number }[]
    db.close()
    for (const t of tasks) {
      if (t.call_budget > 0 && t.call_actual >= t.call_budget * 0.8) {
        console.log(`TAUSIK: Task '${t.slug}' at ${Math.round(t.call_actual / t.call_budget * 100)}% of call budget (${t.call_actual}/${t.call_budget})`)
      }
    }
  } catch {
    // fail-open
  }
  return 0
}

main().then(process.exit)
