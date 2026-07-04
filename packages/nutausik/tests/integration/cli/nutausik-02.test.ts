import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..')
const CLI = `npx tsx ${PROJECT_ROOT}/src/cli/index.ts`

function run(cwd: string, args: string): string {
  try {
    return execSync(`${CLI} ${args}`, { cwd, encoding: 'utf-8', timeout: 10_000 }).trim()
  } catch (e: unknown) {
    const err = e as { stdout: string; stderr: string; status: number }
    return (err.stderr ?? '').trim() || (err.stdout ?? '').trim()
  }
}

describe('v0.2.0 MCP Tools', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync('/tmp/nutausik-test-')
    const r = run(tmpDir, 'init --name test-project')
    // init prints "TAUSIK initialized" or "Error:..."
    if (r.includes('Error')) throw new Error(`Init failed: ${r}`)
  })

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  })

  it('context-inject CLI shows no active task when none', () => {
    const result = run(tmpDir, 'context-inject')
    expect(result).toContain('nutausik_context')
    expect(result).toContain('No active task')
  })

  it('context-inject shows active task when one is running', () => {
    const r = run(tmpDir, 'task quick "test-ctx" --goal "verify ctx" --acceptance "works"')
    // extract slug from output like "Task 'slug' created."
    const slugMatch = r.match(/'([^']+)'/)
    const slug = slugMatch ? slugMatch[1] : 'test-ctx'
    run(tmpDir, `task start ${slug}`)
    const result = run(tmpDir, 'context-inject')
    expect(result).toContain('test-ctx')
    expect(result).toContain('Active task')
  })

  it('handoff save/load round-trip', () => {
    const result = run(tmpDir, 'handoff-save -s sess-1 -m "test summary"')
    expect(result).toContain('Handoff saved')
    const loaded = run(tmpDir, 'handoff-load -s sess-1')
    expect(loaded).toContain('sess-1')
    expect(loaded).toContain('test summary')
  })

  it('handoff load latest when no session', () => {
    run(tmpDir, 'handoff-save -s sess-a -m "first"')
    run(tmpDir, 'handoff-save -s sess-b -m "second"')
    const loaded = run(tmpDir, 'handoff-load')
    expect(loaded).toContain('sess-b')
  })

  it('handoff load non-existent returns not found', () => {
    const result = run(tmpDir, 'handoff-load -s no-such')
    expect(result).toContain('No handoff found')
  })

  it('coherence-check passes with simple steps', () => {
    const result = run(tmpDir, 'coherence-check --steps "do this,do that"')
    expect(result).toContain('PASSED')
  })

  it('coherence-check flags dead_end memory', () => {
    run(tmpDir, 'memory add dead_end "bad-pattern" "Dont use this"')
    const result = run(tmpDir, 'coherence-check --steps "use bad-pattern here"')
    expect(result).toContain('FAILED')
    expect(result).toContain('bad-pattern')
  })

  it('loop-close generates summary for a task', () => {
    run(tmpDir, 'task add loop-me "Loop Task" --goal "test loop"')
    run(tmpDir, 'task start loop-me')
    run(tmpDir, 'task log loop-me "step 1 done"')
    run(tmpDir, 'task log loop-me "step 2 done"')
    const result = run(tmpDir, 'loop-close -s loop-me')
    expect(result).toContain('UNIFY Loop Close')
    expect(result).toContain('loop-me')
    expect(result).toContain('step 1 done')
  })
})
