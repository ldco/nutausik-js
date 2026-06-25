#!/usr/bin/env node
import { isNutausikProject, parseHookInput } from './common.js'

const SECURITY_KEYWORDS = ['encrypt', 'decrypt', 'password', 'token', 'secret', 'auth', 'csrf', 'xss', 'injection', 'sqli']
const TEST_KEYWORDS = ['test', 'spec', 'should', 'expect', 'assert', 'describe', 'it(']

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0
  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  if (!isNutausikProject(projectDir)) return 0

  const ctx = await parseHookInput()
  const userPrompt = String(ctx.tool_input.prompt ?? ctx.tool_input.message ?? '').toLowerCase()

  for (const kw of SECURITY_KEYWORDS) {
    if (userPrompt.includes(kw)) {
      console.log(`TAUSIK: Security-sensitive keyword detected: '${kw}'. Use caution.`)
      break
    }
  }
  for (const kw of TEST_KEYWORDS) {
    if (userPrompt.includes(kw)) {
      console.log(`TAUSIK: Test keyword detected: '${kw}'. Ensure tests are written.`)
      break
    }
  }
  return 0
}

main().then(process.exit)
