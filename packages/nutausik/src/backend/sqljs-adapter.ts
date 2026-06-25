import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface SqlJsStatement {
  run(...params: unknown[]): { lastInsertRowid: number; changes: number }
  get(...params: unknown[]): Record<string, unknown> | undefined
  all(...params: unknown[]): Record<string, unknown>[]
}

export class SqlJsWrapper {
  db: SqlJsDatabase
  dbPath: string = ''

  private constructor(db: SqlJsDatabase) {
    this.db = db
  }

  static async create(path: string): Promise<SqlJsWrapper> {
    const SQL = await initSqlJs()
    mkdirSync(join(path, '..'), { recursive: true })
    let db: SqlJsDatabase
    if (existsSync(path)) {
      const buffer = readFileSync(path)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }
    db.run('PRAGMA journal_mode = MEMORY')
    db.run('PRAGMA foreign_keys = ON')
    const wrapper = new SqlJsWrapper(db)
    wrapper.dbPath = path
    return wrapper
  }

  close(): void {
    try {
      const data = this.db.export()
      if (this.dbPath) {
        writeFileSync(this.dbPath, Buffer.from(data))
      }
    } catch { /* best-effort */ }
    this.db.close()
  }

  prepare(sql: string): SqlJsStatement {
    const db = this.db
    return {
      run(...params: unknown[]): { lastInsertRowid: number; changes: number } {
        db.run(sql, params)
        const result = db.exec('SELECT changes() AS changes, last_insert_rowid() AS rowid')
        const row = result[0]?.values[0]
        return {
          lastInsertRowid: row ? Number(row[1]) : 0,
          changes: row ? Number(row[0]) : 0,
        }
      },
      get(...params: unknown[]): Record<string, unknown> | undefined {
        const stmt = db.prepare(sql)
        if (params.length > 0) stmt.bind(params)
        if (stmt.step()) {
          const cols = stmt.getColumnNames()
          const vals = stmt.get()
          stmt.free()
          const row: Record<string, unknown> = {}
          for (let i = 0; i < cols.length; i++) {
            row[cols[i]!] = vals![i]
          }
          return row
        }
        stmt.free()
        return undefined
      },
      all(...params: unknown[]): Record<string, unknown>[] {
        const stmt = db.prepare(sql)
        if (params.length > 0) stmt.bind(params)
        const rows: Record<string, unknown>[] = []
        while (stmt.step()) {
          const cols = stmt.getColumnNames()
          const vals = stmt.get()
          const row: Record<string, unknown> = {}
          for (let i = 0; i < cols.length; i++) {
            row[cols[i]!] = vals![i]
          }
          rows.push(row)
        }
        stmt.free()
        return rows
      },
    }
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      this.db.run('BEGIN')
      try {
        const result = fn()
        this.db.run('COMMIT')
        return result
      } catch (e) {
        this.db.run('ROLLBACK')
        throw e
      }
    }
  }

  pragma(key: string, value?: string): string {
    if (value !== undefined) {
      this.db.run(`PRAGMA ${key} = ${value}`)
      return value
    }
    const result = this.db.exec(`PRAGMA ${key}`)
    const row = result[0]?.values[0]
    return row ? String(row[0]) : ''
  }
}
