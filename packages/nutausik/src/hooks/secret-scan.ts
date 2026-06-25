#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execa } from 'execa'

const KEY_MARKER = '---'
const PRIV_MARKER = 'BEGIN'
const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{20,}/,           // OpenAI / Anthropic
  /ghp_[a-zA-Z0-9]{36,}/,           // GitHub PAT
  /gho_[a-zA-Z0-9]{36,}/,           // GitHub OAuth
  /github_pat_[a-zA-Z0-9]{22,}/,     // GitHub fine-grained PAT
  /AKIA[0-9A-Z]{16}/,                // AWS access key
  new RegExp(`${KEY_MARKER}${PRIV_MARKER} (?:RSA|EC|OPENSSH|DSA) PRIVATE KEY${KEY_MARKER}`),  // Private keys
  /xox[baprs]-[a-zA-Z0-9-]{24,}/,    // Slack tokens
]

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0

  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  const { stdout } = await execa('git', ['diff', '--cached', '--name-only'], { cwd: projectDir }).catch(() => ({ stdout: '' }))
  const stagedFiles = stdout.split('\n').filter(Boolean)

  let found = false
  for (const file of stagedFiles) {
    const filePath = join(projectDir, file)
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf-8')
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        console.error(`TAUSIK: SECRET DETECTED in ${file}`)
        found = true
      }
    }
  }

  return found ? 2 : 0
}

main().then(process.exit)
