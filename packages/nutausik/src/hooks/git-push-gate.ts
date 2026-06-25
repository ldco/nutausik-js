#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseHookInput } from './common.js'

const MAIN_BRANCHES = new Set(['main', 'master'])
const CMD_START = /(?:^|[\s;&|()`])/
const GIT_PUSH_RE = new RegExp(`${CMD_START.source}(?:\\S*\\/)?git(?:\\s+(?:-[a-z]+\\s+)*)?push\\s+`, 'i')

interface PushTicket {
  branch: string
  expires_at: string
}

function hasValidPushTicket(): boolean {
  try {
    const home = process.env['HOME']
    if (!home) return false
    const ticketsDir = join(home, '.nutausik')
    const ticketPath = join(ticketsDir, 'push-ticket.json')
    if (!existsSync(ticketPath)) return false
    const ticket = JSON.parse(readFileSync(ticketPath, 'utf-8')) as PushTicket
    const now = new Date()
    const expires = new Date(ticket.expires_at)
    if (now > expires) {
      writeFileSync(ticketPath, '{}')
      return false
    }
    return true
  } catch {
    return false
  }
}

function parseBranch(command: string): string | null {
  const parts = command.split(/\s+/)
  const pushIdx = parts.findIndex(p => p === 'push')
  if (pushIdx === -1) return null
  const refspec = parts.slice(pushIdx + 1).find(p => p.includes(':'))
  if (!refspec) return null
  return refspec.split(':')[1] ?? null
}

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0

  const ctx = await parseHookInput()
  if (ctx.tool_name !== 'Bash') return 0

  const command: string = String(ctx.tool_input.command ?? '')
  if (!GIT_PUSH_RE.test(command)) return 0

  const branch = parseBranch(command)
  if (!branch || !MAIN_BRANCHES.has(branch)) return 0

  if (hasValidPushTicket()) return 0

  console.error(`TAUSIK: BLOCKED — push to '${branch}' requires a push ticket.`)
  console.error('  Run: nutausik push-ok <reason>')
  return 2
}

main().then(process.exit)
