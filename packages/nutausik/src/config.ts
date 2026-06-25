import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { NutausikConfig, GateConfig, GateTrigger } from './types/index.js'
import { VALID_GATE_TRIGGERS, ALLOWED_GATE_EXECUTABLES } from './types/index.js'

const NUNUTAUSIK_DIR = '.nutausik'
const DB_NAME = 'nutausik.db'
const CONFIG_NAME = 'config.json'
const DEFAULT_SESSION_MAX_MINUTES = 180

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export function findProjectRoot(startDir?: string): string {
  let dir = startDir ?? process.cwd()
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, NUNUTAUSIK_DIR))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new ConfigError(
    `No \.nutausik/ directory found. Run 'tausik init' first.`
  )
}

export function nutausikDir(projectDir: string): string {
  return join(projectDir, NUNUTAUSIK_DIR)
}

export function dbPath(projectDir: string): string {
  return join(nutausikDir(projectDir), DB_NAME)
}

export function configPath(projectDir: string): string {
  return join(nutausikDir(projectDir), CONFIG_NAME)
}

export function isNutausikProject(projectDir: string): boolean {
  return existsSync(join(projectDir, NUNUTAUSIK_DIR))
}

let _configCache: NutausikConfig | null = null

export function loadConfig(projectDir?: string): NutausikConfig {
  if (_configCache) return _configCache
  const dir = projectDir ?? process.cwd()
  const path = configPath(dir)
  if (!existsSync(path)) {
    return { project: '' }
  }
  try {
    const raw = readFileSync(path, 'utf-8')
    _configCache = JSON.parse(raw) as NutausikConfig
    return _configCache
  } catch (err) {
    throw new ConfigError(
      `Failed to parse config at ${path}: ${(err as Error).message}`
    )
  }
}

export function clearConfigCache(): void {
  _configCache = null
}

export function saveConfig(config: NutausikConfig, projectDir?: string): void {
  const dir = projectDir ?? process.cwd()
  const tDir = nutausikDir(dir)
  mkdirSync(tDir, { recursive: true })
  const path = configPath(dir)
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  _configCache = config
}

export function defaultSessionMaxMinutes(
  config?: NutausikConfig | null
): number {
  return config?.session_max_minutes ?? DEFAULT_SESSION_MAX_MINUTES
}

export function getValidStacks(config?: NutausikConfig | null): Set<string> {
  const defaults = new Set([
    'ansible', 'blade', 'django', 'docker', 'fastapi', 'flask',
    'flutter', 'go', 'helm', 'java', 'javascript', 'kotlin',
    'kubernetes', 'laravel', 'next', 'nuxt', 'php', 'python',
    'react', 'rust', 'svelte', 'swift', 'terraform', 'typescript', 'vue',
  ])
  if (!config?.custom_stacks?.length) return defaults
  for (const s of config.custom_stacks) {
    if (typeof s === 'string' && s.trim()) {
      defaults.add(s.trim())
    }
  }
  return defaults
}

// ── Gate configuration ────────────────────────────────────────────────

export function getGatesForTrigger(
  trigger: GateTrigger,
  _config?: NutausikConfig | null,
  gates?: Record<string, GateConfig>
): [string, GateConfig][] {
  const allGates = gates ?? {}
  const result: [string, GateConfig][] = []
  for (const [name, gate] of Object.entries(allGates)) {
    if (gate.enabled && gate.trigger.includes(trigger)) {
      result.push([name, gate])
    }
  }
  return result
}

// ── Validation ────────────────────────────────────────────────────────

const SHELL_INJECTION_RE = /\||&&|\|\||;|\$\(|`/

export function validateGateCommand(command: string): void {
  const parts = command.split(/\s+/)
  const executable = parts[0]
  if (!executable) {
    throw new ConfigError('Gate command is empty')
  }
  if (!(ALLOWED_GATE_EXECUTABLES as readonly string[]).includes(executable)) {
    throw new ConfigError(
      `Gate executable '${executable}' is not in the allowed list. ` +
      `Allowed: ${ALLOWED_GATE_EXECUTABLES.join(', ')}`
    )
  }
  if (SHELL_INJECTION_RE.test(command)) {
    throw new ConfigError(
      `Gate command contains forbidden shell operators: ${command}`
    )
  }
}

export function validateTrigger(trigger: string): GateTrigger {
  if (!(VALID_GATE_TRIGGERS as readonly string[]).includes(trigger as GateTrigger)) {
    throw new ConfigError(
      `Invalid gate trigger '${trigger}'. Valid: ${VALID_GATE_TRIGGERS.join(', ')}`
    )
  }
  return trigger as GateTrigger
}
