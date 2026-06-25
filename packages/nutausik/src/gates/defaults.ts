import type { GateTrigger, GateSeverity } from '../types/index.js'

export interface GateDefinition {
  name: string
  description: string
  enabled: boolean
  severity: GateSeverity
  trigger: GateTrigger[]
  command?: string
  timeout?: number
  maxLines?: number
  fileExtensions?: string[]
  stacks?: string[]
}

export const UNIVERSAL_GATES: GateDefinition[] = [
  {
    name: 'filesize',
    description: 'File is under 400 lines',
    enabled: true,
    severity: 'block',
    trigger: ['verify', 'commit'],
    maxLines: 400,
    fileExtensions: ['.py', '.ts', '.tsx', '.js', '.go', '.rs', '.java', '.rb', '.php', '.vue', '.svelte'],
  },
  {
    name: 'qg0_check',
    description: 'QG-0: goal and acceptance criteria present',
    enabled: true,
    severity: 'block',
    trigger: ['task-done'],
  },
  {
    name: 'ac_check',
    description: 'AC verification checklist complete',
    enabled: true,
    severity: 'block',
    trigger: ['task-done'],
  },
]

export const STACK_GATES: Record<string, GateDefinition[]> = {
  python: [
    { name: 'ruff', description: 'Ruff lint', enabled: true, severity: 'warn', trigger: ['verify', 'commit'], command: 'ruff check {files}', fileExtensions: ['.py'] },
    { name: 'mypy', description: 'Mypy type check', enabled: true, severity: 'warn', trigger: ['verify', 'commit'], command: 'mypy {files}', fileExtensions: ['.py'] },
  ],
  typescript: [
    { name: 'tsc', description: 'TypeScript type check', enabled: true, severity: 'block', trigger: ['verify'], command: 'tsc --noEmit', fileExtensions: ['.ts', '.tsx'] },
    { name: 'eslint', description: 'ESLint', enabled: true, severity: 'warn', trigger: ['verify'], command: 'eslint {files}', fileExtensions: ['.ts', '.tsx'] },
  ],
  go: [
    { name: 'go_vet', description: 'Go vet', enabled: true, severity: 'warn', trigger: ['verify'], command: 'go vet {files}', fileExtensions: ['.go'] },
    { name: 'golangci_lint', description: 'GolangCI lint', enabled: true, severity: 'warn', trigger: ['verify'], command: 'golangci-lint run {files}', fileExtensions: ['.go'] },
  ],
  rust: [
    { name: 'clippy', description: 'Clippy lint', enabled: true, severity: 'warn', trigger: ['verify'], command: 'cargo clippy', fileExtensions: ['.rs'] },
    { name: 'cargo_check', description: 'Cargo check', enabled: true, severity: 'block', trigger: ['verify'], command: 'cargo check', fileExtensions: ['.rs'] },
  ],
}
