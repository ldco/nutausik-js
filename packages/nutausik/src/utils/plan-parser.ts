import { readFileSync, existsSync } from 'node:fs'

export interface ParsedPlan {
  title: string
  goal: string
  steps: string[]
  risks: string[]
  acceptance: string[]
}

export function parsePlanMd(filePath: string): ParsedPlan | null {
  if (!existsSync(filePath)) return null
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    const title = lines[0]?.replace(/^#\s*/, '').trim() ?? 'Untitled'
    const goal = content.match(/##?\s*Goal\s*\n([^#]+)/)?.[1]?.trim() ?? ''
    const steps: string[] = []
    const risks: string[] = []
    const acceptance: string[] = []

    let section: 'steps' | 'risks' | 'acceptance' | null = null
    for (const line of lines) {
      const stepMatch = line.match(/^###?\s*(Step|Implementation steps)/i)
      if (stepMatch) { section = 'steps'; continue }
      if (/^###?\s*Risks/i.test(line)) { section = 'risks'; continue }
      if (/^###?\s*Acceptance/i.test(line)) { section = 'acceptance'; continue }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '').trim()
        if (item) {
          if (section === 'steps') steps.push(item)
          else if (section === 'risks') risks.push(item)
          else if (section === 'acceptance') acceptance.push(item)
        }
      }

      if (line.match(/^\d+\.\s+/)) {
        const item = line.replace(/^\d+\.\s*/, '').trim()
        if (item && section === 'steps') steps.push(item)
      }
    }

    return { title, goal, steps, risks, acceptance }
  } catch {
    return null
  }
}
