#!/usr/bin/env node
import { isNutausikProject, parseHookInput } from './common.js'
import { execa } from 'execa'

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0
  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  if (!isNutausikProject(projectDir)) return 0

  const ctx = await parseHookInput()
  if (ctx.tool_name !== 'Write' && ctx.tool_name !== 'Edit') return 0

  const filePath = String(ctx.tool_input.filePath ?? '')
  if (!filePath) return 0

  try {
    if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
      await execa('npx', ['prettier', '--write', filePath], { cwd: projectDir }).catch(() => {})
    }
    if (/\.py$/.test(filePath)) {
      await execa('ruff', ['format', filePath], { cwd: projectDir }).catch(() => {})
    }
  } catch {
    // best-effort formatting
  }
  return 0
}

main().then(process.exit)
