import { UNIVERSAL_GATES, STACK_GATES, type GateDefinition } from './defaults.js'

const EXT_TO_STACK: Record<string, string[]> = {
  '.py': ['python'],
  '.ts': ['typescript'],
  '.tsx': ['typescript'],
  '.js': ['typescript', 'javascript'],
  '.jsx': ['typescript', 'javascript'],
  '.go': ['go'],
  '.rs': ['rust'],
  '.java': ['java'],
  '.rb': ['ruby'],
  '.php': ['php'],
  '.vue': ['vue', 'typescript'],
  '.svelte': ['svelte', 'typescript'],
  '.kt': ['kotlin'],
  '.swift': ['swift'],
  '.dart': ['flutter', 'dart'],
  '.tf': ['terraform'],
  '.yaml': ['ansible', 'kubernetes'],
  '.yml': ['ansible', 'kubernetes'],
  '.dockerfile': ['docker'],
  'dockerfile': ['docker'],
}

export function detectStacks(files: string[]): string[] {
  const stacks = new Set<string>()
  for (const file of files) {
    const lower = file.toLowerCase()
    const ext = '.' + lower.split('.').pop()
    const stackMatches = EXT_TO_STACK[ext] ?? EXT_TO_STACK[lower] ?? []
    for (const s of stackMatches) stacks.add(s)
  }
  return [...stacks]
}

export function gatesForFiles(files: string[]): GateDefinition[] {
  const stacks = detectStacks(files)
  const gates: GateDefinition[] = [...UNIVERSAL_GATES]

  for (const stack of stacks) {
    const stackGates = STACK_GATES[stack]
    if (stackGates) {
      gates.push(...stackGates)
    }
  }

  return gates
}
