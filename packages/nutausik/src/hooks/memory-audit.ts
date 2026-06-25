#!/usr/bin/env node
import Database from 'better-sqlite3'
import { isNutausikProject, parseHookInput } from './common.js'
import { join } from 'node:path'

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0
  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  if (!isNutausikProject(projectDir)) return 0

  const ctx = await parseHookInput()
  if (ctx.tool_name !== 'Write' && ctx.tool_name !== 'Edit') return 0

  try {
    const dbPath = join(projectDir, '.nutausik', 'nutausik.db')
    const db = new Database(dbPath, { readonly: true, timeout: 2000 })
    const { count } = db.prepare("SELECT COUNT(*) as count FROM memory WHERE archived_at IS NULL AND length(content) > 2000").get() as { count: number }
    db.close()
    if (count > 5) {
      console.log(`TAUSIK: ${count} memory entries need cleanup (over 2000 chars). Consider memory_compact().`)
    }
  } catch {
    // fail-open
  }
  return 0
}

main().then(process.exit)
