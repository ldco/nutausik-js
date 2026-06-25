import { describe, it, expect, afterEach } from 'vitest'
import { detectIde } from '../../src/utils/ide.js'

afterEach(() => {
  delete process.env['TAUSIK_IDE']
})

describe('detectIde', () => {
  it('returns claude as fallback', () => {
    expect(detectIde('/nonexistent')).toBe('claude')
  })

  it('uses TAUSIK_IDE env var when set', () => {
    process.env['TAUSIK_IDE'] = 'cursor'
    expect(detectIde('/nonexistent')).toBe('cursor')
  })

  it('accepts valid IDE env var values', () => {
    process.env['TAUSIK_IDE'] = 'kilo'
    expect(detectIde('/nonexistent')).toBe('kilo')
  })
})
