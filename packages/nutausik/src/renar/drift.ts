import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface DriftIssue {
  source: string
  expected: string
  actual: string
  file: string
}

const DOC_FILES = ['AGENTS.md', 'CLAUDE.md', 'QWEN.md', 'README.md']

export function checkDrift(projectDir: string, version: string): DriftIssue[] {
  const issues: DriftIssue[] = []

  for (const doc of DOC_FILES) {
    const docPath = join(projectDir, doc)
    if (!existsSync(docPath)) continue
    const content = readFileSync(docPath, 'utf-8')
    const versionMatch = content.match(/version.*?(\d+\.\d+\.\d+)/i)
    if (versionMatch && versionMatch[1] !== version) {
      issues.push({
        source: doc,
        expected: version,
        actual: versionMatch[1] ?? '(not found)',
        file: doc,
      })
    }
  }

  return issues
}
