import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTempDir, createConfig, cleanupDir } from '../setup.js'
import {
  isNutausikProject,
  loadConfig,
  clearConfigCache,
  getValidStacks,
  defaultSessionMaxMinutes,
  validateGateCommand,
} from '../../src/config.js'

let tempDir: string

beforeEach(() => {
  tempDir = createTempDir()
})

afterEach(() => {
  cleanupDir(tempDir)
  clearConfigCache()
})

describe('isNutausikProject', () => {
  it('returns false for directory without .nutausik', () => {
    const noTausikDir = createTempDir(false)
    expect(isNutausikProject(noTausikDir)).toBe(false)
    cleanupDir(noTausikDir)
  })

  it('returns true for directory with .nutausik', () => {
    createConfig(tempDir, { project: 'test' })
    expect(isNutausikProject(tempDir)).toBe(true)
  })
})

describe('loadConfig', () => {
  it('loads config from .nutausik directory', () => {
    createConfig(tempDir, { project: 'my-project', version: 1 })
    const cfg = loadConfig(tempDir)
    expect(cfg.project).toBe('my-project')
    expect(cfg.version).toBe(1)
  })

  it('returns default config when no file exists', () => {
    const cfg = loadConfig(tempDir)
    expect(cfg.project).toBe('')
  })
})

describe('getValidStacks', () => {
  it('returns default stacks without custom config', () => {
    const stacks = getValidStacks(null)
    expect(stacks.has('python')).toBe(true)
    expect(stacks.has('react')).toBe(true)
    expect(stacks.has('go')).toBe(true)
  })

  it('includes custom stacks from config', () => {
    const stacks = getValidStacks({ custom_stacks: ['elixir', 'solidity'] })
    expect(stacks.has('elixir')).toBe(true)
    expect(stacks.has('solidity')).toBe(true)
    expect(stacks.has('python')).toBe(true)
  })
})

describe('defaultSessionMaxMinutes', () => {
  it('returns default 180', () => {
    expect(defaultSessionMaxMinutes(null)).toBe(180)
  })

  it('uses config value', () => {
    expect(defaultSessionMaxMinutes({ session_max_minutes: 300 })).toBe(300)
  })
})

describe('validateGateCommand', () => {
  it('passes for allowed executables', () => {
    expect(() => validateGateCommand('ruff check {files}')).not.toThrow()
    expect(() => validateGateCommand('pytest tests/')).not.toThrow()
  })

  it('throws for disallowed executables', () => {
    expect(() => validateGateCommand('rm -rf /')).toThrow()
  })

  it('throws for shell injection', () => {
    expect(() => validateGateCommand('ruff check {files} | cat')).toThrow()
    expect(() => validateGateCommand('ruff; cat /etc/passwd')).toThrow()
  })
})
