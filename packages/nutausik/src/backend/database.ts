import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { initSchema } from './init.js'

export class SQLiteBackend {
  db: Database.Database
  dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
    mkdirSync(join(dbPath, '..'), { recursive: true })
    this.db = new Database(dbPath, { timeout: 10_000 })
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('busy_timeout = 5000')
    initSchema(this.db)
  }

  close(): void {
    try {
      this.db.pragma('wal_checkpoint(TRUNCATE)')
    } catch { /* best-effort */ }
    this.db.close()
  }

  inTransaction<T>(fn: () => T): T {
    const tx = this.db.transaction(fn)
    return tx()
  }
}
