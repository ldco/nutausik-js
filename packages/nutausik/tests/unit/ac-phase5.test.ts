import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..', '..')
const CLI = `npx tsx ${PROJECT_ROOT}/src/cli/index.ts`

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI} ${args}`, { cwd, encoding: 'utf-8', timeout: 10_000 }).trim()
    return { stdout, stderr: '', exitCode: 0 }
  } catch (e: unknown) {
    const err = e as { stdout: string; stderr: string; status: number }
    return { stdout: (err.stdout ?? '').trim(), stderr: (err.stderr ?? '').trim(), exitCode: err.status ?? 1 }
  }
}

describe('Phase 5 — CLI AC items', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'cli-ac-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  describe('AC-5.1: init', () => {
    it('creates .nutausik directory with config', () => {
      const r = run('init --name test-project', tmpDir)
      expect(r.exitCode).toBe(0)
      expect(r.stdout).toContain('TAUSIK initialized')
    })
  })

  describe('AC-5.20: exit codes', () => {
    it('returns 0 on successful init', () => {
      expect(run('init --name test', tmpDir).exitCode).toBe(0)
    })

    it('returns 0 on status', () => {
      run('init --name test', tmpDir)
      expect(run('status', tmpDir).exitCode).toBe(0)
    })

    it('returns 0 on task add', () => {
      run('init --name test', tmpDir)
      expect(run('task add t1 "T1" --goal "G" --acceptance "AC"', tmpDir).exitCode).toBe(0)
    })

    it('returns 0 on task list', () => {
      run('init --name test', tmpDir)
      run('task add t1 "T1"', tmpDir)
      expect(run('task list', tmpDir).exitCode).toBe(0)
    })

    it('returns nonzero on missing command', () => {
      const r = run('nonexistent-command', tmpDir)
      expect(r.exitCode).toBe(1)
    })

    it('returns nonzero on error', () => {
      run('init --name test', tmpDir)
      const r = run('task start nonexistent', tmpDir)
      expect(r.exitCode).toBe(1)
    })
  })

  describe('AC-5.21: help text', () => {
    it('--help displays usage info', () => {
      const r = run('--help', tmpDir)
      expect(r.exitCode).toBe(0)
      expect(r.stdout).toContain('Usage')
    })

    it('task --help shows task commands', () => {
      const r = run('task --help', tmpDir)
      expect(r.exitCode).toBe(0)
      expect(r.stdout).toContain('add')
      expect(r.stdout).toContain('start')
      expect(r.stdout).toContain('done')
    })
  })
})
