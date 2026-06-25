#!/usr/bin/env node
import { isNutausikProject, parseHookInput } from './common.js'
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT_LIMIT = 8000

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0

  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  if (!isNutausikProject(projectDir)) return 0

  const ctx = await parseHookInput()

  if (ctx.tool_name === 'Bash') {
    const output: string = String(ctx.tool_input.output ?? '')
    if (output.length > OUTPUT_LIMIT) {
      console.error(`TAUSIK: Tool output truncated (${output.length} chars, limit ${OUTPUT_LIMIT}). Consider piping to a file.`)
    }
  }

  if (ctx.tool_name === 'Write' || ctx.tool_name === 'Edit') {
    const filePath: string = String(ctx.tool_input.filePath ?? '')
    const content: string = String(ctx.tool_input.content ?? '')
    if (filePath && content) {
      const logPath = join(projectDir, '.nutausik', 'activity.log')
      const entry = `${new Date().toISOString()} ${ctx.tool_name} ${filePath} (${content.length} chars)\n`
      try {
        appendFileSync(logPath, entry)
      } catch { /* skip if DB locked */ }
    }
  }

  return 0
}

main().then(process.exit)
