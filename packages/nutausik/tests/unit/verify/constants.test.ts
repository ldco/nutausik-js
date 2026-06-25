import { describe, it, expect } from 'vitest'
import { DEFAULT_CACHE_TTL_S, VERIFY_SCOPE_ORDER } from '../../../src/verify/constants.js'

describe('verify constants', () => {
  it('DEFAULT_CACHE_TTL_S is 600', () => {
    expect(DEFAULT_CACHE_TTL_S).toBe(600)
  })

  it('VERIFY_SCOPE_ORDER has correct values', () => {
    expect(VERIFY_SCOPE_ORDER).toContain('standard')
    expect(VERIFY_SCOPE_ORDER).toContain('critical')
  })
})
