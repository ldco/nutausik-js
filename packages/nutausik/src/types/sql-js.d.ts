declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export interface Database {
    run(sql: string, params?: unknown[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  export interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    get(): (string | number | null | Uint8Array)[] | undefined
    getColumnNames(): string[]
    free(): boolean
    reset(): void
  }

  export interface QueryExecResult {
    columns: string[]
    values: (string | number | null | Uint8Array)[][]
  }

  export default function initSqlJs(config?: object): Promise<SqlJsStatic>
}
