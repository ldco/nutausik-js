import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

const PROJECT = process.cwd()
let tmpDir: string

function initProject(): void {
  execSync(`tsx ${PROJECT}/src/cli/index.ts init --name mcp-test`, {
    cwd: tmpDir, encoding: 'utf-8', timeout: 10_000,
  })
}

// ── Named tests that exercise toolHandler via subprocess ─────────

function mcpCall(tool: string, args: Record<string, unknown>): { stdout: string; exitCode: number } {
  const stdin = JSON.stringify({ tool_name: tool, tool_input: args })
  try {
    const stdout = execSync(`tsx ${PROJECT}/src/mcp/index.ts`, {
      cwd: tmpDir, input: stdin, encoding: 'utf-8', timeout: 10_000,
      env: { ...process.env },
    }).trim()
    return { stdout, exitCode: 0 }
  } catch (e: unknown) {
    const err = e as { stdout: string; stderr: string; status: number }
    return {
      stdout: (err.stdout ?? '').trim(),
      exitCode: err.status ?? 1,
    }
  }
}

// Use toolHandler directly via subprocess with JSON commands
function viaHandler(tool: string, args: Record<string, unknown>): Promise<string> {
  return import(`${PROJECT}/src/mcp/handlers.js`).then(m => {
    const oldCwd = process.cwd()
    process.chdir(tmpDir)
    try {
      return m.toolHandler(tool, args)
    } finally {
      process.chdir(oldCwd)
    }
  })
}

describe('MCP — health & diagnostics', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-test-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_health returns OK', async () => {
    const result = await viaHandler('nutausik_health', {})
    expect(result).toContain('OK')
  })

  it('nutausik_self_check returns OK', async () => {
    const result = await viaHandler('nutausik_self_check', {})
    expect(result).toBe('OK')
  })

  it('nutausik_status returns JSON with version', async () => {
    const result = await viaHandler('nutausik_status', {})
    expect(result).toContain('version')
    expect(result).toContain('tasks')
  })

  it('nutausik_status --compact returns JSON', async () => {
    const result = await viaHandler('nutausik_status', { compact: true })
    expect(result).toContain('tasks')
  })
})

describe('MCP — task lifecycle', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-task-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_task_add creates a task', async () => {
    const r = await viaHandler('nutausik_task_add', { slug: 't1', title: 'Task 1', goal: 'Do it', acceptance_criteria: 'Works' })
    expect(r).toContain("Task 't1' created")
  })

  it('nutausik_task_quick creates with auto-slug', async () => {
    const r = await viaHandler('nutausik_task_quick', { title: 'Quick task', goal: 'Test', acceptance_criteria: 'Pass' })
    expect(r).toContain('created')
  })

  it('nutausik_task_start activates task (QG-0)', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', goal: 'G', acceptance_criteria: 'AC' })
    const r = await viaHandler('nutausik_task_start', { slug: 't1' })
    expect(r).toContain('started')
  })

  it('nutausik_task_start blocks without goal/AC (QG-0)', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    await expect(viaHandler('nutausik_task_start', { slug: 't1' })).rejects.toThrow('QG-0')
  })

  it('nutausik_task_done completes with ac_verified', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', goal: 'G', acceptance_criteria: 'AC' })
    await viaHandler('nutausik_task_start', { slug: 't1' })
    const r = await viaHandler('nutausik_task_done', { slug: 't1', ac_verified: true })
    expect(JSON.parse(r)).toMatchObject({ ok: true, slug: 't1' })
  })

  it('nutausik_task_list returns empty for no tasks', async () => {
    const r = await viaHandler('nutausik_task_list', {})
    expect(r).toContain('No tasks')
  })

  it('nutausik_task_list with tasks', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    const r = await viaHandler('nutausik_task_list', {})
    expect(r).toContain('t1')
  })

  it('nutausik_task_show returns details', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    const r = await viaHandler('nutausik_task_show', { slug: 't1' })
    expect(r).toContain('"slug": "t1"')
  })

  it('nutausik_task_show returns "Not found" for missing', async () => {
    const r = await viaHandler('nutausik_task_show', { slug: 'nonexistent' })
    expect(r).toBe('Not found')
  })

  it('nutausik_task_update modifies fields', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    const r = await viaHandler('nutausik_task_update', { slug: 't1', goal: 'New goal' })
    expect(r).toContain('updated')
  })

  it('nutausik_task_log appends to log', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    const r = await viaHandler('nutausik_task_log', { slug: 't1', message: 'Working...' })
    expect(r).toContain('Logged')
  })

  it('nutausik_task_move moves to story', async () => {
    // First create an epic and story
    await viaHandler('nutausik_epic_add', { slug: 'e1', title: 'Epic 1' })
    await viaHandler('nutausik_story_add', { epic_slug: 'e1', slug: 's1', title: 'Story 1' })
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', story_slug: 's1' })
    const r = await viaHandler('nutausik_task_move', { slug: 't1', story_slug: 's1' })
    expect(r).toContain('moved')
  })

  it('nutausik_task_claim and unclaim', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    let r = await viaHandler('nutausik_task_claim', { slug: 't1', agent_id: 'agent-1' })
    expect(r).toContain('claimed')
    r = await viaHandler('nutausik_task_unclaim', { slug: 't1' })
    expect(r).toContain('released')
  })

  it('nutausik_task_next suggests a task', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', goal: 'G', acceptance_criteria: 'AC' })
    await viaHandler('nutausik_task_start', { slug: 't1' })
    // Create another task in planning
    await viaHandler('nutausik_task_add', { slug: 't2', title: 'T2', goal: 'G', acceptance_criteria: 'AC' })
    const r = await viaHandler('nutausik_task_next', {})
    expect(r).toContain('t2')
  })

  it('nutausik_session_start/end/current/list', async () => {
    let r = await viaHandler('nutausik_session_start', {})
    expect(r).toContain('started')
    r = await viaHandler('nutausik_session_current', {})
    expect(r).toContain('Session #')
    r = await viaHandler('nutausik_session_list', {})
    expect(r).toContain('#')
    r = await viaHandler('nutausik_session_end', {})
    expect(r).toContain('ended')
  })

  it('nutausik_task_block/unblock', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', goal: 'G', acceptance_criteria: 'AC' })
    await viaHandler('nutausik_task_start', { slug: 't1' })
    let r = await viaHandler('nutausik_task_block', { slug: 't1' })
    expect(r).toContain('blocked')
    r = await viaHandler('nutausik_task_unblock', { slug: 't1' })
    expect(r).toContain('unblocked')
  })

  it('nutausik_task_review moves to review', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', goal: 'G', acceptance_criteria: 'AC' })
    await viaHandler('nutausik_task_start', { slug: 't1' })
    const r = await viaHandler('nutausik_task_review', { slug: 't1' })
    expect(r).toContain('review')
  })

  it('nutausik_task_delete removes task', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    const r = await viaHandler('nutausik_task_delete', { slug: 't1' })
    expect(r).toContain('deleted')
  })
})

