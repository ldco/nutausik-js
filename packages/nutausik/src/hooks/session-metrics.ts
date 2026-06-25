#!/usr/bin/env node
import Database from 'better-sqlite3'
import { isNutausikProject } from './common.js'
import { join } from 'node:path'

async function main(): Promise<number> {
  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  if (!isNutausikProject(projectDir)) return 0

  const dbPath = join(projectDir, '.nutausik', 'nutausik.db')
  try {
    
    const db = new Database(dbPath, { readonly: true, timeout: 2000 })
    const active = db.prepare("SELECT COUNT(*) as cnt FROM sessions WHERE ended_at IS NULL").get() as { cnt: number }
    db.close()
    if (active.cnt > 0) {
      console.log(`TAUSIK: ${active.cnt} active session(s)`)
    }
    return 0
  } catch {
    return 0
  }
}

main().then(process.exit)
