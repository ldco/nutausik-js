import type Database from 'better-sqlite3'

const MIGRATIONS: Record<number, (db: Database.Database) => void> = {
  34: (db) => {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN started_model_id TEXT;
      ALTER TABLE tasks ADD COLUMN started_model_version TEXT;
      ALTER TABLE tasks ADD COLUMN done_model_id TEXT;
      ALTER TABLE tasks ADD COLUMN done_model_version TEXT;
      ALTER TABLE tasks ADD COLUMN model_mismatch INTEGER NOT NULL DEFAULT 0;
    `)
  },
  35: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS specs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK(type IN ('ARCH','API','DATA','INT','PROC','UI','AI','SEC','OPS')),
        title TEXT NOT NULL,
        content_ref TEXT,
        version TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','deprecated')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS task_specs (
        task_slug TEXT NOT NULL REFERENCES tasks(slug) ON DELETE CASCADE,
        spec_slug TEXT NOT NULL REFERENCES specs(slug) ON DELETE CASCADE,
        relation TEXT NOT NULL DEFAULT 'implements' CHECK(relation IN ('implements','constrained_by')),
        created_at TEXT NOT NULL,
        PRIMARY KEY (task_slug, spec_slug, relation)
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_specs USING fts5(slug, title, content_ref, content='specs', content_rowid='id');
      CREATE TRIGGER IF NOT EXISTS specs_ai AFTER INSERT ON specs BEGIN
        INSERT INTO fts_specs(rowid, slug, title, content_ref) VALUES (new.id, new.slug, new.title, new.content_ref);
      END;
      CREATE TRIGGER IF NOT EXISTS specs_ad AFTER DELETE ON specs BEGIN
        INSERT INTO fts_specs(fts_specs, rowid, slug, title, content_ref) VALUES ('delete', old.id, old.slug, old.title, old.content_ref);
      END;
      CREATE TRIGGER IF NOT EXISTS specs_au AFTER UPDATE ON specs BEGIN
        INSERT INTO fts_specs(fts_specs, rowid, slug, title, content_ref) VALUES ('delete', old.id, old.slug, old.title, old.content_ref);
        INSERT INTO fts_specs(rowid, slug, title, content_ref) VALUES (new.id, new.slug, new.title, new.content_ref);
      END;
    `)
  },
  36: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS adapts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        tz_ref TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','signed','superseded')),
        parent_adapt TEXT REFERENCES adapts(slug) ON DELETE SET NULL,
        delta_n INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS adapt_interpretations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adapt_slug TEXT NOT NULL REFERENCES adapts(slug) ON DELETE CASCADE,
        tz_ref TEXT NOT NULL,
        citation TEXT NOT NULL,
        engineering_interpretation TEXT NOT NULL,
        term_mapping TEXT,
        scenarios TEXT,
        scope_in TEXT NOT NULL,
        scope_out TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS adapt_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adapt_slug TEXT NOT NULL REFERENCES adapts(slug) ON DELETE CASCADE,
        category TEXT NOT NULL CHECK(category IN ('contradiction','gap','hidden-assumption','feasibility','regulatory','terminology','scope')),
        description TEXT NOT NULL,
        tz_ref TEXT,
        resolution TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS adapt_signatures (
        adapt_slug TEXT NOT NULL REFERENCES adapts(slug) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('client','architect')),
        signed_by TEXT NOT NULL,
        signed_at TEXT NOT NULL,
        key_fingerprint TEXT,
        signature TEXT,
        PRIMARY KEY (adapt_slug, role)
      );
      CREATE TABLE IF NOT EXISTS adapt_links (
        adapt_slug TEXT NOT NULL REFERENCES adapts(slug) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK(target_type IN ('task','spec')),
        target_slug TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (adapt_slug, target_type, target_slug)
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_adapts USING fts5(slug, title, tz_ref, content='adapts', content_rowid='id');
      CREATE TRIGGER IF NOT EXISTS adapts_ai AFTER INSERT ON adapts BEGIN
        INSERT INTO fts_adapts(rowid, slug, title, tz_ref) VALUES (new.id, new.slug, new.title, new.tz_ref);
      END;
      CREATE TRIGGER IF NOT EXISTS adapts_ad AFTER DELETE ON adapts BEGIN
        INSERT INTO fts_adapts(fts_adapts, rowid, slug, title, tz_ref) VALUES ('delete', old.id, old.slug, old.title, old.tz_ref);
      END;
      CREATE TRIGGER IF NOT EXISTS adapts_au AFTER UPDATE ON adapts BEGIN
        INSERT INTO fts_adapts(fts_adapts, rowid, slug, title, tz_ref) VALUES ('delete', old.id, old.slug, old.title, old.tz_ref);
        INSERT INTO fts_adapts(rowid, slug, title, tz_ref) VALUES (new.id, new.slug, new.title, new.tz_ref);
      END;
    `)
  },
  37: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        language TEXT NOT NULL,
        code TEXT NOT NULL,
        source_file TEXT,
        source_lines TEXT,
        taxonomy_kind TEXT,
        fts_rank REAL,
        created_at TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_snippets USING fts5(code, source_file, taxonomy_kind, content='snippets', content_rowid='id');
      CREATE TRIGGER IF NOT EXISTS snippets_ai AFTER INSERT ON snippets BEGIN
        INSERT INTO fts_snippets(rowid, code, source_file, taxonomy_kind) VALUES (new.id, new.code, new.source_file, new.taxonomy_kind);
      END;
      CREATE TRIGGER IF NOT EXISTS snippets_ad AFTER DELETE ON snippets BEGIN
        INSERT INTO fts_snippets(fts_snippets, rowid, code, source_file, taxonomy_kind) VALUES ('delete', old.id, old.code, old.source_file, old.taxonomy_kind);
      END;
      CREATE TRIGGER IF NOT EXISTS snippets_au AFTER UPDATE ON snippets BEGIN
        INSERT INTO fts_snippets(fts_snippets, rowid, code, source_file, taxonomy_kind) VALUES ('delete', old.id, old.code, old.source_file, old.taxonomy_kind);
        INSERT INTO fts_snippets(rowid, code, source_file, taxonomy_kind) VALUES (new.id, new.code, new.source_file, new.taxonomy_kind);
      END;
    `)
  },
}

export function runMigrations(db: Database.Database, fromVersion: number, toVersion: number): void {
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const fn = MIGRATIONS[v]
    if (fn) {
      db.transaction(() => fn(db))()
    }
  }
}
