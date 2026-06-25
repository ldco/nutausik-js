import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { computeFilesHash } from '../../../src/verify/files-hash.js'

describe('computeFilesHash', () => {
  it('returns the same hash for the same content', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fh-'))
    writeFileSync(join(dir, 'a.txt'), 'hello')
    writeFileSync(join(dir, 'b.txt'), 'world')
    const h1 = computeFilesHash([join(dir, 'a.txt'), join(dir, 'b.txt')])
    const h2 = computeFilesHash([join(dir, 'a.txt'), join(dir, 'b.txt')])
    expect(h1).toBe(h2)
  })

  it('returns different hashes for different content', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fh-'))
    writeFileSync(join(dir, 'a.txt'), 'hello')
    const h1 = computeFilesHash([join(dir, 'a.txt')])
    writeFileSync(join(dir, 'a.txt'), 'world')
    const h2 = computeFilesHash([join(dir, 'a.txt')])
    expect(h1).not.toBe(h2)
  })

  it('returns the same hash regardless of file order', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fh-'))
    writeFileSync(join(dir, 'a.txt'), 'hello')
    writeFileSync(join(dir, 'b.txt'), 'world')
    const h1 = computeFilesHash([join(dir, 'a.txt'), join(dir, 'b.txt')])
    const h2 = computeFilesHash([join(dir, 'b.txt'), join(dir, 'a.txt')])
    expect(h1).toBe(h2)
  })

  it('handles missing files', () => {
    const hash = computeFilesHash(['/nonexistent/file.txt'])
    expect(hash).toBeTruthy()
    expect(hash.length).toBe(64) // SHA-256 hex
  })
})
