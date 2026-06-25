import { describe, it, expect } from 'vitest'
import { safeSingleLine, slugFromTitle, utcnowIso, validateLength, safeJsonParse, validateContent, validateSlug } from '../../src/utils/helpers.js'

describe('slugFromTitle', () => {
  it('converts to lowercase kebab', () => {
    expect(slugFromTitle('Hello World')).toBe('hello-world')
  })

  it('handles special characters', () => {
    expect(slugFromTitle('Foo & Bar!')).toBe('foo-bar')
  })
})

describe('safeSingleLine', () => {
  it('replaces newlines with spaces', () => {
    expect(safeSingleLine('hello\nworld')).toBe('hello world')
  })

  it('trims whitespace', () => {
    expect(safeSingleLine('  hello  ')).toBe('hello')
  })
})

describe('utcnowIso', () => {
  it('returns ISO string', () => {
    const now = utcnowIso()
    expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })
})

describe('validateLength', () => {
  it('passes for valid length', () => {
    expect(() => validateLength('hello', 'field', 10)).not.toThrow()
  })

  it('throws for too long', () => {
    expect(() => validateLength('a'.repeat(100), 'field', 10)).toThrow()
  })
})

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 })
  })

  it('returns fallback for null', () => {
    expect(safeJsonParse(null, 'default')).toBe('default')
  })

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('invalid{', 'fallback')).toBe('fallback')
  })
})

describe('validateContent', () => {
  it('rejects undefined values', () => {
    expect(() => validateContent(undefined, 'field')).toThrow()
  })

  it('accepts valid strings', () => {
    expect(() => validateContent('hello', 'field')).not.toThrow()
  })
})

describe('validateSlug', () => {
  it('accepts valid slug', () => {
    expect(() => validateSlug('my-task')).not.toThrow()
  })

  it('rejects empty slug', () => {
    expect(() => validateSlug('')).toThrow()
  })

  it('rejects spaces in slug', () => {
    expect(() => validateSlug('my task')).toThrow()
  })
})
