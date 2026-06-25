import { existsSync } from 'node:fs'
import { join } from 'node:path'

export interface ConformanceIssue {
  rule: string
  passed: boolean
  detail: string
}

export function runConformanceCheck(projectDir: string): ConformanceIssue[] {
  const issues: ConformanceIssue[] = []

  issues.push(checkFile(projectDir, 'AGENTS.md', 'AGENTS.md exists'))
  issues.push(checkFile(projectDir, 'CLAUDE.md', 'CLAUDE.md exists'))
  issues.push(checkDir(projectDir, '.nutausik', '\.nutausik/ directory exists'))
  issues.push(checkConfig(projectDir, '\.nutausik/config.json', 'config.json exists'))
  issues.push(checkConfig(projectDir, '\.nutausik/nutausik.db', 'nutausik.db exists'))

  return issues
}

function checkFile(dir: string, name: string, label: string): ConformanceIssue {
  return {
    rule: label,
    passed: existsSync(join(dir, name)),
    detail: existsSync(join(dir, name)) ? `Found ${name}` : `Missing ${name}`,
  }
}

function checkDir(dir: string, name: string, label: string): ConformanceIssue {
  return {
    rule: label,
    passed: existsSync(join(dir, name)),
    detail: existsSync(join(dir, name)) ? `Found ${name}/` : `Missing ${name}/`,
  }
}

function checkConfig(dir: string, path: string, label: string): ConformanceIssue {
  return {
    rule: label,
    passed: existsSync(join(dir, path)),
    detail: existsSync(join(dir, path)) ? `Found ${path}` : `Missing ${path}`,
  }
}
