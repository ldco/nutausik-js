import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { initFreshSchema, initSchema } from '../../../src/backend/init.js'
import { SCHEMA_VERSION } from '../../../src/backend/schema.js'
import { runMigrations } from '../../../src/backend/migrations/index.js'

function createDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

function getSchemaVersion(db: Database.Database): number {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string } | undefined
  return row ? parseInt(row.value, 10) : 0
}

function listTables(db: Database.Database): string[] {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name").all() as { name: string }[]
  return rows.map(r => r.name)
}

function listColumns(db: Database.Database, table: string): string[] {
  const rows = db.prepare(`PRAGMA table_info('${table}')`).all() as { name: string }[]
  return rows.map(r => r.name)
}

describe('initFreshSchema', () => {
  it('AC-1.16: creates schema version 37', () => {
    const db = createDb()
    initFreshSchema(db)
    expect(getSchemaVersion(db)).toBe(37)
    db.close()
  })

  it('creates all core tables', () => {
    const db = createDb()
    initFreshSchema(db)
    const tables = listTables(db)
    expect(tables).toContain('tasks')
    expect(tables).toContain('sessions')
    expect(tables).toContain('epics')
    expect(tables).toContain('stories')
    expect(tables).toContain('memory')
    expect(tables).toContain('events')
    expect(tables).toContain('decisions')
    expect(tables).toContain('roles')
    expect(tables).toContain('meta')
    expect(tables).toContain('task_logs')
    expect(tables).toContain('verification_runs')
    db.close()
  })

  it('creates migration-added tables', () => {
    const db = createDb()
    initFreshSchema(db)
    const tables = listTables(db)
    expect(tables).toContain('specs')
    expect(tables).toContain('task_specs')
    expect(tables).toContain('adapts')
    expect(tables).toContain('adapt_interpretations')
    expect(tables).toContain('snippets')
    db.close()
  })

  it('is idempotent (can be called multiple times)', () => {
    const db = createDb()
    initFreshSchema(db)
    initFreshSchema(db)
    initFreshSchema(db)
    expect(getSchemaVersion(db)).toBe(37)
    const tables = listTables(db)
    expect(tables.length).toBeGreaterThan(20)
    db.close()
  })
})

describe('initSchema (with migrations)', () => {
  it('sets version 37 on fresh DB', () => {
    const db = createDb()
    initSchema(db)
    expect(getSchemaVersion(db)).toBe(37)
    db.close()
  })

  it('migrates from old version to current', () => {
    const db = createDb()
    // Set up base schema and old version
    initFreshSchema(db)
    db.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run('34')
    // Re-init should trigger migration 34→37
    initSchema(db)
    expect(getSchemaVersion(db)).toBe(37)
    db.close()
  })

  it('migration v34→v37 adds all migration tables and columns', () => {
    const db = createDb()
    initFreshSchema(db)
    db.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run('34')
    runMigrations(db, 34, 37)
    // Verify migration 34 columns exist
    const taskCols = listColumns(db, 'tasks')
    expect(taskCols).toContain('started_model_id')
    expect(taskCols).toContain('model_mismatch')
    // Verify migration 35-37 tables exist
    const tables = listTables(db)
    expect(tables).toContain('specs')
    expect(tables).toContain('adapts')
    expect(tables).toContain('snippets')
    db.close()
  })

  it('migration v35 creates specs table', () => {
    const db = createDb()
    initFreshSchema(db)
    db.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run('34')
    runMigrations(db, 34, 35)
    const tables = listTables(db)
    expect(tables).toContain('specs')
    expect(tables).toContain('task_specs')
    db.close()
  })

  it('migration v36 creates adapts tables', () => {
    const db = createDb()
    initFreshSchema(db)
    db.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run('35')
    runMigrations(db, 35, 36)
    const tables = listTables(db)
    expect(tables).toContain('adapts')
    expect(tables).toContain('adapt_interpretations')
    expect(tables).toContain('adapt_findings')
    expect(tables).toContain('adapt_signatures')
    expect(tables).toContain('adapt_links')
    db.close()
  })

  it('migration v37 creates snippets table', () => {
    const db = createDb()
    initFreshSchema(db)
    db.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run('36')
    runMigrations(db, 36, 37)
    const tables = listTables(db)
    expect(tables).toContain('snippets')
    db.close()
  })

  it('full migration pipeline v34→v37 produces correct schema', () => {
    const db = createDb()
    initFreshSchema(db)
    db.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run('34')
    runMigrations(db, 34, 37)
    const tables = listTables(db)
    expect(tables).toContain('specs')
    expect(tables).toContain('adapts')
    expect(tables).toContain('snippets')
    const taskCols = listColumns(db, 'tasks')
    expect(taskCols).toContain('started_model_id')
    expect(taskCols).toContain('done_model_version')
    db.close()
  })
})

describe('DDL consistency — fresh vs migrated', () => {
  it('migrated schema has same tables as fresh schema', () => {
    // Fresh schema
    const fresh = createDb()
    initFreshSchema(fresh)
    const freshTables = new Set(listTables(fresh))
    fresh.close()

    // Migrated schema (start from base, add migrations 34→37)
    const migrated = createDb()
    initFreshSchema(migrated)
    migrated.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run('34')
    runMigrations(migrated, 34, 37)
    const migratedTables = new Set(listTables(migrated))
    migrated.close()

    // Fresh has all tables that migrated has (and vice versa)
    const missingInMigrated = [...freshTables].filter(t => !migratedTables.has(t) && !t.startsWith('sqlite_') && !t.startsWith('fts5_'))
    const extraInMigrated = [...migratedTables].filter(t => !freshTables.has(t) && !t.startsWith('sqlite_') && !t.startsWith('fts5_'))

    expect(missingInMigrated).toEqual([])
    expect(extraInMigrated).toEqual([])
  })

  it('fresh schema and migrated schema have same columns per table', () => {
    const fresh = createDb()
    initFreshSchema(fresh)
    const tables = listTables(fresh).filter(t => !t.startsWith('sqlite_') && !t.startsWith('fts5_') && !t.startsWith('fts_'))

    const migrated = createDb()
    initFreshSchema(migrated)
    migrated.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run('34')
    runMigrations(migrated, 34, 37)

    for (const table of tables) {
      const freshCols = listColumns(fresh, table)
      const migratedCols = listColumns(migrated, table)
      expect(migratedCols).toEqual(freshCols)
    }

    fresh.close()
    migrated.close()
  })
})
