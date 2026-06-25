import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parsePlanMd } from '../../../src/utils/plan-parser.js'

describe('parsePlanMd', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'plan-test-')) })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('parses a plan with goal and steps', () => {
    const path = join(tmpDir, 'plan.md')
    writeFileSync(path, `# Release Plan

## Goal
Ship the new auth module

## Implementation Steps
- Implement login endpoint
- Add token validation
- Test the flow

## Risks
- Breaking change to API

## Acceptance Criteria
- All tests pass
- CI green
`)
    const plan = parsePlanMd(path)
    expect(plan).not.toBeNull()
    expect(plan!.title).toBe('Release Plan')
    expect(plan!.goal).toContain('auth module')
    expect(plan!.steps.length).toBe(3)
    expect(plan!.risks.length).toBe(1)
    expect(plan!.acceptance.length).toBe(2)
  })

  it('returns null for nonexistent file', () => {
    expect(parsePlanMd('/nonexistent.md')).toBeNull()
  })

  it('handles minimal plan', () => {
    const path = join(tmpDir, 'minimal.md')
    writeFileSync(path, `# Minimal Plan`)
    const plan = parsePlanMd(path)
    expect(plan).not.toBeNull()
    expect(plan!.title).toBe('Minimal Plan')
  })
})
