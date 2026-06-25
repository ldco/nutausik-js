#!/usr/bin/env node
import { isNutausikProject, hasActiveTask } from './common.js'
import { join } from 'node:path'

async function main(): Promise<number> {
  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  if (!isNutausikProject(projectDir)) return 0

  const dbPath = join(projectDir, '.nutausik', 'nutausik.db')
  try {
    const active = hasActiveTask(dbPath)
    const statusLine = active
      ? 'TAUSIK: Active task detected. Continue working.'
      : 'TAUSIK: No active task. Start one with task_start().'
    console.log(statusLine)
  } catch {
    // fail-open
  }
  return 0
}

main().then(process.exit)
