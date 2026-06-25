#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DOC_FILES = ['AGENTS.md', 'CLAUDE.md', 'QWEN.md', 'README.md']
const CONSTANT_MARKERS = [
  { pattern: /SCHEMA_VERSION\s*=\s*(\d+)/, docPattern: /schema.*version.*?(\d+)/i },
  { pattern: /NUTAUSIK_VERSION\s*=\s*'([^']+)'/, docPattern: /version.*?(\d+\.\d+\.\d+)/ },
]

async function main(): Promise<number> {
  if (process.env['NUTAUSIK_SKIP_HOOKS']) return 0

  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
  let hasDrift = false

  for (const { pattern, docPattern } of CONSTANT_MARKERS) {
    const versionFile = join(projectDir, 'src', 'version.ts')
    if (!existsSync(versionFile)) continue

    const codeContent = readFileSync(versionFile, 'utf-8')
    const codeMatch = codeContent.match(pattern)
    if (!codeMatch) continue
    const codeValue = codeMatch[1]

    for (const doc of DOC_FILES) {
      const docPath = join(projectDir, doc)
      if (!existsSync(docPath)) continue
      const docContent = readFileSync(docPath, 'utf-8')
      const docMatch = docContent.match(docPattern)
      if (docMatch && docMatch[1] !== codeValue) {
        console.error(`TAUSIK: Drift detected — ${doc} references '${docMatch[1]}' but code has '${codeValue}'`)
        hasDrift = true
      }
    }
  }

  return hasDrift ? 2 : 0
}

main().then(process.exit)
