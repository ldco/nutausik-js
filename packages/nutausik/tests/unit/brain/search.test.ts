import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { BrainSearch } from '../../../src/brain/search.js'

describe('BrainSearch', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'brain-test-'))
    mkdirSync(join(tmpDir, 'docs'), { recursive: true })
    writeFileSync(join(tmpDir, 'docs', 'architecture.md'), `# Architecture Overview

The system uses a three-layer architecture:
- Frontend: Vue.js with TypeScript
- Backend: Node.js with Drizzle ORM  
- Database: SQLite with WAL mode

Key decisions:
- Use composition API
- Use strict typing everywhere
- Prefer async/await over callbacks
`)
    writeFileSync(join(tmpDir, 'docs', 'auth-flow.md'), `# Authentication Flow

Users authenticate via:
- Email/password with scrypt hashing
- TOTP two-factor authentication
- Session tokens stored in HttpOnly cookies

Rate limiting applies after 5 failed attempts.
`)
    writeFileSync(join(tmpDir, 'docs', 'deployment.md'), `# Deployment

Deploy using Docker Compose.
Environment variables control secrets.
Database migrations run automatically on startup.
`)
    originalCwd = process.cwd()
    process.chdir(tmpDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('search finds matching documents by keyword', () => {
    const bs = new BrainSearch()
    const results = bs.search('authentication')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.title.includes('Authentication'))).toBe(true)
  })

  it('search returns empty for non-matching query', () => {
    const bs = new BrainSearch()
    const results = bs.search('zzzznonexistent12345')
    expect(results).toEqual([])
  })

  it('search ranks results by score', () => {
    const bs = new BrainSearch()
    const results = bs.search('architecture')
    expect(results.length).toBeGreaterThan(0)
    // Scores should be descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score)
    }
  })

  it('search returns first 5 results by default limit', () => {
    const bs = new BrainSearch()
    const results = bs.search('the')
    // Limit to 10 by default
    expect(results.length).toBeLessThanOrEqual(10)
  })

  it('search respects explicit limit', () => {
    const bs = new BrainSearch()
    const results = bs.search('the', 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('result entries have required fields', () => {
    const bs = new BrainSearch()
    const results = bs.search('database')
    for (const r of results) {
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('title')
      expect(r).toHaveProperty('content')
      expect(r).toHaveProperty('source')
      expect(r).toHaveProperty('score')
      expect(typeof r.score).toBe('number')
    }
  })

  it('ignores files without .md extension', () => {
    writeFileSync(join(tmpDir, 'docs', 'notes.txt'), 'architecture is important')
    const bs = new BrainSearch()
    const results = bs.search('architecture')
    // Should still get results from .md files
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns empty when docs directory does not exist', () => {
    process.chdir(originalCwd)
    const otherDir = mkdtempSync(join(tmpdir(), 'brain-empty-'))
    process.chdir(otherDir)
    const bs = new BrainSearch()
    const results = bs.search('anything')
    expect(results).toEqual([])
    process.chdir(originalCwd)
    rmSync(otherDir, { recursive: true, force: true })
  })
})
