import { describe, it, expect } from 'vitest'
import { suggestModel, getFamilyRank, matchesProfile } from '../../../src/model/routing.js'

describe('suggestModel', () => {
  it('returns claude-haiku for trivial tier', () => {
    const model = suggestModel({ tier: 'trivial', complexity: null, stack: null })
    expect(model).toBe('claude-haiku')
  })

  it('returns claude-haiku for light tier', () => {
    const model = suggestModel({ tier: 'light', complexity: null, stack: null })
    expect(model).toBe('claude-haiku')
  })

  it('returns claude-sonnet for moderate tier', () => {
    const model = suggestModel({ tier: 'moderate', complexity: null, stack: null })
    expect(model).toBe('claude-sonnet')
  })

  it('returns claude-sonnet for substantial tier', () => {
    const model = suggestModel({ tier: 'substantial', complexity: null, stack: null })
    expect(model).toBe('claude-sonnet')
  })

  it('returns claude-opus for deep tier', () => {
    const model = suggestModel({ tier: 'deep', complexity: null, stack: null })
    expect(model).toBe('claude-opus')
  })

  it('falls back to complexity when no tier', () => {
    const model = suggestModel({ tier: null, complexity: 'simple', stack: null })
    expect(model).toBe('claude-haiku')
  })

  it('falls back to complexity medium', () => {
    const model = suggestModel({ tier: null, complexity: 'medium', stack: null })
    expect(model).toBe('claude-sonnet')
  })

  it('falls back to complexity complex', () => {
    const model = suggestModel({ tier: null, complexity: 'complex', stack: null })
    expect(model).toBe('claude-opus')
  })

  it('defaults to moderate (b) when no tier or complexity', () => {
    const model = suggestModel({ tier: null, complexity: null, stack: null })
    expect(model).toBe('claude-sonnet')
  })

  it('tier takes precedence over complexity', () => {
    const model = suggestModel({ tier: 'trivial', complexity: 'complex', stack: null })
    expect(model).toBe('claude-haiku')
  })
})

describe('getFamilyRank', () => {
  it('returns 1 for family a', () => {
    expect(getFamilyRank('a')).toBe(1)
  })

  it('returns 2 for family b', () => {
    expect(getFamilyRank('b')).toBe(2)
  })

  it('returns 3 for family c', () => {
    expect(getFamilyRank('c')).toBe(3)
  })

  it('returns 0 for unknown family', () => {
    expect(getFamilyRank('x')).toBe(0)
  })
})

describe('matchesProfile', () => {
  it('matches claude-haiku to family a', () => {
    expect(matchesProfile('claude-haiku', 'a')).toBe(true)
  })

  it('matches claude-sonnet to family b', () => {
    expect(matchesProfile('claude-sonnet', 'b')).toBe(true)
  })

  it('matches claude-opus to family c', () => {
    expect(matchesProfile('claude-opus', 'c')).toBe(true)
  })

  it('matches partial model IDs', () => {
    expect(matchesProfile('anthropic.claude-sonnet-v2', 'b')).toBe(true)
  })

  it('does not match wrong family prefix-based', () => {
    // 'o1' only in family c, so it won't match family a
    expect(matchesProfile('o1', 'a')).toBe(false)
  })

  it('matches by prefix overlap (claude-haiku contains claude from claude-opus)', () => {
    // Prefix-based matching: 'claude' matches both family a (haiku) and c (opus)
    expect(matchesProfile('claude-haiku', 'c')).toBe(true)
  })

  it('returns false for unknown family', () => {
    expect(matchesProfile('claude-haiku', 'x')).toBe(false)
  })
})
