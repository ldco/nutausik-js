#!/usr/bin/env node
import { parseHookInput } from './common.js'
import { BrainSearch } from '../brain/search.js'

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0

  const ctx = await parseHookInput()
  if (ctx.tool_name === 'Write' || ctx.tool_name === 'Edit') {
    const filePath: string = String(ctx.tool_input.filePath ?? '')
    if (filePath) {
      const bs = new BrainSearch()
      const results = bs.search(filePath.replace(/.*\//, '').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), 3)
      if (results.length > 0) {
        console.error(`TAUSIK: Brain suggests ${results.length} related artifact(s) for '${filePath}'`)
      }
    }
  }

  return 0
}

main().then(process.exit)
