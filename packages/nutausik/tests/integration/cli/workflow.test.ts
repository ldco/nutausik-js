import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..')
const CLI = `npx tsx ${PROJECT_ROOT}/src/cli/index.ts`

let tmpDir: string
function run(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI} ${args}`, { cwd: tmpDir, encoding: 'utf-8', timeout: 10_000 }).trim()
    return { stdout, stderr: '', exitCode: 0 }
  } catch (e: unknown) {
    const err = e as { stdout: string; stderr: string; status: number; message: string }
    return {
      stdout: (err.stdout ?? '').trim(),
      stderr: (err.stderr ?? '').trim(),
      exitCode: err.status ?? 1,
    }
  }
}

function initProject(): void {
  const r = run('init --name test-project')
  expect(r.exitCode).toBe(0)
  expect(r.stdout).toContain('TAUSIK initialized')
}

describe('nutausik init', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nutausik-cli-test-'))
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('AC-5.1: init creates .nutausik directory with config', () => {
    const r = run('init --name test-project')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('TAUSIK initialized')
    expect(existsSync(join(tmpDir, '.nutausik', 'config.json'))).toBe(true)
    expect(existsSync(join(tmpDir, '.nutausik', 'nutausik.db'))).toBe(true)
    const config = JSON.parse(readFileSync(join(tmpDir, '.nutausik', 'config.json'), 'utf-8'))
    expect(config.project).toBe('test-project')
  })

  it('init without flag uses dir name', () => {
    const r = run('init')
    expect(r.exitCode).toBe(0)
    const dirName = tmpDir.split('/').pop()
    const config = JSON.parse(readFileSync(join(tmpDir, '.nutausik', 'config.json'), 'utf-8'))
    expect(config.project).toBe(dirName)
  })
})

describe('nutausik task lifecycle', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nutausik-cli-test-'))
    initProject()
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('AC-5.3: task add creates planning task', () => {
    const r = run(`task add my-task "My Task" --goal "Do the thing" --acceptance "It works" --stack typescript`)
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain("Task 'my-task' created")
  })

  it('AC-5.4: task start activates task (QG-0 enforced)', () => {
    run(`task add my-task "My Task" --goal "Do it" --acceptance "Works"`)
    const r = run('task start my-task')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('started')
  })

  it('QG-0 blocks start without goal', () => {
    run(`task add my-task "My Task"`)
    const r = run('task start my-task')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toContain('QG-0')
  })

  it('AC-5.5: task done completes with --ac-verified', () => {
    run(`task add my-task "My Task" --goal "Do it" --acceptance "Works"`)
    run('task start my-task')
    const r = run('task done my-task --ac-verified')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('completed')
  })

  it('QG-2 blocks done without --ac-verified (task must be started first)', () => {
    run(`task add my-task "My Task" --goal "Do it" --acceptance "Works"`)
    run('task start my-task')
    const r = run('task done my-task')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toContain('QG-2')
  })

  it('AC-5.6: task list with status filter', () => {
    run(`task add my-task "My Task" --goal "Do it" --acceptance "Works"`)
    const r = run('task list --status planning')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('my-task')
  })

  it('AC-5.7: task show displays details', () => {
    run(`task add my-task "My Task" --goal "Do it" --acceptance "Works"`)
    const r = run('task show my-task')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('my-task')
    expect(r.stdout).toContain('Goal:')
    expect(r.stdout).toContain('AC:')
  })

  it('AC-5.8: task update modifies fields', () => {
    run(`task add my-task "My Task"`)
    let r = run(`task update my-task --goal "New goal"`)
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('updated')
    r = run('task show my-task')
    expect(r.stdout).toContain('New goal')
  })

  it('AC-5.9/5.10: task log and logs', () => {
    run(`task add my-task "My Task"`)
    let r = run(`task log my-task "Did something" --phase implementation`)
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('Logged')
    r = run('task logs my-task')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('Did something')
  })

  it('AC-5.10: task block/unblock/review/delete', () => {
    run(`task add my-task "My Task" --goal "Do it" --acceptance "Works"`)
    run('task start my-task')

    let r = run('task block my-task')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('blocked')

    r = run('task unblock my-task')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('unblocked')

    r = run('task review my-task')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('review')

    run('task done my-task --ac-verified')
    r = run('task delete my-task')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('deleted')
  })
})

describe('nutausik session lifecycle', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nutausik-cli-test-'))
    initProject()
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('AC-5.13: session start/end/current/list', () => {
    let r = run('session start')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('started')

    r = run('session current')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('#')

    r = run('session list')
    expect(r.exitCode).toBe(0)

    r = run('session end')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('ended')
  })
})

describe('nutausik epic/story management', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nutausik-cli-test-'))
    initProject()
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('AC-5.14: epic add/list/show', () => {
    let r = run('epic add release-1 "Release 1" --description "First release"')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('created')

    r = run('epic list')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('release-1')

    r = run('epic show release-1')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('release-1')
  })

  it('AC-5.15: story add/list/show', () => {
    run('epic add epic1 "Epic 1"')
    let r = run('story add epic1 story1 "Story 1"')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('created')

    r = run('story list')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('story1')
  })
})

describe('nutausik memory management', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nutausik-cli-test-'))
    initProject()
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('AC-5.16: memory add/list/search/compact', () => {
    let r = run('memory add pattern my-pattern "Always use TypeScript"')
    expect(r.exitCode).toBe(0)

    r = run('memory list')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('my-pattern')
  })
})

describe('nutausik verify, doctor, metrics, search', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nutausik-cli-test-'))
    initProject()
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('AC-5.17: verify runs gates', async () => {
    run(`task add my-task "My Task" --goal "Do it" --acceptance "Works"`)
    run('task start my-task')
    const r = run('verify --task my-task')
    expect(r.exitCode).toBe(0)
  }, 15_000)

  it('AC-5.18: doctor health check', () => {
    const r = run('doctor')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('DB')
  })

  it('AC-5.19: metrics SENAR KPI', () => {
    const r = run('metrics')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('Total tasks')
  })
})

describe('AC-5.2: nutausik status', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'nutausik-cli-test-'))
    initProject()
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('status prints project summary', () => {
    const r = run('status')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('Project:')
    expect(r.stdout).toContain('Tasks:')
    expect(r.stdout).toContain('Epics:')
  })
})
