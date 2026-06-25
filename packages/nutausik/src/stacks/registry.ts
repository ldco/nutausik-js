import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { StackDeclaration, GateConfig } from '../types/index.js'

function globMatch(projectDir: string, pattern: string): boolean {
  const ext = pattern.replace(/^\*\*\//, '.').replace(/^\*/, '')
  try {
    const files = readdirSync(projectDir, { recursive: true })
    return files.some(f => typeof f === 'string' && f.endsWith(ext))
  } catch {
    return false
  }
}

export class StackRegistry {
  private stacks: Map<string, StackDeclaration> = new Map()

  load(baseDir: string): void {
    const stacksDir = join(baseDir, 'stacks')
    if (!existsSync(stacksDir)) return

    const entries = readdirSync(stacksDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const jsonPath = join(stacksDir, entry.name, 'stack.json')
      if (!existsSync(jsonPath)) continue
      try {
        const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as StackDeclaration
        this.stacks.set(entry.name, data)
      } catch {
        // skip invalid stacks
      }
    }
  }

  get(name: string): StackDeclaration | undefined {
    return this.stacks.get(name)
  }

  list(): string[] {
    return [...this.stacks.keys()]
  }

  gatesFor(name: string): Record<string, GateConfig> {
    const stack = this.stacks.get(name)
    if (!stack?.gates) return {}
    const result: Record<string, GateConfig> = {}
    for (const [key, val] of Object.entries(stack.gates)) {
      if (val !== null) result[key] = val as GateConfig
    }
    return result
  }

  detect(projectDir: string): string[] {
    const detected: string[] = []
    for (const [name, decl] of this.stacks) {
      if (!decl.detect) continue
      for (const rule of decl.detect) {
        const targetPath = join(projectDir, rule.file)
        if (rule.type === 'exact' && existsSync(targetPath)) {
          if (!rule.keyword) { detected.push(name); break }
          const content = readFileSync(targetPath, 'utf-8')
          if (content.includes(rule.keyword)) { detected.push(name); break }
        }
        if (rule.type === 'glob' && globMatch(projectDir, rule.file)) {
          detected.push(name); break
        }
        if (rule.type === 'dir-marker' && existsSync(targetPath)) {
          detected.push(name); break
        }
      }
    }
    return detected
  }
}
