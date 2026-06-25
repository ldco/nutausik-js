#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { isNutausikProject, parseHookInput, hasActiveTask } from './common.js'

const NUTAUSIK_SKIP_HOOKS = process.env['NUTAUSIK_SKIP_HOOKS']
const NUTAUSIK_HOOK_FAIL_SECURE = process.env['NUTAUSIK_HOOK_FAIL_SECURE']

async function main(): Promise<number> {
  if (NUTAUSIK_SKIP_HOOKS) return 0

  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  if (!isNutausikProject(projectDir)) return 0

  const ctx = await parseHookInput()
  if (ctx.tool_name !== 'Write' && ctx.tool_name !== 'Edit') return 0

  const dbPath = join(projectDir, '.nutausik', 'nutausik.db')
  if (!existsSync(dbPath)) return 0

  try {
    const active = hasActiveTask(dbPath)
    if (!active) {
      console.error('TAUSIK: No active task. Create and start a task before editing.')
      return 2
    }
    return 0
  } catch (err) {
    if (NUTAUSIK_HOOK_FAIL_SECURE === '1') {
      console.error(`TAUSIK: Hook error (fail-secure): ${(err as Error).message}`)
      return 2
    }
    return 0
  }
}

main().then(process.exit)
