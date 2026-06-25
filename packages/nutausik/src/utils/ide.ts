import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { IdeType } from '../types/index.js'
import { IDE_DIRS } from '../types/index.js'

export class IdeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IdeError'
  }
}

export function detectIde(projectDir?: string): IdeType {
  const dir = projectDir ?? process.cwd()

  const envIde = process.env['TAUSIK_IDE']?.toLowerCase() as IdeType | undefined
  if (envIde && envIde in IDE_DIRS) {
    return envIde
  }

  for (const [ide, dirName] of Object.entries(IDE_DIRS)) {
    if (existsSync(join(dir, dirName))) {
      return ide as IdeType
    }
  }

  return 'claude'
}

export function ideDir(projectDir: string, ide: IdeType): string {
  return join(projectDir, IDE_DIRS[ide])
}

export function mcpConfigPath(projectDir: string, ide: IdeType): string {
  const base = ideDir(projectDir, ide)
  switch (ide) {
    case 'claude':
      return join(base, 'mcp.json')
    case 'cursor':
      return join(base, 'mcp.json')
    case 'kilo':
      return join(base, 'mcp.json')
    case 'qwen':
      return join(base, 'settings.json')
    default:
      return join(base, 'mcp.json')
  }
}

export function agentsMdPath(projectDir: string, ide: IdeType): string {
  const dirs: Partial<Record<IdeType, string>> = {
    claude: 'CLAUDE.md',
    qwen: 'QWEN.md',
    kilo: 'AGENTS.md',
    cursor: '.cursorrules',
  }
  const filename = dirs[ide] ?? 'AGENTS.md'
  return join(projectDir, filename)
}

export function scriptsDir(projectDir: string): string {
  return join(projectDir, 'scripts')
}
