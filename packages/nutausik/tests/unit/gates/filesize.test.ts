import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { filesizeGate } from '../../../src/gates/filesize.js'

function tempFile(projectDir: string, name: string, lines: number): string {
  const path = join(projectDir, name)
  const content = Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join('\n')
  writeFileSync(path, content)
  return path
}

describe('filesizeGate', () => {
  it('passes for files under the limit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fsize-'))
    const file = tempFile(dir, 'small.py', 10)
    const result = filesizeGate([file])
    expect(result.passed).toBe(true)
  })

  it('blocks for files over the limit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fsize-'))
    const file = tempFile(dir, 'big.py', 500)
    const result = filesizeGate([file], 400)
    expect(result.passed).toBe(false)
    expect(result.output).toContain('500 lines')
  })

  it('handles nonexistent files gracefully', () => {
    const result = filesizeGate(['/nonexistent/file.py'])
    expect(result.passed).toBe(true)
  })
})
