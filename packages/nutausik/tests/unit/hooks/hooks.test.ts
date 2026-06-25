import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..')
const HOOK_DIR = `${PROJECT_ROOT}/src/hooks`

function run(hook: string, stdin: string, cwd: string, env?: Record<string, string>): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`tsx ${HOOK_DIR}/${hook}`, {
      cwd, input: stdin, encoding: 'utf-8', timeout: 10_000,
      env: { ...process.env, ...env },
    }).trim()
    return { stdout, stderr: '', exitCode: 0 }
  } catch (e: unknown) {
    const err = e as { stdout: string; stderr: string; status: number }
    return {
      stdout: (err.stdout ?? '').trim(),
      stderr: (err.stderr ?? '').trim(),
      exitCode: err.status ?? 1,
    }
  }
}

function initDb(tmpDir: string): void {
  mkdirSync(join(tmpDir, '.nutausik'), { recursive: true })
  const db = new Database(join(tmpDir, '.nutausik', 'nutausik.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','active','blocked','review','done')),
      goal TEXT, acceptance_criteria TEXT, scope_paths TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT, entity_id TEXT, action TEXT, details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  db.close()
}

function addActiveTask(tmpDir: string, extra?: Record<string, string>): void {
  const db = new Database(join(tmpDir, '.nutausik', 'nutausik.db'))
  db.prepare(`INSERT INTO tasks (slug, title, status, goal, acceptance_criteria${extra?.scope_paths ? ', scope_paths' : ''}) VALUES (?, ?, ?, ?, ?${extra?.scope_paths ? ', ?' : ''})`).run(
    'test-task', 'Test Task', 'active', extra?.goal ?? 'Test goal', extra?.ac ?? 'Test AC',
    ...(extra?.scope_paths ? [extra.scope_paths] : []),
  )
  db.close()
}

function hookStdin(toolName: string, toolInput: Record<string, unknown>): string {
  return JSON.stringify({ tool_name: toolName, tool_input: toolInput })
}

describe('hooks/common.ts', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'hook-common-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('isNutausikProject returns true when .nutausik exists', async () => {
    mkdirSync(join(tmpDir, '.nutausik'))
    const { isNutausikProject } = await import(`${HOOK_DIR}/common.js`)
    expect(isNutausikProject(tmpDir)).toBe(true)
  })

  it('isNutausikProject returns false without .nutausik', async () => {
    const { isNutausikProject } = await import(`${HOOK_DIR}/common.js`)
    expect(isNutausikProject(tmpDir)).toBe(false)
  })

  it('hasActiveTask returns true when active task exists', async () => {
    initDb(tmpDir)
    addActiveTask(tmpDir)
    const { hasActiveTask } = await import(`${HOOK_DIR}/common.js`)
    expect(hasActiveTask(join(tmpDir, '.nutausik', 'nutausik.db'))).toBe(true)
  })

  it('hasActiveTask returns false without active task', async () => {
    initDb(tmpDir)
    const { hasActiveTask } = await import(`${HOOK_DIR}/common.js`)
    expect(hasActiveTask(join(tmpDir, '.nutausik', 'nutausik.db'))).toBe(false)
  })
})

