import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getProvider, listProviders } from '../../../src/providers/registry.js'
import { getContext, setContext, clearContext, clearCache } from '../../../src/providers/web-search.js'

describe('provider registry', () => {
  it('listProviders returns duckduckgo', () => {
    const providers = listProviders()
    expect(providers).toContain('duckduckgo')
  })

  it('getProvider returns a SearchProvider instance', () => {
    const p = getProvider('duckduckgo')
    expect(p).toBeDefined()
    expect(typeof p.search).toBe('function')
  })

  it('getProvider defaults to duckduckgo', () => {
    const p = getProvider()
    expect(p).toBeDefined()
  })

  it('getProvider throws for unknown provider', () => {
    expect(() => getProvider('nonexistent')).toThrow('not found')
  })
})

describe('web search context helpers', () => {
  beforeEach(() => { clearContext(); clearCache() })

  it('getContext returns empty by default', () => {
    expect(getContext()).toBe('')
  })

  it('setContext and getContext round-trip', () => {
    setContext('test context')
    expect(getContext()).toBe('test context')
  })

  it('clearContext resets', () => {
    setContext('something')
    clearContext()
    expect(getContext()).toBe('')
  })

  it('clearCache does not throw', () => {
    expect(() => clearCache()).not.toThrow()
  })
})
