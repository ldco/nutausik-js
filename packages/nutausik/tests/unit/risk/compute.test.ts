import { describe, it, expect } from 'vitest'
import { computeRiskScore, requiresL3Review } from '../../../src/risk/compute.js'

describe('computeRiskScore', () => {
  it('returns noGoal + noPlan penalty for empty/default task', () => {
    expect(computeRiskScore({})).toBeCloseTo(0.3, 2)
  })

  it('scores higher with security keywords in goal', () => {
    const score = computeRiskScore({ goal: 'Implement authentication with tokens', acceptance_criteria: 'Login works' })
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('adds noGoal penalty when goal missing', () => {
    const score = computeRiskScore({ acceptance_criteria: 'works' })
    expect(score).toBeCloseTo(0.3, 2)
  })

  it('adds noPlan penalty', () => {
    const score = computeRiskScore({ goal: 'x', plan: undefined })
    expect(score).toBeGreaterThanOrEqual(0.1)
  })

  it('adds complexity penalty for complex', () => {
    const score = computeRiskScore({ complexity: 'complex' })
    expect(score).toBeCloseTo(0.45, 2)
  })

  it('adds deep tier penalty', () => {
    const score = computeRiskScore({ tier: 'deep' })
    expect(score).toBeCloseTo(0.4, 2)
  })

  it('adds defect task penalty', () => {
    const score = computeRiskScore({ defect_of: 'parent-task' })
    expect(score).toBeCloseTo(0.45, 2)
  })

  it('capped at 1.0', () => {
    const maxTask = {
      goal: 'Implement auth with password tokens and credentials and secrets and encryption sessions xss csrf sql injection',
      acceptance_criteria: 'auth password token',
      plan: undefined,
      complexity: 'complex' as const,
      tier: 'deep' as const,
      defect_of: 'parent',
    }
    const score = computeRiskScore(maxTask)
    expect(score).toBeLessThanOrEqual(1)
  })
})

describe('requiresL3Review', () => {
  it('returns false for low score', () => {
    expect(requiresL3Review(0.3)).toBe(false)
  })

  it('returns false for borderline score', () => {
    expect(requiresL3Review(0.59)).toBe(false)
  })

  it('returns true for score at threshold', () => {
    expect(requiresL3Review(0.6)).toBe(true)
  })

  it('returns true for high score', () => {
    expect(requiresL3Review(0.9)).toBe(true)
  })
})
