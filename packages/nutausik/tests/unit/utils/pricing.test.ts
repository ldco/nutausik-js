import { describe, it, expect } from 'vitest'
import { estimateCost, estimateTokens, listModelPricing } from '../../../src/utils/pricing.js'

describe('estimateCost', () => {
  it('calculates cost for claude-sonnet', () => {
    const cost = estimateCost('claude-sonnet', 1000, 500)
    // 1000 input tokens * $3/M = $0.003, 500 output * $15/M = $0.0075
    expect(cost.inputCost).toBeCloseTo(0.003, 4)
    expect(cost.outputCost).toBeCloseTo(0.0075, 4)
    expect(cost.total).toBeCloseTo(0.0105, 4)
  })

  it('calculates cost for claude-haiku', () => {
    const cost = estimateCost('claude-haiku', 1000, 500)
    expect(cost.inputCost).toBeCloseTo(0.00025, 5)
    expect(cost.total).toBeGreaterThan(0)
  })

  it('uses default pricing for unknown model', () => {
    const cost = estimateCost('unknown-model', 1000, 500)
    // default = sonnet pricing
    expect(cost.inputCost).toBeCloseTo(0.003, 4)
  })

  it('handles zero tokens', () => {
    const cost = estimateCost('claude-sonnet', 0, 0)
    expect(cost.total).toBe(0)
  })

  it('handles large token counts', () => {
    const cost = estimateCost('claude-haiku', 500_000, 100_000)
    expect(cost.total).toBeGreaterThan(0)
    expect(cost.total).toBeLessThan(1)
  })
})

describe('estimateTokens', () => {
  it('estimates tokens for short text', () => {
    expect(estimateTokens('hello')).toBe(2)
  })

  it('estimates tokens for longer text', () => {
    expect(estimateTokens('a'.repeat(100))).toBe(25)
  })
})

describe('listModelPricing', () => {
  it('returns pricing map', () => {
    const pricing = listModelPricing()
    expect(pricing['claude-haiku']).toBeDefined()
    expect(pricing['claude-sonnet']).toBeDefined()
    expect(pricing['claude-opus']).toBeDefined()
  })
})
