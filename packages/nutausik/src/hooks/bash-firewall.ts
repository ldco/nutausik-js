#!/usr/bin/env node
import { parseHookInput } from './common.js'

const CMD_START = /(?:^|[\s;&|()`])/
const GIT_PUSH_RE = new RegExp(`${CMD_START.source}(?:\\S*\\/)?git(?:\\s+(?:-[a-z]+\\s+)*)?push\\s+.*--force`, 'i')

const BLOCKED_PATTERNS: [RegExp, string][] = [
  [/^rm -rf \//, 'Recursive delete from root'],
  [/^rm -rf \/\*/, 'Recursive delete from root (wildcard)'],
  [/^rm -rf \.\s/, 'Recursive delete from current directory'],
  [/DROP TABLE/i, 'SQL table drop'],
  [/DROP DATABASE/i, 'SQL database drop'],
  [/TRUNCATE TABLE/i, 'SQL table truncate'],
  [/:\(\)\{\|:&\};\:/, 'Fork bomb'],
  [/mkfs\./, 'Filesystem format'],
  [/dd if=\/dev\/zero/, 'Disk wipe'],
  [/> \/dev\/sda/, 'Disk overwrite'],
  [GIT_PUSH_RE, 'Force push blocked'],
]

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0

  const ctx = await parseHookInput()
  if (ctx.tool_name !== 'Bash') return 0

  const command: string = String(ctx.tool_input.command ?? '')

  for (const [pattern, label] of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      console.error(`TAUSIK: BLOCKED — ${label}. Command: ${command}`)
      return 2
    }
  }

  return 0
}

main().then(process.exit)