describe('hooks/task-gate.ts', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'hook-task-gate-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('AC-7.1: blocks Write when no active task (exit 2)', () => {
    initDb(tmpDir)
    const r = run('task-gate.ts', hookStdin('Write', { filePath: '/tmp/test.ts' }), tmpDir)
    expect(r.exitCode).toBe(2)
    expect(r.stderr).toContain('No active task')
  })

  it('allows Write when active task exists', () => {
    initDb(tmpDir)
    addActiveTask(tmpDir)
    const r = run('task-gate.ts', hookStdin('Write', { filePath: '/tmp/test.ts' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })

  it('allows non-Write/Edit tools', () => {
    initDb(tmpDir)
    const r = run('task-gate.ts', hookStdin('Bash', { command: 'ls' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })

  it('AC-7.2: NUTAUSIK_SKIP_HOOKS bypasses check', () => {
    initDb(tmpDir)
    const r = run('task-gate.ts', hookStdin('Write', { filePath: '/tmp/test.ts' }), tmpDir, { NUTAUSIK_SKIP_HOOKS: '1' })
    expect(r.exitCode).toBe(0)
  })

  it('skips non-nutausik projects', () => {
    const r = run('task-gate.ts', hookStdin('Write', { filePath: '/tmp/test.ts' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })
})

describe('hooks/bash-firewall.ts', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'hook-bash-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('AC-7.4: blocks rm -rf / (exit 2)', () => {
    const r = run('bash-firewall.ts', hookStdin('Bash', { command: 'rm -rf /' }), tmpDir)
    expect(r.exitCode).toBe(2)
    expect(r.stderr).toContain('Recursive delete')
  })

  it('blocks DROP TABLE', () => {
    const r = run('bash-firewall.ts', hookStdin('Bash', { command: 'DROP TABLE users;' }), tmpDir)
    expect(r.exitCode).toBe(2)
    expect(r.stderr).toContain('SQL table drop')
  })

  it('AC-7.5: allows safe commands', () => {
    const r = run('bash-firewall.ts', hookStdin('Bash', { command: 'ls -la' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })

  it('allows non-Bash tools', () => {
    const r = run('bash-firewall.ts', hookStdin('Write', { filePath: 'file.ts' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })

  it('skips with NUTAUSIK_SKIP_HOOKS=1', () => {
    const r = run('bash-firewall.ts', hookStdin('Bash', { command: 'rm -rf /' }), tmpDir, { NUTAUSIK_SKIP_HOOKS: '1' })
    expect(r.exitCode).toBe(0)
  })

  it('does not false-positive on echo comments', () => {
    const r = run('bash-firewall.ts', hookStdin('Bash', { command: 'echo "rm -rf / is dangerous"' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })
})

describe('hooks/scope-gate.ts', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'hook-scope-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('AC-7.8: blocks writes outside scope_paths', () => {
    initDb(tmpDir)
    addActiveTask(tmpDir, { scope_paths: '["src/"]' })
    const r = run('scope-gate.ts', hookStdin('Write', { filePath: '/outside/test.ts' }), tmpDir)
    expect(r.exitCode).toBe(2)
    expect(r.stderr).toContain('outside allowed scope')
  })

  it('allows writes within scope_paths', () => {
    initDb(tmpDir)
    addActiveTask(tmpDir, { scope_paths: '["src/"]' })
    const r = run('scope-gate.ts', hookStdin('Write', { filePath: 'src/test.ts' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })

  it('allows writes when no scope_paths set', () => {
    initDb(tmpDir)
    addActiveTask(tmpDir)
    const r = run('scope-gate.ts', hookStdin('Write', { filePath: 'anything.ts' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })
})

describe('hooks/git-push-gate.ts', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'hook-push-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('AC-7.6: blocks push to main without ticket', () => {
    const r = run('git-push-gate.ts', hookStdin('Bash', { command: 'git push origin HEAD:main' }), tmpDir)
    expect(r.exitCode).toBe(2)
    expect(r.stderr).toContain('BLOCKED')
  })

  it('allows push to non-main branch', () => {
    const r = run('git-push-gate.ts', hookStdin('Bash', { command: 'git push origin HEAD:feature-x' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })

  it('allows non-push commands', () => {
    const r = run('git-push-gate.ts', hookStdin('Bash', { command: 'git status' }), tmpDir)
    expect(r.exitCode).toBe(0)
  })

  it('skips with NUTAUSIK_SKIP_HOOKS=1', () => {
    const r = run('git-push-gate.ts', hookStdin('Bash', { command: 'git push origin HEAD:main' }), tmpDir, { NUTAUSIK_SKIP_HOOKS: '1' })
    expect(r.exitCode).toBe(0)
  })
})

describe('hooks/common.ts hook-scope logic', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'hook-common2-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('hasActiveTask returns false for nonexistent DB', async () => {
    const { hasActiveTask } = await import(`${HOOK_DIR}/common.js`)
    expect(hasActiveTask(join(tmpDir, 'nonexistent.db'))).toBe(false)
  })
})