describe('MCP — epic & story management', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-epic-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_epic_add/list/show', async () => {
    let r = await viaHandler('nutausik_epic_add', { slug: 'e1', title: 'Epic 1' })
    expect(r).toContain('created')
    r = await viaHandler('nutausik_epic_list', {})
    expect(r).toContain('e1')
    r = await viaHandler('nutausik_epic_show', { slug: 'e1' })
    expect(r).toContain('e1')
  })

  it('nutausik_story_add/list/show', async () => {
    await viaHandler('nutausik_epic_add', { slug: 'e1', title: 'E1' })
    let r = await viaHandler('nutausik_story_add', { epic_slug: 'e1', slug: 's1', title: 'S1' })
    expect(r).toContain('created')
    r = await viaHandler('nutausik_story_list', {})
    expect(r).toContain('s1')
    r = await viaHandler('nutausik_story_show', { slug: 's1' })
    expect(r).toContain('s1')
  })
})

describe('MCP — memory & knowledge', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-mem-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_memory_add/list/search/get', async () => {
    let r = await viaHandler('nutausik_memory_add', { type: 'pattern', title: 'Test pattern', content: 'Always use TS', tags: 'ts' })
    expect(r).toContain('added')
    r = await viaHandler('nutausik_memory_list', {})
    expect(r).toContain('Test pattern')
    r = await viaHandler('nutausik_memory_search', { query: 'pattern' })
    expect(r).toContain('Test pattern')
  })

  it('nutausik_decision_add and list', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', goal: 'G', acceptance_criteria: 'AC' })
    let r = await viaHandler('nutausik_decision_add', { decision: 'Use TypeScript', rationale: 'Type safety', task_slug: 't1' })
    expect(r).toBeTruthy()
    r = await viaHandler('nutausik_decision_list', { task_slug: 't1' })
    expect(r).toContain('TypeScript')
  })

  it('nutausik_memory_compact groups last N', async () => {
    await viaHandler('nutausik_memory_add', { type: 'pattern', title: 'P1', content: 'C1' })
    const r = await viaHandler('nutausik_memory_compact', { last: 5 })
    expect(r).toContain('[pattern]')
  })

  it('nutausik_dead_end records event', async () => {
    const r = await viaHandler('nutausik_dead_end', { approach: 'test-approach', reason: 'did not work' })
    expect(Number(r)).toBeGreaterThan(0)
  })
})

