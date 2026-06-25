import { describe, it, expect } from 'vitest'
import { resolveTestFiles } from '../../../src/gates/test-resolver.js'

describe('resolveTestFiles', () => {
  it('returns array of possible test paths', () => {
    const files = resolveTestFiles(['src/foo.ts'])
    expect(files).toBeInstanceOf(Array)
  })

  it('handles multiple source files', () => {
    const files = resolveTestFiles(['a/b.ts', 'c/d.tsx'])
    expect(files).toBeInstanceOf(Array)
  })

  it('returns empty for nonexistent basename patterns', () => {
    const files = resolveTestFiles(['/nonexistent_dir/xyz.ts'])
    expect(files).toEqual([])
  })
})
