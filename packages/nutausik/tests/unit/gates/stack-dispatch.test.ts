import { describe, it, expect } from 'vitest'
import { detectStacks, gatesForFiles } from '../../../src/gates/stack-dispatch.js'

describe('detectStacks', () => {
  it('detects Python from .py files', () => {
    expect(detectStacks(['main.py'])).toContain('python')
  })

  it('detects TypeScript from .ts files', () => {
    expect(detectStacks(['index.ts'])).toContain('typescript')
  })

  it('detects Go from .go files', () => {
    expect(detectStacks(['main.go'])).toContain('go')
  })

  it('detects Rust from .rs files', () => {
    expect(detectStacks(['lib.rs'])).toContain('rust')
  })

  it('detects multiple stacks from mixed files', () => {
    const stacks = detectStacks(['main.py', 'index.ts', 'main.go'])
    expect(stacks).toContain('python')
    expect(stacks).toContain('typescript')
    expect(stacks).toContain('go')
  })

  it('returns empty for unknown extensions', () => {
    expect(detectStacks(['file.xyz'])).toEqual([])
  })
})

describe('gatesForFiles', () => {
  it('includes universal gates', () => {
    const gates = gatesForFiles(['file.py'])
    expect(gates.some(g => g.name === 'filesize')).toBe(true)
  })

  it('includes stack gates for Python', () => {
    const gates = gatesForFiles(['file.py'])
    expect(gates.some(g => g.name === 'ruff')).toBe(true)
    expect(gates.some(g => g.name === 'mypy')).toBe(true)
  })

  it('includes stack gates for TypeScript', () => {
    const gates = gatesForFiles(['file.ts'])
    expect(gates.some(g => g.name === 'tsc')).toBe(true)
    expect(gates.some(g => g.name === 'eslint')).toBe(true)
  })
})
