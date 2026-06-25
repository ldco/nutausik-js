# Nutausik.js Roadmap — v2.0

**Date:** 2026-06-25
**Package:** `@nocowboy/nutausik` v0.1.0
**Status:** All 10 TAUSIK parity phases complete. Post-parity work begins.

---

## 1. Current State

**86 source files, 42 test files, 467 tests passing, 77% line coverage.** TypeScript strict mode clean.

### Phase Completion (all 10 completed and AC-verified)

| Phase | Source | Tests | AC Items | Status |
|-------|--------|-------|----------|--------|
| 0 — Foundation | 6 files | 24 | 8/8 | ✅ |
| 1 — Backend | 8 files | 36 + 23 | 20/20 | ✅ |
| 2 — Service | 7 files | 48 + 15 | 21/21 | ✅ |
| 3 — Verify + Gates | 14 files | 16 + 16 | 15/15 | ✅ |
| 4 — Crypto | 4 files | 22 + 12 | 13/13 | ✅ |
| 5 — CLI | 1 file | 20 + 9 | 21/21 | ✅ |
| 6 — MCP | 4 files | 51 + 3 | 24/24 | ✅ |
| 7 — Hooks | 17 files | 23 + 3 | 13/13 | ✅ |
| 8 — Skills + Stacks | 2 files | 20 + 3 | 12/12 | ✅ |
| 9 — Brain + Model + Providers | 6 files | 39 + 3 | 12/12 | ✅ |
| 10 — Risk + RENAR + Audit | 9 files | 37 + 3 | 10/10 | ✅ |
| **Total** | **86 source** | **467** | **161/161** | **✅** |

### Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Tests | 467 | >400 |
| Coverage | 77% | ≥76% |
| TypeScript | strict clean | strict clean |
| MCP tools | 123 | ~124 |
| CLI commands | ~50 | full |
| Hooks | 17 | 17 |
| DB schema | v37 | v37 |
| Crypto | ed25519 | RFC 8032 |

---

## 2. Completed Sessions (1-10)

| Session | Description | Output |
|---------|------------|--------|
| **S1** | MCP tools: register, fix field mapping | 123 tools, `taskFields()`, `opt()` helper |
| **S2** | CLI tests + --acceptance mapping | 20 integration tests |
| **S3** | QG-0/QG-2 gates | Already implemented, tested |
| **S4** | Hook tests + 4 missing hooks | 23 tests, 17 hooks total |
| **S5** | Cross-platform crypto | sha512Sync fix, schema alignment |
| **S6** | MCP handler integration | 51 tests covering all categories |
| **S7** | Migration pipeline | 13 tests, v34→v37 verification |
| **S8** | Brain/Model/Provider | 39 tests for routing, search, registry |
| **S9** | Risk/RENAR/Audit | 9 missing files, 37 tests |
| **S10** | Coverage push + npm | 76.8% coverage, vitest config |

---

## 3. Post-Parity Roadmap

Beyond TAUSIK feature parity — items to make Nutausik production-ready.

### Session 11: Receipt Plugin Wiring

Wire `verify/receipt-emit.ts` and `verify/receipt-check.ts` into the MCP verify flow so `nutausik_verify` automatically emits signed receipts.

**AC:**
- `nutausik_verify` with `--emit-receipt` writes a signed receipt to `meta` table
- `nutausik_receipt_show <task>` reads stored receipt
- Receipt verification shows pass/fail status
- Tests: 10+

**Files:** `src/mcp/handlers.ts`, `tests/unit/ac-receipt.test.ts`

### Session 12: sql.js WASM Fallback

`better-sqlite3` is a native addon — can fail to compile on some systems. Add `sql.js` (SQLite compiled to WASM) as a runtime fallback.

**AC:**
- `SQLiteBackend` constructor tries `better-sqlite3` first, falls back to `sql.js`
- Fallback mode logs a warning
- FTS5 search works in both backends (sql.js FTS is limited — LIKE-based fallback)
- Tests: 10+

**Files:** `src/backend/database.ts`, `tests/unit/backend/fallback.test.ts`

### Session 13: Documentation Port

Port EN/RU docs from Python TAUSIK to TypeScript Nutausik. Update paths, code examples, CLI/MCP references.

**AC:**
- `docs/en/` recreated from Python originals with Nutausik paths
- CLI reference matches current `--help` output
- MCP reference lists all 123 tools
- Architecture doc reflects 3-layer TS design
- README.ru.md updated

**Files:** `docs/en/*.md`, `docs/ru/*.md`

### Session 14: npm Package Polish

Prepare for npm publication.

**AC:**
- `package.json` has correct `bin`, `exports`, `types`, `files` fields
- `README.md` has install instructions
- `npm pack` produces clean tarball (no source, no node_modules, no tests)
- Smoke test: `npx @nocowboy/nutausik init` works on clean install
- Tests: 5+

**Files:** `packages/nutausik/package.json`

---

## 4. Timeline

```
Session 11 — Receipt wiring    ← Now (1-2 sessions)
Session 12 — sql.js fallback   ← After receipt wiring
Session 13 — Docs port         ← Parallel with S12
Session 14 — npm polish        ← After S13
```
