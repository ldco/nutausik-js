import { describe, it, expect } from 'vitest'
import { isSecurityFile, isSecuritySensitive } from '../../../src/utils/security.js'

describe('isSecurityFile', () => {
  it('detects .env files', () => {
    expect(isSecurityFile('.env')).toBe(true)
    expect(isSecurityFile('.env.production')).toBe(true)
  })

  it('detects private key files', () => {
    expect(isSecurityFile('id_rsa')).toBe(true)
    expect(isSecurityFile('mykey.pem')).toBe(true)
  })

  it('rejects safe files', () => {
    expect(isSecurityFile('index.ts')).toBe(false)
    expect(isSecurityFile('package.json')).toBe(false)
  })
})

describe('isSecuritySensitive', () => {
  it('detects security-sensitive tasks', () => {
    expect(isSecuritySensitive('auth', '')).toBe(true)
    expect(isSecuritySensitive('credential_manager', '')).toBe(true)
    expect(isSecuritySensitive('secret_rotation', '')).toBe(true)
    expect(isSecuritySensitive('permissions', '')).toBe(true)
  })

  it('detects sensitive via file path', () => {
    expect(isSecuritySensitive('styling', '.env')).toBe(true)
    expect(isSecuritySensitive('readme', 'id_rsa')).toBe(true)
  })

  it('rejects non-sensitive tasks', () => {
    expect(isSecuritySensitive('styling', 'index.ts')).toBe(false)
    expect(isSecuritySensitive('fix typo', 'readme.md')).toBe(false)
  })
})
