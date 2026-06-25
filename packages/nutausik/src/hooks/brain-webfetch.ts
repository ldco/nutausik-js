#!/usr/bin/env node
import { parseHookInput } from './common.js'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0

  const ctx = await parseHookInput()
  if (ctx.tool_name !== 'nutausik_web_fetch' && ctx.tool_name !== 'webfetch') return 0

  const content: string = String(ctx.tool_input.url ?? '')
  if (!content) return 0

  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  const brainDir = join(projectDir, 'docs', 'brain')
  if (!existsSync(brainDir)) {
    mkdirSync(brainDir, { recursive: true })
  }

  const slug = `webfetch-${Date.now().toString(36)}`
  const entry = `# Web Fetch: ${ctx.tool_input.url}\n\nFetched at ${new Date().toISOString()}\n\nContent preview: ${content.slice(0, 200)}`
  writeFileSync(join(brainDir, `${slug}.md`), entry)

  return 0
}

main().then(process.exit)
