import type Database from 'better-sqlite3'
import { ALL_DDL_SQL } from './schema.js'
import { SCHEMA_VERSION } from './schema.js'
import { runMigrations } from './migrations/index.js'

export function initSchema(db: Database.Database): void {
  db.exec(ALL_DDL_SQL)

  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string } | undefined
  if (!row) {
    db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION))
  } else {
    const currentVersion = parseInt(row.value, 10)
    if (currentVersion < SCHEMA_VERSION) {
      runMigrations(db, currentVersion, SCHEMA_VERSION)
      db.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run(String(SCHEMA_VERSION))
    }
  }
}

export function initFreshSchema(db: Database.Database): void {
  db.exec(ALL_DDL_SQL)
  db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION))
}
