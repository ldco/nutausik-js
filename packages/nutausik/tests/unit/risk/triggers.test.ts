import { describe, it, expect } from 'vitest'
import { scanForTriggers } from '../../../src/risk/trigger.js'
import { checkRequiresReview } from '../../../src/risk/review.js'

describe('scanForTriggers', () => {
  it('returns empty for non-existent files', () => {
    const triggers = scanForTriggers('/nonexistent/path.ts')
    expect(triggers).toEqual([])
  })
})

describe('checkRequiresReview', () => {
  it('returns null for low-risk task', () => {
    const result = checkRequiresReview({ slug: 'test', goal: 'Simple task' })
    expect(result).toBeNull()
  })

  it('requests review for high-risk task', () => {
    const result = checkRequiresReview({
      slug: 'risk-task',
      goal: 'Implement auth with password tokens',
      acceptance_criteria: 'security login auth',
      complexity: 'complex',
      tier: 'deep',
    })
    expect(result).not.toBeNull()
    expect(result!.task_slug).toBe('risk-task')
    expect(result!.risk_score).toBeGreaterThanOrEqual(0.6)
  })

  it('fails to trigger review with only missing plan/goal (score too low)', () => {
    const result = checkRequiresReview({
      slug: 'low-risk',
      goal: '', // empty goal — counts as missing
    })
    // noGoal = 0.2, noPlan = 0.1 = 0.3 — below threshold
    expect(result).toBeNull()
  })
})
