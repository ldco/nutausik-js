import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface BrainEntry {
  id: string
  type: 'artifact' | 'decision' | 'pattern'
  title: string
  content: string
  source: string
  score: number
}

export class BrainSearch {
  search(query: string, limit = 10): BrainEntry[] {
    const results: BrainEntry[] = []
    const projectDir = process.cwd()
    const docsDir = join(projectDir, 'docs')
    if (!existsSync(docsDir)) return results

    const queryLower = query.toLowerCase()
    this.walkDir(docsDir, queryLower, results, limit)
    return results.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  private walkDir(dir: string, query: string, results: BrainEntry[], limit: number): void {
    if (results.length >= limit * 2) return

    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        this.walkDir(fullPath, query, results, limit)
      } else if (entry.name.endsWith('.md')) {
        try {
          const content = readFileSync(fullPath, 'utf-8')
          const score = this.score(content, query)
          if (score > 0) {
            const hash = createHash('md5').update(fullPath).digest('hex').slice(0, 8)
            const title = content.split('\n')[0]?.replace(/^#\s*/, '') ?? entry.name
            results.push({
              id: hash,
              type: 'artifact',
              title,
              content: content.slice(0, 500),
              source: fullPath,
              score,
            })
          }
        } catch { /* skip unreadable files */ }
      }
    }
  }

  private score(content: string, query: string): number {
    const lower = content.toLowerCase()
    let score = 0
    const words = query.split(/\s+/).filter(Boolean)
    for (const word of words) {
      if (word.length < 3) continue
      const count = (lower.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      score += count * 10
    }
    return score
  }
}
