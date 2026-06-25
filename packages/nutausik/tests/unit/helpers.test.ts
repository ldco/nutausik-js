import { describe, it, expect } from 'vitest'
import {
  ServiceError,
  validateSlug,
  slugFromTitle,
  utcnowIso,
  formatTable,
  safeJsonParse,
} from '../../src/utils/helpers.js'

describe('validateSlug', () => {
  it('accepts valid slugs', () => {
    expect(() => validateSlug('my-task')).not.toThrow()
    expect(() => validateSlug('task-123')).not.toThrow()
    expect(() => validateSlug('a')).not.toThrow()
    expect(() => validateSlug('hello_world')).not.toThrow()
  })

  it('rejects empty slug', () => {
    expect(() => validateSlug('')).toThrow(ServiceError)
  })

  it('rejects slugs with leading dash', () => {
    expect(() => validateSlug('-task')).toThrow(ServiceError)
  })

  it('rejects slugs with trailing dash', () => {
    expect(() => validateSlug('task-')).toThrow(ServiceError)
  })

  it('rejects slugs with uppercase', () => {
    expect(() => validateSlug('MyTask')).toThrow(ServiceError)
  })

  it('rejects slugs longer than 64 chars', () => {
    const long = 'a' + 'b'.repeat(64)
    expect(() => validateSlug(long)).toThrow(ServiceError)
  })
})

describe('slugFromTitle', () => {
  it('converts title to slug', () => {
    expect(slugFromTitle('My Task')).toBe('my-task')
    expect(slugFromTitle('Fix the   bug')).toBe('fix-the-bug')
    expect(slugFromTitle('Hello World!')).toBe('hello-world')
  })
})

describe('utcnowIso', () => {
  it('returns ISO-8601 format with Z suffix', () => {
    const result = utcnowIso()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })
})

describe('formatTable', () => {
  it('formats a table from rows', () => {
    const rows = [
      { slug: 'task-1', status: 'active' },
      { slug: 'task-2', status: 'done' },
    ]
    const result = formatTable(rows, ['slug', 'status'])
    expect(result).toContain('task-1')
    expect(result).toContain('active')
    expect(result).toContain('task-2')
    expect(result).toContain('done')
  })

  it('returns (none) for empty rows', () => {
    expect(formatTable([], ['slug'])).toBe('  (none)')
  })
})

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 })
  })

  it('returns fallback for null', () => {
    expect(safeJsonParse(null, [])).toEqual([])
  })

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('not json', 'default')).toBe('default')
  })
})
