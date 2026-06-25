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

  const dbPath = join(projectDir, '.nutausik', 'nutausik.db')
  try {
    
    const db = new Database(dbPath, { readonly: true, timeout: 2000 })
    const row = db.prepare("SELECT scope_paths FROM tasks WHERE status = 'active' AND scope_paths IS NOT NULL LIMIT 1").get() as { scope_paths: string } | undefined
    db.close()

    if (!row?.scope_paths) return 0

    const allowedPaths: string[] = JSON.parse(row.scope_paths)
    const filePath: string = String(ctx.tool_input.filePath ?? '')

    if (filePath && allowedPaths.length > 0) {
      const inScope = allowedPaths.some(p => filePath.startsWith(p))
      if (!inScope) {
        console.error(`TAUSIK: BLOCKED — ${filePath} is outside allowed scope paths: ${allowedPaths.join(', ')}`)
        return 2
      }
    }

    return 0
  } catch {
    return 0
  }
}

main().then(process.exit)
