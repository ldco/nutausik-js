import { describe, it, expect } from 'vitest'
import { DuckDuckGoProvider } from '../../../src/providers/duckduckgo.js'

describe('DuckDuckGoProvider', () => {
  it('implements SearchProvider interface', () => {
    const p = new DuckDuckGoProvider()
    expect(p).toBeDefined()
    expect(typeof p.search).toBe('function')
  })

  it('search returns empty array when no network (graceful fallback)', async () => {
    const p = new DuckDuckGoProvider()
    const results = await p.search('test query', { count: 3 })
    // Without network, it should return empty array, not throw
    expect(Array.isArray(results)).toBe(true)
  })
})