describe('MCP — gates & verify', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-gate-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_gates_list', async () => {
    const r = await viaHandler('nutausik_gates_list', {})
    expect(r).toContain('filesize')
  })

  it('nutausik_gates_enable/disable', async () => {
    let r = await viaHandler('nutausik_gates_enable', { name: 'ruff' })
    expect(r).toContain('enabled')
    r = await viaHandler('nutausik_gates_disable', { name: 'ruff' })
    expect(r).toContain('disabled')
  })

  it('nutausik_gates_reset', async () => {
    const r = await viaHandler('nutausik_gates_reset', {})
    expect(r).toContain('default')
  })

  it('nutausik_verify runs gates on a task', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', goal: 'G', acceptance_criteria: 'AC' })
    await viaHandler('nutausik_task_start', { slug: 't1' })
    const r = await viaHandler('nutausik_verify', { task_slug: 't1', scope: 'standard' })
    expect(r).toContain('gates')
  })

  it('nutausik_qg0_dimensions_score', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1', goal: 'Long enough goal text here', acceptance_criteria: 'Long enough AC text here' })
    const r = await viaHandler('nutausik_qg0_dimensions_score', { slug: 't1' })
    expect(r).toContain('QG-0')
    expect(r).toContain('t1')
  })
})

describe('MCP — config & roles', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-cfg-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_config_get/set', async () => {
    let r = await viaHandler('nutausik_config_get', { key: 'project' })
    expect(r).toBe('mcp-test')
    r = await viaHandler('nutausik_config_set', { key: 'test_key', value: 'test_val' })
    expect(r).toContain('set')
  })

  it('nutausik_config_show', async () => {
    const r = await viaHandler('nutausik_config_show', {})
    expect(r).toContain('project')
  })

  it('nutausik_role_add/list/show', async () => {
    await viaHandler('nutausik_role_add', { slug: 'dev', title: 'Developer', description: 'Writes code' })
    let r = await viaHandler('nutausik_role_list', {})
    expect(r).toContain('dev')
    r = await viaHandler('nutausik_role_show', { slug: 'dev' })
    expect(r).toContain('Developer')
  })
})

describe('MCP — search', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-srch-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_fts_search returns results', async () => {
    await viaHandler('nutausik_task_add', { slug: 'special-task', title: 'Special search target', goal: 'Find me', acceptance_criteria: 'Located' })
    const r = await viaHandler('nutausik_fts_search', { query: 'special' })
    expect(r).toContain('Special search target')
  })

  it('nutausik_fts_search returns empty for no match', async () => {
    const r = await viaHandler('nutausik_fts_search', { query: 'zzzznonexistent' })
    expect(r).toBe('No results')
  })

  it('nutausik_events_list returns events', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    const r = await viaHandler('nutausik_events_list', {})
    expect(r).toContain('created')
  })

  it('nutausik_metrics returns counts', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    const r = await viaHandler('nutausik_metrics', {})
    expect(r).toContain('"total"')
  })
})

describe('MCP — explore', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-expl-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_explore_start/list', async () => {
    await viaHandler('nutausik_task_add', { slug: 't1', title: 'T1' })
    const r = await viaHandler('nutausik_explore_start', { title: 'Test exploration', task_slug: 't1', time_limit_min: 30 })
    const id = Number(r)
    expect(id).toBeGreaterThan(0)
  })
})

describe('MCP — web search (stub)', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-web-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_web_context set/get/clear', async () => {
    let r = await viaHandler('nutausik_web_context', { action: 'set', context: 'test context' })
    expect(r).toBe('Context set.')
    r = await viaHandler('nutausik_web_context', { action: 'get' })
    expect(r).toContain('test')
    r = await viaHandler('nutausik_web_context', { action: 'clear' })
    expect(r).toBe('Context cleared.')
  })

  it('nutausik_web_cache_clear', async () => {
    const r = await viaHandler('nutausik_web_cache_clear', {})
    expect(r).toBe('Cache cleared.')
  })
})

describe('MCP — receipts & keys', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-krp-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_key_generate returns fingerprint', async () => {
    const r = await viaHandler('nutausik_key_generate', {})
    expect(typeof r).toBe('string')
    expect(r.length).toBeGreaterThan(0)
  })

  it('nutausik_key_fingerprint returns same key', async () => {
    const r1 = await viaHandler('nutausik_key_generate', {})
    const r2 = await viaHandler('nutausik_key_fingerprint', {})
    expect(r1).toBe(r2)
  })
})

describe('MCP — skills & stacks', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-ss-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('nutausik_skill_list', async () => {
    const r = await viaHandler('nutausik_skill_list', {})
    expect(typeof r).toBe('string')
  })

  it('nutausik_stack_list', async () => {
    const r = await viaHandler('nutausik_stack_list', {})
    expect(typeof r).toBe('string')
  })

  it('nutausik_stack_info', async () => {
    const r = await viaHandler('nutausik_stack_info', { name: 'typescript' })
    expect(r).toContain('typescript')
  })
})

describe('MCP — error handling', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mcp-err-'))
    initProject()
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('unknown tool returns error message', async () => {
    const r = await viaHandler('nutausik_nonexistent', {})
    expect(r).toBe('Unknown tool: nutausik_nonexistent')
  })

  it('task start with missing slug throws', async () => {
    await expect(viaHandler('nutausik_task_start', {})).rejects.toThrow()
  })

  it('task add with missing slug throws', async () => {
    await expect(viaHandler('nutausik_task_add', { title: 'No slug' })).rejects.toThrow()
  })
})
