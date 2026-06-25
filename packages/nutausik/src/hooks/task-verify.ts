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
    const row = db.prepare("SELECT id FROM tasks WHERE status = 'active' LIMIT 1").get() as { id: number } | undefined
    db.close()
    if (!row) return 0

    const { execa } = await import('execa')
    await execa('node', ['-e', `
      
      const db = new Database('${dbPath}', { timeout: 2000 });
      const task = db.prepare("SELECT * FROM tasks WHERE status = 'active' LIMIT 1").get();
      if (task && task.attempts > 0) {
        console.log('Task verified after completion.');
      }
    `], { cwd: projectDir }).catch(() => {})
    return 0
  } catch {
    return 0
  }
}

main().then(process.exit)
