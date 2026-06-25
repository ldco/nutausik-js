# Full TAUSIK → TypeScript Port Plan — v2.0 (revised)

**Source:** TAUSIK v1.5.6 (Python, ~113,540 lines, 244 modules)
**Target:** `@nocowboy/tausik` (TypeScript)
**Status:** Phase 0 complete (types, config, utils, 27 tests passing)

## 1. Architecture (preserved)

```
Engineer → AI Agent → { CLI | MCP }
                         ↓
                    Service Layer    ← business logic, QG-0, QG-2
                         ↓
                    Backend Layer    ← better-sqlite3 CRUD, FTS5, metrics
                         ↓
                    SQLite (WAL)     ← .tausik/tausik.db (27 tables + 8 FTS5)
```

Three layers, strict separation: CLI never touches DB. Service validates. Backend executes.

## 2. Technology Choices — with Trade-off Analysis

| Concern | Python | TypeScript | Trade-off |
|---------|--------|-----------|-----------|
| **DB** | `sqlite3` (sync) | `better-sqlite3` (sync via worker thread for MCP) | Sync in CLI = fast. For MCP (async event loop), wrap in a Worker thread to avoid blocking. Fallback: `sql.js` (WASM) loses FTS5. |
| **CLI** | `argparse` | `commander` | Narrower ecosystem than `yargs` but simpler API. Acceptable for a single-binary CLI. |
| **MCP** | `mcp>=1.0.0` | `@modelcontextprotocol/sdk` | Native TS, same protocol. |
| **Crypto** | Pure Python ed25519 | `@noble/ed25519` | Audit-proof, tree-shakeable, deterministic. Cross-platform compat verified via RFC 8032 test vectors. |
| **Testing** | `pytest` | `vitest` | Faster startup, native watch mode. `describe`/`it` mirrors `class`/`def test_`. |
| **Composition** | Mixin inheritance | Constructor DI + module-level functions | TS classes compose via constructor injection; domain logic lives in exported functions imported by `ProjectService`. No 1:1 mixin-to-class mapping. |
| **Logging** | `logging` stdlib | `pino` | Structured JSON, levels, async transports. |
| **Subprocess** | `subprocess` | `execa` | Promise-based, timeout support, stdout/stderr capture. |

## 3. ISO 25010 Quality Attribute Evaluation

| Dimension | Risk Level | Evidence / Mitigation |
|-----------|-----------|----------------------|
| **Functional Suitability** | ⚠️ Medium | Mapped all 244 Python modules to TS equivalents. Risk: behavior drift in edge cases. Mitigated by test parity gate per phase. |
| **Reliability** | ⚠️ Medium | `better-sqlite3` is a native addon — compilation can fail. Fallback: `sql.js` with LIKE-based search instead of FTS5. DB health check in `tausik doctor`. |
| **Performance Efficiency** | ⚠️ Medium | Sync DB blocks event loop for MCP server. Mitigation: DB access runs in a Worker thread for MCP. CLI remains sync (no event loop blocking concern). |
| **Usability** | ✅ Low | Same CLI interface as Python. Skill files are plain markdown. |
| **Security** | 🔴 High | ed25519 cross-platform signature mismatch would break receipt verification irreversibly. Mitigation: RFC 8032 test vectors + cross-runtime CI gate (compare Python↔TS canonical bytes). Shell injection protection in gate commands (ported ALLOWED_GATE_EXECUTABLES). |
| **Compatibility** | ⚠️ Medium | SQLite schema must be byte-identical between Python and TS. Mitigation: DDL diff tool compares `CREATE TABLE` output from both runtimes. |
| **Maintainability** | ✅ Low | Composition over inheritance. Module-level functions are easier to test and tree-shake than class methods on a megaclass. |
| **Portability** | ✅ Low | Node.js 20+ LTS target. `better-sqlite3` prebuilds available for linux-x64, darwin-x64, darwin-arm64, win-x64. |

## 4. Architecture Consolidation (Python → TS)

Python uses 244 files because mixin-based multiple inheritance forces decomposition into small mixin classes. TS uses composition — related logic can be consolidated.

| Python (27 service mixins) | TS (consolidated) | Reason |
|---|---|---|
| `service_task.py` + `service_task_done.py` + `service_task_team.py` + `service_ac_evidence.py` | `src/service/task.ts` | Single task lifecycle module |
| `service_session.py` + `service_session_metrics.py` | `src/service/session.ts` | Session lifecycle + metrics |
| `service_knowledge.py` + `service_knowledge_aggregates.py` + `service_knowledge_exploration.py` + `service_knowledge_hygiene.py` | `src/service/knowledge.ts` | Memory CRUD + aggregates + hygiene |
| `service_gates.py` + `service_validation.py` | `src/service/gates.ts` | Gate orchestration + validation |
| `service_verification.py` + `verify_*.py` (8 files) | `src/service/verification.ts` + `src/verify/` | Verify cache per Python layering but consolidated |

**Net reduction:** ~40 Python files → ~15 TS files for the service layer while preserving all behavior.

## 5. Corrected Dependency Graph

```
Phase 0 (Foundation) ─────────┐
                              ├── Phase 1 (Backend: SQLite + FTS5 + CRUD + Migrations)
                              │    ├── Phase 2 (Service: task/session/knowledge/hierarchy lifecycle)
                              │    │    ├── Phase 5 (CLI Entry Points)
                              │    │    └── Phase 6 (MCP Server — 124 tools)
                              │    ├── Phase 3 (Verify Cache + Gate Pipeline)
                              │    └── Phase 7 (Hooks: task gate, bash firewall, push gate, etc.)
                              │
                              ├── Phase 4 (Crypto: ed25519, keys, receipts, sign/verify)
                              │
                              └── Phase 8 (Skills + Stacks + Bootstrap)
                                   Phase 9 (Brain + Model Routing + Providers)
                                   Phase 10 (Risk + RENAR + Audit)
```

**Key corrections from v1:**
- Phase 4 (Crypto) moved from Phase 2 dependency to Phase 0 — crypto has zero DB/service dependency
- Phase 7 (Hooks) moved to run in parallel with Phase 2/3/5/6 — hooks read DB directly, don't need service layer
- Phase 8 (Skills/Stacks/Bootstrap) can start immediately after Phase 0 — skill markdowns and stack JSONs are static assets
- **Phase 11 (Full Test Suite) REMOVED** — tests are written WITH each phase, not after

**Parallelism opportunities:**
- Phase 1, Phase 4, Phase 8 can run simultaneously after Phase 0
- Phase 2, Phase 3, Phase 7 can run simultaneously after Phase 1
- Phase 5 and Phase 6 can run simultaneously after Phase 2+3+4

## 6. Phases with Concrete Acceptance Criteria

### Phase 0: Foundation ✅ COMPLETED
**Files:** `src/types/index.ts`, `src/version.ts`, `src/config.ts`, `src/utils/helpers.ts`, `src/utils/ide.ts`, `src/utils/security.ts`

**Acceptance Criteria:**
- [X] AC-0.1: All frozenset equivalents from `project_types.py` exported as const arrays
- [X] AC-0.2: Config loader reads `.tausik/config.json` and returns typed `TausikConfig`
- [X] AC-0.3: `validateSlug()` enforces 1-64 char, lowercase alphanumeric + hyphen/underscore
- [X] AC-0.4: `validateGateCommand()` blocks disallowed executables and shell injection
- [X] AC-0.5: `isTausikProject()` returns true iff `.tausik/` directory exists
- [X] AC-0.6: `detectIde()` respects `TAUSIK_IDE` env var, falls back to file-system detection
- [X] AC-0.7: `isSecurityFile()` identifies sensitive files by basename, extension, and path token
- [X] AC-0.8: 27+ unit tests passing, `tsc --noEmit` clean

### Phase 1: Backend — SQLite + FTS5 + CRUD + Migrations
**Files:** `src/backend/database.ts`, `src/backend/schema.ts`, `src/backend/init.ts`, `src/backend/crud.ts`, `src/backend/queries.ts`, `src/backend/fts.ts`, `src/backend/graph.ts`, `src/backend/migrations/*.ts`

**Acceptance Criteria:**
- [x] AC-1.1: Database opens in WAL mode with `PRAGMA foreign_keys=ON`, `busy_timeout=5000`
- [x] AC-1.2: All 27 tables created with exact CHECK constraints matching Python schema v37
- [x] AC-1.3: 8 FTS5 indexes created: fts_tasks, fts_memory, fts_decisions, fts_task_logs, fts_verification_runs, fts_events, fts_explorations, fts_specs
- [x] AC-1.4: `task_add(slug, title, ...)` inserts a row returning the created task
- [x] AC-1.5: `task_get(slug)` returns null for missing, full row for existing
- [x] AC-1.6: `task_update(slug, fields)` updates only provided fields (column whitelist enforcement)
- [x] AC-1.7: `task_list(status)` filters by status; empty returns all non-archived
- [x] AC-1.8: `task_delete(slug)` deletes task + FTS5 entries in transaction
- [x] AC-1.9: `epic_add/get/update/list/delete`: 5 CRUD operations tested
- [x] AC-1.10: `story_add/get/update/list/delete`: CRUD for stories with FK to epic
- [x] AC-1.11: `session_start/end/current/list`: session lifecycle CRUD
- [x] AC-1.12: `memory_add/get/update/list/delete/search`: memory CRUD + FTS5 search
- [x] AC-1.13: `decision_add/get/list`: decision CRUD
- [x] AC-1.14: `event_add/get_by_entity`: event audit log CRUD
- [x] AC-1.15: Cascade delete: `DELETE FROM epics WHERE slug=X` cascade-deletes stories+tasks via FK
- [x] AC-1.16: Migration v1→v37: fresh DB runs all migrations, ends at SCHEMA_VERSION=37
- [x] AC-1.17: FTS5 search: `fts_search("query")` returns ranked results across tasks+memory+decisions
- [x] AC-1.18: `meta_get/set`: key-value store for schema_version, tool_call_count, etc.
- [x] AC-1.19: All CRUD operations tested against in-memory SQLite (no file I/O in tests)
- [x] AC-1.20: `tsc --noEmit` clean

### Phase 2: Service — Task + Session + Knowledge + Hierarchy
**Files:** `src/service/index.ts`, `src/service/task.ts`, `src/service/session.ts`, `src/service/hierarchy.ts`, `src/service/knowledge.ts`, `src/service/validation.ts`

**Acceptance Criteria:**
- [x] AC-2.1: `task_add()` validates slug, stack, complexity, tier, call_budget against enums
- [x] AC-2.2: `task_start(slug)` enforces QG-0: blocks if no `goal` or `acceptance_criteria`
- [x] AC-2.3: `task_start(slug)` transitions planning→active; active→active (idempotent)
- [x] AC-2.4: `task_start(slug)` checks session capacity (180 min limit)
- [x] AC-2.5: `task_done(slug, ac_verified=true)` enforces QG-2: blocks if verify cache missing/stale
- [x] AC-2.6: `task_done()` returns structured `TaskDoneReport` with gates, blocking_failures, cache_status
- [x] AC-2.7: `task_block(slug)` transitions active→blocked; `task_unblock()` reverts
- [x] AC-2.8: `task_review(slug)` transitions to review
- [x] AC-2.9: `task_delete(slug)` deletes with cascade (FTS5 entries, logs, edges)
- [x] AC-2.10: `task_move(slug, new_story_slug)` moves task to different story
- [x] AC-2.11: `task_claim(slug, agent_id)` marks claimed_by
- [x] AC-2.12: `task_next(agent_id?)` returns highest-score planning task
- [x] AC-2.13: `session_start()` creates new session; `session_end()` closes with summary
- [x] AC-2.14: `session_extend(minutes)` extends active-time limit
- [x] AC-2.15: `session_handoff(data)` saves JSON handoff blob
- [x] AC-2.16: `epic_add/create/list/done/archive`: full epic lifecycle
- [x] AC-2.17: `story_add/create/list/done`: story lifecycle under epic
- [x] AC-2.18: `memory_add(type, title, content)`: creates memory with validation
- [x] AC-2.19: `memory_search(query)`: FTS5 search across memory table
- [x] AC-2.20: `memory_compact(n)`: returns compact markdown of recent memory
- [x] AC-2.21: All operations tested with in-memory SQLite backend

### Phase 3: Verify Cache + Gate Pipeline
**Files:** `src/verify/cache.ts`, `src/verify/constants.ts`, `src/verify/files-hash.ts`, `src/gates/runner.ts`, `src/gates/command-runner.ts`, `src/gates/filesize.ts`, `src/gates/stack-dispatch.ts`, `src/gates/test-resolver.ts`, `src/gates/qg0-check.ts`, `src/gates/ac-check.ts`

**Acceptance Criteria:**
- [x] AC-3.1: `record_run(conn, task_slug, command, exit_code, files_hash)` inserts into `verification_runs`
- [x] AC-3.2: `lookup_recent(task_slug, files_hash)` returns cached result if ≤10 min old + hash matches
- [x] AC-3.3: `lookup_recent()` returns null if cache stale (>10 min) or hash mismatch
- [x] AC-3.4: `run_gates(trigger, files)` dispatches to applicable gates
- [x] AC-3.5: Stack dispatch: `.py` file → python stack gates (pytest, ruff, mypy)
- [x] AC-3.6: Stack dispatch: `.ts` file → typescript stack gates (tsc, eslint)
- [x] AC-3.7: Filesize gate: blocks files >400 lines (configurable)
- [x] AC-3.8: Command gate: runs external command, captures stdout/stderr, reports pass/fail
- [x] AC-3.9: Command gate: blocks disallowed executables (shell injection protection)
- [x] AC-3.10: QG-0 check: rejects `task_start` without `goal` field
- [x] AC-3.11: QG-0 check: rejects `task_start` without `acceptance_criteria`
- [x] AC-3.12: AC check: tier-based verification checklist validation
- [x] AC-3.13: `run_gates_with_cache()`: runs gates if cache miss, returns cached if hit
- [x] AC-3.14: Pipeline timeout: `run_gates` aborts after `verify_pipeline_timeout_seconds` (default 60s)
- [x] AC-3.15: `filesize_gate`: counts lines for `.py`, `.ts`, `.go`, `.rs`, `.java`, `.php` files

### Phase 4: Crypto — ed25519 + Keys + Receipts
**Files:** `src/crypto/ed25519.ts`, `src/crypto/keys.ts`, `src/crypto/receipt.ts`, `src/crypto/sign.ts`

**Acceptance Criteria:**
- [x] AC-4.1: `generateSeed()` produces 32 random bytes (crypto.randomBytes)
- [x] AC-4.2: `publicFromSeed(seed)` derives ed25519 public key (32 bytes)
- [x] AC-4.3: `sign(seed, message)` produces 64-byte ed25519 signature
- [x] AC-4.4: `verify(publicKey, message, signature)` returns true for valid, false for tampered
- [x] AC-4.5: RFC 8032 test vectors: signing known seed+message produces known signature (Section 7.1)
- [x] AC-4.6: `loadSeed(projectDir)` reads 32-byte key from `.tausik/tausik.key`
- [x] AC-4.7: `saveSeed(projectDir, seed)` writes 32-byte key to `.tausik/tausik.key` with 0o600 perms
- [x] AC-4.8: `fingerprint(publicKey)` produces 16-char hex (SHA-256/16)
- [x] AC-4.9: `buildReceipt(task_slug, git_sha, scope, gates, passed, ran_at)` → canonical dict
- [x] AC-4.10: `canonicalBytes(receipt)` → deterministic JSON (keys sorted, no whitespace, ensure_ascii)
- [x] AC-4.11: Same logical receipt always serializes to same bytes (cross-platform determinism)
- [x] AC-4.12: `signReceipt(projectDir, receipt)` → `tausik-signed/v1` envelope
- [x] AC-4.13: `verifyReceipt(envelope)` validates signature against embedded public key fingerprint
- [ ] **CRITICAL:** Cross-platform test — Python-generated receipt signature verified by TS and vice versa

### Phase 5: CLI Entry Points
**Files:** `src/cli/index.ts`, `src/cli/parser.ts`, `src/cli/handlers/*.ts`

**Acceptance Criteria:**
- [ ] AC-5.1: `tausik init` creates `.tausik/` directory with config.json
- [ ] AC-5.2: `tausik status` prints task counts, session info, epic/story summary
- [ ] AC-5.3: `tausik task add <slug> <title>` creates task in planning status
- [ ] AC-5.4: `tausik task start <slug>` activates task (QG-0 enforced)
- [ ] AC-5.5: `tausik task done <slug> --ac-verified` closes task (QG-2 enforced)
- [ ] AC-5.6: `tausik task list [--status active]` filters tasks
- [ ] AC-5.7: `tausik task show <slug>` prints full task details
- [ ] AC-5.8: `tausik task update <slug> --goal "..." --acceptance "..."` updates fields
- [ ] AC-5.9: `tausik task log <slug> "message"` appends journal entry
- [ ] AC-5.10: `tausik task block/unblock/review/delete <slug>` — all lifecycle transitions
- [ ] AC-5.11: `tausik task move <slug> <new_story>` moves task between stories
- [ ] AC-5.12: `tausik task claim <slug> <agent_id>` claims task
- [ ] AC-5.13: `tausik session start/end/extend/list/current` — session lifecycle
- [ ] AC-5.14: `tausik epic add/list/show` — epic management
- [ ] AC-5.15: `tausik story add/list/show` — story management
- [ ] AC-5.16: `tausik memory add/list/search` — knowledge management
- [ ] AC-5.17: `tausik verify [--task <slug>] [--full]` — run verification
- [ ] AC-5.18: `tausik doctor` — 4-group health check
- [ ] AC-5.19: `tausik metrics` — SENAR KPI report
- [ ] AC-5.20: All CLI commands return exit code 0 on success, nonzero on error
- [ ] AC-5.21: CLI help text matches Python version output

### Phase 6: MCP Server — 124 Tools
**Files:** `src/mcp/index.ts`, `src/mcp/tools.ts`, `src/mcp/tools-extra.ts`, `src/mcp/handlers/*.ts`

**Acceptance Criteria:**
- [ ] AC-6.1: MCP server starts via stdio transport (`@modelcontextprotocol/sdk`)
- [ ] AC-6.2: `tools/list` returns 117 project tools + 7 brain tools = 124 total
- [ ] AC-6.3: Every tool has name matching `tausik_*` prefix from Python version
- [ ] AC-6.4: Every tool has `inputSchema` with type, properties, required fields
- [ ] AC-6.5: `tausik_status` returns project status (tasks, session, epics, stories)
- [ ] AC-6.6: `tausik_task_add/quick/start/done/show/list/update/plan/step/log/logs/block/unblock/review/delete/move/next/claim/unclaim` — all 22 task tools functional
- [ ] AC-6.7: `tausik_task_done` returns structured JSON with `blocking_failures`, `gates`, `cache_status`
- [ ] AC-6.8: `tausik_session_start/end/extend/current/list/handoff/last_handoff/open` — all 8 session tools
- [ ] AC-6.9: `tausik_epic_add/list/show/update/delete` — epic tools
- [ ] AC-6.10: `tausik_story_add/list/show/update/delete` — story tools
- [ ] AC-6.11: `tausik_memory_add/search/get/update/delete/list/compact/surface/block` — memory tools
- [ ] AC-6.12: `tausik_verify` — verify tool with `task_slug`, `relevant_files`, `scope`, `trigger` params
- [ ] AC-6.13: `tausik_doctor` — health check tool
- [ ] AC-6.14: `tausik_metrics` — SENAR metrics tool
- [ ] AC-6.15: `tausik_search` — FTS5 search tool
- [ ] AC-6.16: `tausik_role_*` — role management tools
- [ ] AC-6.17: `tausik_skill_*` — skill management tools
- [ ] AC-6.18: `tausik_stack_*` — stack management tools
- [ ] AC-6.19: `tausik_explore_*` — exploration tools
- [ ] AC-6.20: `tausik_health` — health check returns version + DB status
- [ ] AC-6.21: `tausik_self_check` — MCP server freshness check
- [ ] AC-6.22: All tool calls return structured text (not exceptions)
- [ ] AC-6.23: Error responses include `usage:` hint for self-correcting calls
- [ ] AC-6.24: Integration test with MCP client SDK exercises every tool

### Phase 7: Hooks
**Files:** `src/hooks/*.ts`

**Acceptance Criteria:**
- [ ] AC-7.1: `task_gate`: blocks Write/Edit when no active task in DB (exit code 2)
- [ ] AC-7.2: `task_gate`: skip via `TAUSIK_SKIP_HOOKS=1`
- [ ] AC-7.3: `task_gate`: `TAUSIK_HOOK_FAIL_SECURE=1` blocks on DB error (fail-closed)
- [ ] AC-7.4: `bash_firewall`: blocks `rm -rf /`, `DROP TABLE`, `git push --force main`
- [ ] AC-7.5: `bash_firewall`: word-boundary matching (no false positives on echo/comment strings)
- [ ] AC-7.6: `git_push_gate`: blocks push to main/master without valid push ticket
- [ ] AC-7.7: `secret_scan`: detects API keys (`sk-`, `ghp_`, etc.) in staged files
- [ ] AC-7.8: `scope_write_gate`: blocks file writes outside declared `scope_paths`
- [ ] AC-7.9: `session_start`: injects project status into AGENTS.md at session start
- [ ] AC-7.10: `task_call_counter`: warns at 40 tool calls since last checkpoint
- [ ] AC-7.11: `memory_pretool_block`: blocks Prolific Write/Edit outside scope
- [ ] AC-7.12: Hooks receive JSON on stdin with `tool_name`, `tool_input`
- [ ] AC-7.13: All hooks exit 0 (allow) on non-TAUSIK projects

### Phase 8: Skills + Stacks + Bootstrap
**Files:** `src/skills/manager.ts`, `src/stacks/registry.ts`, copied assets

**Acceptance Criteria:**
- [ ] AC-8.1: `stack_registry.load_all()` reads 25 stack definition JSONs from `stacks/` directory
- [ ] AC-8.2: `stack_registry.gates_for(name)` returns gates from `stack.json`
- [ ] AC-8.3: `stack_registry.validate(name)` validates against `_schema.json`
- [ ] AC-8.4: Stack detection: `detect_stacks(projectDir)` returns stacks matching file signatures
- [ ] AC-8.5: `skill_manager.install(name)` installs skill from repository
- [ ] AC-8.6: `skill_manager.uninstall(name)` removes skill
- [ ] AC-8.7: `skill_manager.list()` returns installed skills
- [ ] AC-8.8: `skill_manager.info(name)` returns SKILL.md content
- [ ] AC-8.9: 15 core skill SKILL.md files copied from `harness/skills/` to `packages/tausik/skills/`
- [ ] AC-8.10: 25 stack definition JSONs copied from root `stacks/` to `packages/tausik/stacks/`
- [ ] AC-8.11: 5 role markdown files copied from `harness/roles/`
- [ ] AC-8.12: Bootstrap: `tausik init` creates `.tausik/` with config, DB, keypair

### Phase 9: Brain + Model Routing + Web Search Providers
**Files:** `src/brain/*.ts`, `src/model/*.ts`, `src/providers/*.ts`

**Acceptance Criteria:**
- [ ] AC-9.1: Brain DB schema created with correct tables
- [ ] AC-9.2: Brain init: create/join project brain database
- [ ] AC-9.3: Brain sync: Notion → SQLite (optional, config-gated)
- [ ] AC-9.4: Brain search: FTS5 search across brain content
- [ ] AC-9.5: `model_routing.suggest(task)`: returns recommended model based on complexity, tier, stack
- [ ] AC-9.6: `model_pinning.start(slug, model)`: records which model started a task
- [ ] AC-9.7: `model_pinning.done(slug, model)`: records which model completed a task
- [ ] AC-9.8: DuckDuckGo provider: `tausik_search(query)` returns results (zero API key)
- [ ] AC-9.9: Provider registry: add providers via config
- [ ] AC-9.10: `tausik_fetch(url)`: extracts readable content from web pages
- [ ] AC-9.11: `tausik_context`: conversation context tracker (recent queries + manual context)
- [ ] AC-9.12: Rate limiter: token-bucket per-IP/per-key throttle

### Phase 10: Risk + RENAR + Audit + Remaining
**Files:** `src/risk/*.ts`, `src/renar/*.ts`, remaining utilities

**Acceptance Criteria:**
- [ ] AC-10.1: `risk_compute(task)`: returns risk score 0.0–1.0
- [ ] AC-10.2: `risk_l3_trigger(task)`: returns true if risk triggers Level 3 review
- [ ] AC-10.3: `renar_conformance.check()`: runs RENAR conformance scan
- [ ] AC-10.4: `renar_drift.detect()`: detects drift between artifacts
- [ ] AC-10.5: `renar_export.export()`: exports artifacts to `renar/` directory
- [ ] AC-10.6: `plan_parser.parse(markdown)`: extracts tasks from `/run` plan
- [ ] AC-10.7: `root_cause.analyze(task)`: structured root cause from task log
- [ ] AC-10.8: `cost_pricing.compute(tokens_in, tokens_out, model)`: cost in USD
- [ ] AC-10.9: All remaining Python audit scripts ported and tested
- [ ] AC-10.10: `tsc --noEmit` clean, full `vitest` suite passes

## 7. Testing Strategy

| Layer | Test Type | Tool | Coverage Target |
|---|---|---|---|
| Types | Compile-time | tsc | N/A |
| Backend | Unit (in-memory SQLite) | vitest | 85%+ |
| Service | Unit (backend mock) | vitest | 80%+ |
| CLI | Smoke (execa) | vitest | 70%+ |
| MCP | Integration (MCP SDK client) | vitest | 75%+ |
| Gates | Unit (mock subprocess) | vitest | 85%+ |
| Crypto | Unit (deterministic, RFC 8032 vectors) | vitest | 95%+ |
| Hooks | Unit (stdin JSON, exit code) | vitest | 80%+ |
| Providers | Unit (mock fetch) + Integration (flag) | vitest | 80%+ |

**Tests are written WITH each phase — not as a separate phase.**

## 8. Cross-Platform Crypto Interoperability Strategy

The single highest-risk area. TS generated receipts must be verifiable by TS and vice versa.

**Test Vectors:**
- RFC 8032 Section 7.1 test vectors for ed25519: known seed + message → known signature
- TAUSIK-specific test vectors: known receipt JSON → known canonical bytes → known signature

**CI Gate:**
1. Generate a test receipt in Python (reference implementation)
2. Export receipt + signature + canonical bytes → JSON file
3. TS port loads JSON, verifies signature against Python's public key
4. TS port generates its own receipt, Python verifies it
5. Both directions must pass before Phase 4 is complete

**Canonical Serialization Rules:**
- Keys sorted lexicographically at every level
- Separators `,` / `:` with no whitespace
- All strings ASCII-encoded (no non-ASCII in JSON)
- No floats — rejects NaN/Inf
- Timestamps as ISO-8601 strings with `Z` suffix
- `buildReceipt` → `canonicalBytes` → `sign` pipeline identical in both runtimes

## 9. better-sqlite3 Sync/Async Strategy

| Context | Approach | Reason |
|---|---|---|
| **CLI** | Sync `better-sqlite3` directly | CLI is single-threaded. No event loop to block. Same as Python. |
| **MCP Server** | `better-sqlite3` in a `Worker` thread | MCP runs in async event loop. Worker thread pools DB operations via message-passing. Maintains responsiveness under concurrent tool calls. |
| **Tests** | In-memory `better-sqlite3` with `:memory:` | Fast, isolated, no filesystem I/O. |
| **Fallback** | `sql.js` (WASM) | If native compilation fails. Loses FTS5 — LIKE-based search as degraded mode. |

## 10. Risk Assessment (updated)

| Risk | Severity | Impact | Mitigation |
|---|---|---|---|
| ed25519 cross-platform signature mismatch | 🔴 Critical | Breaks all receipt verification. Users cannot trust agent verification output. | RFC 8032 vectors + bidirectional CI gate. Phase 4 BLOCKS on this. |
| `better-sqlite3` build failure on target platform | ⚠️ High | Cannot open DB. Framework non-functional. | `sql.js` WASM fallback. Prebuild detection in CI. |
| DB blocked event loop in MCP server | ⚠️ Medium | Tool calls time out under concurrent load. | Worker thread pool. `tausik_self_check` monitors. |
| Python↔TS behavior drift in edge cases | ⚠️ Medium | Same task produces different result in each runtime. | E2E workflow tests. Phase gates on test parity. |
| Hook system IDE compatibility | 🟡 Low | Hooks rely on stdin JSON contract — same as Python. | IDE-specific wrappers are thin adapters. |
| 244-module scope exhaustion | ⚠️ Medium | Team runs out of steam before completion. | Phases are independently shippable. Each delivers value. |
| SQLite DDL divergence (Python vs TS schema) | 🟡 Low | Tables differ subtly. Migration fails. | DDL diff tool in CI compares `CREATE TABLE` output from both. |

## 11. Project Structure (consolidated TS)

```
packages/tausik/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── version.ts
│   ├── types/index.ts           # All shared types, enums, constants ✅
│   ├── config.ts                # Config loader ✅
│   ├── backend/
│   │   ├── database.ts          # SQLiteBackend class
│   │   ├── schema.ts            # DDL (27 tables, 8 FTS5)
│   │   ├── init.ts              # Schema init + migrations
│   │   ├── crud.ts              # Core CRUD (epic, story, task, session, memory, decisions, events)
│   │   ├── queries.ts           # Query helpers
│   │   ├── fts.ts               # FTS5 full-text search
│   │   ├── graph.ts             # Memory graph edges
│   │   ├── metrics.ts           # Session + tier metrics
│   │   └── migrations/
│   │       └── index.ts         # v34→v37 migrations
│   ├── service/
│   │   ├── index.ts             # ProjectService (constructor DI)
│   │   ├── task.ts              # Task lifecycle (add/start/done/block/claim)
│   │   ├── session.ts           # Session lifecycle + metrics
│   │   ├── hierarchy.ts         # Epic/Story CRUD
│   │   ├── knowledge.ts         # Memory CRUD + aggregates + hygiene
│   │   ├── gates.ts             # Gate orchestration + validation
│   │   ├── verification.ts      # Verify cache
│   │   ├── roles.ts             # Role management
│   │   └── stacks.ts            # Stack operations
│   ├── cli/
│   │   ├── index.ts             # Entry + dispatch
│   │   ├── parser.ts            # Commander commands
│   │   └── handlers/            # Per-subcommand handlers
│   ├── mcp/
│   │   ├── index.ts             # MCP server (stdio)
│   │   ├── tools.ts             # 124 tool definitions
│   │   ├── handlers.ts          # Dispatch → service
│   │   └── self-check.ts        # Server freshness check
│   ├── gates/
│   │   ├── defaults.ts          # UNIVERSAL_GATES + stack scoped
│   │   ├── runner.ts            # Gate execution engine
│   │   ├── command-runner.ts    # External command execution
│   │   ├── filesize.ts          # 400-line cap
│   │   ├── stack-dispatch.ts    # File→Stack→Gate mapping
│   │   ├── test-resolver.ts     # Source→Test file mapping
│   │   ├── qg0.ts               # QG-0 checks (goal, AC, negative scenario)
│   │   └── ac.ts                # AC verification checklist
│   ├── verify/
│   │   ├── cache.ts             # Verification run cache (10-min TTL)
│   │   ├── files-hash.ts        # Content-hash of relevant files
│   │   ├── git-diff.ts          # Git diff cross-check
│   │   ├── receipt-emit.ts      # Receipt emission
│   │   └── receipt-check.ts     # Receipt validation
│   ├── crypto/
│   │   ├── ed25519.ts           # @noble/ed25519 wrapper
│   │   ├── keys.ts              # Keypair management
│   │   ├── receipt.ts           # Canonical receipt construction
│   │   └── sign.ts              # Sign/verify envelopes
│   ├── hooks/                    # 26 Python → 16 TS (see §14)
│   ├── brain/                   # Shared Brain (Phase 9)
│   ├── model/                   # Model routing (Phase 9)
│   ├── providers/               # Web search providers (Phase 9)
│   ├── risk/                    # Risk model (Phase 10)
│   ├── renar/                   # RENAR conformance (Phase 10)
│   ├── skills/                  # Skill management (Phase 8)
│   ├── stacks/                  # Stack registry (Phase 8)
│   └── utils/
│       ├── helpers.ts           # ✅ ServiceError, validation, formatting
│       ├── ide.ts               # ✅ IDE detection
│       ├── security.ts          # ✅ Security patterns
│       ├── pricing.ts           # Cost model
│       └── plan-parser.ts       # Markdown plan parser
├── tests/
│   ├── setup.ts                 # Test fixtures
│   ├── unit/
│   │   ├── backend/
│   │   ├── service/
│   │   ├── gates/
│   │   ├── crypto/
│   │   ├── verify/
│   │   ├── hooks/
│   │   └── utils/
│   └── integration/
│       ├── cli/
│       ├── mcp/
│       └── workflow/
├── stacks/                      # 25 stack definitions (copied)
├── skills/                      # 15 core skill markdowns (copied)
└── README.md
```

## 12. Migration Path (Python → TS)

1. **Phase 0–2:** TS runs alongside Python. Both share `.tausik/tausik.db` (schema-identical). Users can switch with `tausik use <python|typescript>`.
2. **Phase 3–7:** Feature parity achieved for core (tasks, sessions, knowledge, gates, verify, hooks, CLI, MCP). TS becomes the default for new projects.
3. **Phase 8–10:** Full parity. Python `scripts/` moved to `scripts/py-legacy/`. Bootstrap, skills, stacks all TS-driven.
4. **Phase 10 complete:** Python removed. `@nocowboy/tausik` published as the canonical TAUSIK.

## 13. Verification Checklist (per phase)

Each phase completes with:
- [ ] All AC items ticked
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` passes (all tests green)
- [ ] Tests co-developed with each module (not deferred)
- [ ] Git diff reviewed for secrets, debug prints, TODO markers
- [ ] Commit with conventional commit message: `feat(port): phase N — <description>`

## 14. Hooks — Full Mapping (26 Python → 16 TS)

| Python Hook | TS Module | Priority | Trigger | What it does |
|---|---|---|---|---|
| `_common.py` | `src/hooks/common.ts` | P0 | — | Shared utilities (is_tausik_project, stdin JSON parse) |
| `task_gate.py` | `src/hooks/task-gate.ts` | P0 | PreToolUse (Write/Edit) | Block edits when no active task |
| `bash_firewall.py` | `src/hooks/bash-firewall.ts` | P0 | PreToolUse (Bash) | Block dangerous commands |
| `session_start.py` | `src/hooks/session-start.ts` | P0 | SessionStart | Inject status into AGENTS.md |
| `git_push_gate.py` | `src/hooks/git-push-gate.ts` | P1 | PreToolUse (Bash) | Block push to main without ticket |
| `secret_scan.py` | `src/hooks/secret-scan.ts` | P1 | PreCommit | Detect API keys in staged files |
| `scope_write_gate.py` | `src/hooks/scope.ts` | P1 | PreToolUse (Write/Edit) | Block writes outside scope_paths |
| `memory_pretool_block.py` | `src/hooks/scope.ts` | P1 | PreToolUse (Write) | Block Prolific Write outside scope (merged into scope.ts) |
| `task_done_verify.py` | `src/hooks/task-verify.ts` | P1 | PostTaskDone | Verify task closure was valid |
| `task_call_counter.py` | `src/hooks/task-verify.ts` | P1 | PreToolUse | Checkpoint reminder at 40+ calls (merged into task-verify.ts) |
| `auto_format.py` | `src/hooks/auto-format.ts` | P1 | PostToolUse (Edit) | Auto-format edited files |
| `memory_posttool_audit.py` | `src/hooks/memory-audit.ts` | P1 | PostToolUse | Audit memory after tool use |
| `memory_markers.py` | `src/hooks/memory-audit.ts` | P2 | PostToolUse | Memory marker injection (merged) |
| `session_metrics.py` | `src/hooks/session-metrics.ts` | P1 | SessionEnd | Log session metrics on end |
| `task_cost_budget_check.py` | `src/hooks/budgets.ts` | P2 | PreToolUse | Enforce cost budget per task |
| `token_metrics.py` | `src/hooks/budgets.ts` | P2 | PostToolUse | Track token usage (merged) |
| `activity_event.py` | `src/hooks/activity.ts` | P2 | PostToolUse | Log activity events |
| `posttool_usage.py` | `src/hooks/activity.ts` | P2 | PostToolUse | Track tool usage (merged) |
| `tool_output_truncation_nudge.py` | `src/hooks/activity.ts` | P2 | PostToolUse | Warn on truncated output (merged) |
| `user_prompt_submit.py` | `src/hooks/activity.ts` | P2 | UserPromptSubmit | Log user prompts (merged) |
| `session_cleanup_check.py` | `src/hooks/session-metrics.ts` | P2 | SessionEnd | Verify session cleanup (merged) |
| `keyword_detector.py` | `src/hooks/keyword-detect.ts` | P2 | PreToolUse | Keyword-aware behavior triggers |
| `check_docs.py` | `src/hooks/check-docs.ts` | P2 | PreCommit | Doc-constants drift check |
| `brain_post_webfetch.py` | `src/hooks/brain-webfetch.ts` | P2 | PostToolUse (webfetch) | Brain-aware webfetch handling |
| `brain_search_proactive.py` | `src/hooks/brain-search.ts` | P2 | PostToolUse | Proactive brain search trigger |

**Grouping logic:**
- Related hooks merged by domain: session (3→2), memory (2→1), metrics/budgets (3→1), activity/logging (4→1)
- Single-responsibility hooks stay standalone: task_gate, bash_firewall, git_push_gate, secret_scan, auto_format
- All 26 behaviors preserved across 16 TS files

## 15. MCP Tool Surface — Category Breakdown

| Tool Category | Count | Examples |
|---|---|---|
| **Task lifecycle** | 22 | task_add, task_quick, task_start, task_done, task_show, task_list, task_update, task_plan, task_step, task_log, task_logs, task_block, task_unblock, task_review, task_delete, task_move, task_next, task_claim, task_unclaim, reason_step, task_replay, task_block_story |
| **Session** | 8 | session_start, session_end, session_extend, session_current, session_list, session_handoff, session_last_handoff, session_open |
| **Epic** | 5 | epic_add, epic_list, epic_show, epic_update, epic_delete |
| **Story** | 5 | story_add, story_list, story_show, story_update, story_delete |
| **Memory/Knowledge** | 12 | memory_add, memory_search, memory_get, memory_update, memory_delete, memory_list, memory_compact, memory_block, memory_surface, memory_decide, decision_add, decision_list |
| **Exploration** | 4 | explore_start, explore_end, explore_list, explore_show |
| **Gates/Verify** | 8 | verify, gates_list, gates_enable, gates_disable, gates_reset, qg0_dimensions_score, ac_evidence_log, ac_evidence_list |
| **Doctor/Health** | 3 | health, self_check, doctor |
| **Metrics** | 4 | metrics, usage_event_log, usage_events, session_usage |
| **Roles** | 5 | role_add, role_list, role_show, role_update, role_delete |
| **Skills** | 7 | skill_install, skill_uninstall, skill_list, skill_info, skill_profiles, skill_profile_rebuild, skill_profile_current |
| **Stacks** | 4 | stack_list, stack_info, stack_scaffold, stack_diff |
| **Config** | 3 | config_get, config_set, config_show |
| **Search** | 2 | search, fts_search |
| **Events** | 3 | events_list, event_show, dead_end |
| **Spec/ADAPT** | 8 | spec_add, spec_list, spec_show, adapt_add, adapt_list, adapt_show |
| **Key/Receipt** | 5 | key_generate, key_fingerprint, receipt_show, receipt_verify, receipt_export |
| **Brain** | 7 | brain_status, brain_search, brain_classify, brain_publish, brain_artifact, brain_sync, brain_config |
| **Other** | 7 | status, hud, suggest_model, push_ok, snippet_detect, snippet_add, run |
| **Total (project)** | **117** | |
| **Total (brain)** | **7** | |
| **Grand total** | **124** | |

## 16. What We Do NOT Port

| Module | Reason |
|---|---|
| `audit_unused_python.py` | Python-specific — no unused Python in TS codebase |
| `codebase-rag/` MCP server | Optional server, not core TAUSIK. Port later if needed. |
| `pytest_test_count.py` | Replaced by `vitest --list` or coverage report |
| `validate_prompt_caching.py` | Claude-specific (Anthropic API caching). TS port is agnostic. |
| `providers/` Python directory | Python MCP host integration. TS equivalent is `commander` + `execa`. |
| `cq_client.py` | Cross-project queue client. Edge feature — defer to Phase 10 or later. |

## 17. Database Schema — Complete Enumeration (v37)

### 17.1 Real Tables (27)

| # | Table | Purpose | Key columns |
|---|---|---|---|
| 1 | `meta` | Key-value metadata | `key TEXT PK`, `value TEXT NOT NULL` |
| 2 | `epics` | Project epics | `slug UNIQUE`, `title`, `status` (active/done/archived) |
| 3 | `stories` | Stories under epics | FK→epics(id) CASCADE, `slug UNIQUE`, `status` (open/active/done) |
| 4 | `tasks` | The central entity — 38 columns | FK→stories(id) CASCADE, `slug UNIQUE`, 5 statuses, complexity, tier, risk_score, model tracking, budgets, scope, AC, rollback_plan |
| 5 | `sessions` | Agent sessions | `started_at`, `ended_at`, `summary`, `handoff`, `tasks_done`, `model_id` |
| 6 | `decisions` | Architectural decisions | `decision`, `task_slug` FK, `rationale` |
| 7 | `memory` | Project memory (pattern/gotcha/convention/context/dead_end) | `type` CHECK, `title`, `content`, `tags`, FK→tasks |
| 8 | `explorations` | Time-boxed investigations | FK→tasks, `time_limit_min`, `started_at/ended_at` |
| 9 | `reviews` | Task review records (L1/L2/L3) | FK→tasks CASCADE, `run_type`, `critical_findings`, `warnings` |
| 10 | `brain_events` | Shared Brain event log | FK→sessions, `event_type` (search/hit/write/ignored) |
| 11 | `memory_edges` | Graph links between memory/decision | `source_type/target_type` (memory/decision), `relation` (supersedes/caused_by/relates_to/contradicts), `confidence`, `valid_from/to` |
| 12 | `task_logs` | Structured task journal | FK→tasks CASCADE, `phase` (planning/implementation/review/testing/done), `diff_stats` |
| 13 | `reasoning_steps` | RENAR reasoning trace (intent/premise/action/verification) | FK→tasks CASCADE, `seq`, `kind` CHECK, `content` |
| 14 | `events` | Audit log with hash-chain | `entity_type/entity_id`, `action`, `actor`, `details`, `prev_hash/entry_hash` (SHA-256 chain) |
| 15 | `events_anchor` | ed25519-signed audit chain head | `head_id`, `head_hash`, `event_count`, `envelope_json` |
| 16 | `roles` | Role registry (hybrid: DB + harness/roles/*.md) | `slug PK`, `title`, `description` |
| 17 | `verification_runs` | Verify cache (10-min TTL) | `task_slug`, `scope` CHECK, `command`, `exit_code`, `files_hash`, `receipt_json` |
| 18 | `session_usage_metrics` | Per-session token/cost aggregates | FK→sessions CASCADE, `tokens_input/output/total`, `cost_usd`, `tool_calls` |
| 19 | `usage_events` | Per-toolcall token/cost records | FK→sessions CASCADE, FK→tasks, `source` (session_record/manual/posttool), `tool_name` |
| 20 | `specs` | RENAR SPEC artifacts (ARCH/API/DATA/INT/PROC/UI/AI/SEC/OPS) | `slug UNIQUE`, `type` CHECK, `version`, `status` (draft/active/deprecated) |
| 21 | `task_specs` | M:N link between tasks and specs | PK(task_slug, spec_slug, relation), `relation` (implements/constrained_by) |
| 22 | `adapts` | RENAR ADAPT artifacts | `slug UNIQUE`, `tz_ref`, `status` (draft/signed/superseded), `parent_adapt` FK self-ref, `delta_n` |
| 23 | `adapt_interpretations` | ADAPT interpretation rows | FK→adapts CASCADE, `citation`, `engineering_interpretation`, `term_mapping`, `scenarios`, `scope_in/out` |
| 24 | `adapt_findings` | ADAPT findings (contradiction/gap/hidden-assumption/feasibility/regulatory/terminology/scope) | FK→adapts CASCADE, `category` CHECK, `description`, `resolution` |
| 25 | `adapt_signatures` | ed25519 signatures on ADAPTs (client/architect) | PK(adapt_slug, role), `signed_by`, `key_fingerprint`, `signature` |
| 26 | `adapt_links` | M:N links from ADAPT to tasks/specs | PK(adapt_slug, target_type, target_slug), `target_type` (task/spec) |
| 27 | `snippets` | Code snippet store with AST clone detection | `hash UNIQUE`, `language`, `code`, `source_file`, `source_lines`, `taxonomy_kind`, `fts_rank` |

### 17.2 FTS5 Virtual Tables (8)

| # | Virtual Table | Content Table | Indexed Columns |
|---|---|---|---|
| F1 | `fts_tasks` | `tasks` | slug, title, goal, notes, acceptance_criteria |
| F2 | `fts_memory` | `memory` | title, content, tags |
| F3 | `fts_decisions` | `decisions` | decision, rationale |
| F4 | `fts_task_logs` | `task_logs` | message |
| F5 | `fts_reasoning_steps` | `reasoning_steps` | content |
| F6 | `fts_specs` | `specs` | slug, title, content_ref |
| F7 | `fts_adapts` | `adapts` | slug, title, tz_ref |
| F8 | `fts_snippets` | `snippets` | code, source_file, taxonomy_kind |

Each FTS5 virtual table has INSERT/DELETE/UPDATE triggers on its content table to keep the index in sync.

### 17.3 Regular Indexes (24)

```
stories:             epic_id, status
tasks:               story_id, status, slug
decisions:           task_slug
memory:              type, task_slug
events:              entity_type+entity_id, created_at
task_logs:           slug, phase, created_at
reasoning_steps:     slug+seq, created_at
memory_edges:        source_type+source_id, target_type+target_id, relation, valid_to
verification_runs:   task_slug+ran_at DESC, files_hash
session_usage:       session_id, recorded_at
usage_events:        session+recorded_at, task+recorded_at
specs:               type
task_specs:          spec_slug
adapts:              parent_adapt
adapt_interpretations: adapt_slug
adapt_findings:      adapt_slug
adapt_links:         target_type+target_slug
snippets:            taxonomy_kind, language
```

### 17.4 Audit Triggers (4)

Triggered on INSERT/UPDATE/DELETE of `tasks` to automatically populate the `events` audit log:
- `tasks_audit_insert` — logs task creation
- `tasks_audit_status` — logs status transitions (planning→active→done etc.)
- `tasks_audit_claim` — logs agent claim changes
- `tasks_audit_delete` — logs task deletion

### 17.5 Key Constraints Summary

| Constraint Type | Count | Examples |
|---|---|---|
| `CHECK(status IN (...))` | 12 | task statuses, epic statuses, story statuses, spec types, adapt categories, finding categories |
| `CHECK(length(slug) <= 64)` | 3 | epics, stories, tasks |
| `CHECK(tier IN (...))` | 1 | trivial/light/moderate/substantial/deep |
| `CHECK(complexity IN (...))` | 1 | simple/medium/complex |
| `CHECK(scope IN (...))` | 1 | lightweight/standard/high/critical/manual |
| `FOREIGN KEY ... ON DELETE CASCADE` | 12 | stories→epics, tasks→stories, task_logs→tasks, reasoning_steps→tasks, reviews→tasks, adapt_interpretations→adapts, adapt_findings→adapts, adapt_signatures→adapts, adapt_links→adapts, task_specs→tasks+specs, session_usage→sessions, usage_events→sessions |
| `FOREIGN KEY ... ON DELETE SET NULL` | 6 | tasks.story_id, decisions.task_slug, memory.task_slug, explorations.task_slug, brain_events.session_id, adapts.parent_adapt, usage_events.task_slug, memory_edges.invalidated_by |
| `NOT NULL` | ~90 | All primary keys, timestamps, statuses, required fields |
| `UNIQUE` | 10 | meta.key, epics.slug, stories.slug, tasks.slug, specs.slug, adapts.slug, snippets.hash, session_usage_metrics.session_id, plus composite PKs |

## 18. CLI Command Tree — Python argparse → Commander

| Python subcommand | TS equivalent | Notes |
|---|---|---|
| `tausik init [--name] [--template]` | `commander.command('init')` | Creates .tausik/config.json + DB |
| `tausik status [--compact] [--verbose]` | `commander.command('status')` | Task counts, session info |
| `tausik task add <slug> <title>` | `.command('task add')` | Create task |
| `tausik task quick <title> [--goal] [--acceptance]` | `.command('task quick')` | Quick-create with AC |
| `tausik task start <slug>` | `.command('task start')` | Activate (QG-0 enforced) |
| `tausik task done <slug> [--ac-verified]` | `.command('task done')` | Complete (QG-2 enforced) |
| `tausik task show <slug>` | `.command('task show')` | Full task details |
| `tausik task list [--status] [--story] [--epic] [--role] [--stack]` | `.command('task list')` | Filtered list |
| `tausik task update <slug> [fields...]` | `.command('task update')` | Partial update |
| `tausik task plan <slug> [steps...]` | `.command('task plan')` | Set plan steps |
| `tausik task step <slug> <step_num>` | `.command('task step')` | Mark step done |
| `tausik task log <slug> <message>` | `.command('task log')` | Append log |
| `tausik task logs <slug> [--phase]` | `.command('task logs')` | Read logs |
| `tausik task block <slug>` | `.command('task block')` | Block task |
| `tausik task unblock <slug>` | `.command('task unblock')` | Unblock |
| `tausik task review <slug>` | `.command('task review')` | Move to review |
| `tausik task delete <slug>` | `.command('task delete')` | Delete |
| `tausik task move <slug> <new_story>` | `.command('task move')` | Move between stories |
| `tausik task next [--agent-id]` | `.command('task next')` | Suggest next task |
| `tausik task claim <slug> <agent_id>` | `.command('task claim')` | Claim task |
| `tausik task unclaim <slug>` | `.command('task unclaim')` | Release |
| `tausik task replay <slug>` | `.command('task replay')` | Chronological timeline |
| `tausik task delegate <slug>` | `.command('task delegate')` | Delegate to worker |
| `tausik task handoff <slug>` | `.command('task handoff')` | Handoff contract |
| `tausik task summary-back <slug> <summary>` | `.command('task summary-back')` | Worker returns result |
| `tausik session start|end|extend|list|current` | `session` subcommands | Session lifecycle |
| `tausik epic add|list|show|update|delete` | `epic` subcommands | Epic CRUD |
| `tausik story add|list|show|update|delete` | `story` subcommands | Story CRUD |
| `tausik memory add|search|list|compact|update|delete` | `memory` subcommands | Knowledge CRUD |
| `tausik decide <decision> [--rationale]` | `.command('decide')` | Architectural decision |
| `tausik decisions [--task]` | `.command('decisions')` | List decisions |
| `tausik dead-end <approach> <reason>` | `.command('dead-end')` | Record dead end |
| `tausik verify [--task] [--full] [--files...]` | `.command('verify')` | Run verification |
| `tausik gates list|enable|disable|reset` | `gates` subcommands | Gate management |
| `tausik doctor` | `.command('doctor')` | 4-group health check |
| `tausik metrics` | `.command('metrics')` | SENAR KPI report |
| `tausik search <query>` | `.command('search')` | FTS5 search |
| `tausik explore start|end|list|show` | `explore` subcommands | Exploration management |
| `tausik audit [subcommand]` | `audit` subcommands | Audit reports |
| `tausik brain init|status|search|sync|publish` | `brain` subcommands | Shared Brain ops |
| `tausik skill install|uninstall|list|info|rebuild|bundle` | `skill` subcommands | Skill management |
| `tausik stack list|info|scaffold|diff` | `stack` subcommands | Stack operations |
| `tausik role add|list|show|update|delete` | `role` subcommands | Role management |
| `tausik config show|set [key] [value]` | `config` subcommands | Config management |
| `tausik key generate|fingerprint` | `key` subcommands | Crypto key management |
| `tausik receipt show|verify|export` | `receipt` subcommands | Receipt operations |
| `tausik push-ok` | `.command('push-ok')` | Grant push ticket |
| `tausik spec add|list|show` | `spec` subcommands | SPEC artifacts |
| `tausik adapt add|list|show` | `adapt` subcommands | ADAPT artifacts |
| `tausik renar check|export` | `renar` subcommands | RENAR conformance |
| `tausik drift check` | `drift` subcommands | Drift detection |
| `tausik events list|show|seal` | `events` subcommands | Audit log |
| `tausik hygiene archive` | `hygiene` subcommands | Project hygiene |
| `tausik fts optimize` | `fts` subcommands | FTS5 maintenance |
| `tausik db prune|migrate|reset` | `db` subcommands | DB maintenance |
| `tausik run <plan.md>` | `.command('run')` | Batch plan execution |
| `tausik snippet add|list` | `snippet` subcommands | Snippet operations |

**~50 subcommands** across 15 commander groups. Each group maps to a `src/cli/handlers/*.ts` file.

## 19. Error Handling Patterns

| Python Pattern | TS Equivalent | Example |
|---|---|---|
| `raise ServiceError("msg")` | `throw new ServiceError("msg")` | Validation failures |
| `raise ServiceError` from except block | `throw new ServiceError("msg", { cause: e })` | Wrapping backend errors |
| `except Exception:` (bare) | `catch (e: unknown)` | Required by TS strict mode |
| `from tausik_utils import ServiceError` | `import { ServiceError } from './utils/helpers.js'` | Single import path |
| `validate_slug(slug)` raises | `validateSlug(slug)` throws ServiceError | Same behavior |
| CLI `sys.exit(1)` on error | `process.exit(1)` | Non-recoverable errors |
| MCP handler `except Exception: return str(e)` | `try { ... } catch (e) { return TextContent(text: formatError(e)) }` | Graceful degradation |

**Structured error response format** (for MCP and API):
```typescript
interface TausikErrorResponse {
  error: {
    code: string           // e.g. 'INVALID_SLUG', 'QG0_BLOCKED', 'TASK_NOT_FOUND'
    message: string        // Human-readable
    usage?: string         // Self-correcting hint: "usage: task_start(slug*:string)"
    details?: unknown      // Additional context
  }
}
```

## 20. npm Publishing & CI/CD

### Version Strategy
- Match TAUSIK upstream versions: `@nocowboy/tausik` v0.1.0 during port, v1.5.6 on parity
- Semantic versioning post-1.0: MAJOR for breaking DB schema changes, MINOR for new features, PATCH for fixes

### Build Pipeline
```
git push → GitHub Actions:
  1. npm ci
  2. tsc --noEmit          (typecheck)
  3. eslint src/           (lint)
  4. vitest run            (tests)
  5. vitest run --coverage (≥76% gate)
  6. npm run build         (tsc → dist/)
  7. npm publish           (on git tag)
```

### Publishing
- `@nocowboy/tausik` — main governance framework
- `@nocowboy/mcp-tausik` — companion web search server (separate package.json)
- Both published to npm registry with `access: public`

### Cross-Platform Crypto CI Gate
```
matrix:
  - runtime: python
    script: python scripts/test_cross_crypto.py  # generates reference receipt
  - runtime: node
    script: npx vitest run tests/integration/cross-crypto/  # verifies against reference
```

## 21. Security Considerations for TS Port

| Concern | Mitigation |
|---|---|
| npm supply chain (dependency confusion) | Lock `@nocowboy/tausik` as scoped package. No generic `tausik` name published. |
| better-sqlite3 native addon integrity | Lock to specific version. Verify checksum in CI. Prebuild verification. |
| MCP server stdio transport | No network exposure by default. HTTP transport requires explicit `--port` flag. |
| ed25519 key material | Keys stored in `.tausik/tausik.key` with 0o600 permissions. Never committed. |
| Secret leakage in error messages | `TausikError` never includes raw DB values. Config values redacted in logs. |
| Shell injection in gate commands | ALLOWED_GATE_EXECUTABLES whitelist + regex patterns ported from Python. |
| Prototype pollution (TS-specific) | No `Object.assign` with user input. Use `Map` for key-value stores. |
| ReDoS in user regex | No user-controlled regex patterns exposed. All regexes are compiled constants. |

## 22. Web Search Companion — Relationship

The `@nocowboy/mcp-tausik` web search package is deployed alongside but independent:

```
packages/
├── tausik/              # This plan — full governance framework
│   └── src/providers/   # Web search providers (Phase 10)
└── mcp-tausik/          # Standalone web search MCP server (separate plan)
    └── src/             # 4 tools: search, fetch, context, cache_clear
```

The governance framework's `src/providers/` in Phase 10 implements the same `SearchProvider` interface as `mcp-tausik/`, allowing the framework to use web search internally. The standalone `mcp-tausik/` server can be installed independently without the full governance framework.

## 23. .gitignore / .npmignore

### packages/tausik/.gitignore
```
node_modules/
dist/
.tausik/
*.db
*.db-journal
*.db-wal
*.key
coverage/
```

### packages/tausik/.npmignore
```
src/           # Ship only dist/ + assets
tests/
tsconfig.json
vitest.config.ts
eslint.config.js
```

NPM package contents: `dist/` (compiled JS), `stacks/` (JSON definitions), `skills/` (markdown), `README.md`.

## 24. Implementation Timeline — Effort Estimates

Relative sizing using story points (1=trivial, 13=largest). No calendar dates — effort is relative, not absolute.

| Phase | Story Points | Risk | Why this size |
|---|---|---|---|
| **Phase 0** | 2 (done) | ✅ Low | Types, constants, config loader — no DB, no business logic |
| **Phase 1** — Backend | **13** | 🔴 High | 27 tables, 8 FTS5, ~20 CRUD methods × 5 ops each, migrations v1→v37, FTS5 queries, session metrics, tier metrics, graph edges, events chain. Largest single module. Schema must be byte-identical to Python. |
| **Phase 2** — Service | **8** | ⚠️ Medium | Task lifecycle (add/start/done/QG-0/QG-2), session lifecycle, knowledge CRUD, hierarchy. Business logic on top of Backend. |
| **Phase 3** — Verify+Gates | **5** | ⚠️ Medium | Verify cache, gate runner, command dispatch, filesize, stack dispatch, test resolver, QG-0 check, AC check. Moderate complexity. |
| **Phase 4** — Crypto | **3** | 🔴 Critical | ed25519 keygen/sign/verify, canonical receipt, sign/verify envelopes. Small surface but MUST produce identical output to Python — every test is a cross-runtime comparison. |
| **Phase 5** — CLI | **5** | ⚠️ Medium | ~50 commander subcommands. High volume but repetitive (each handler: parse args → call service → format output). |
| **Phase 6** — MCP | **8** | ⚠️ Medium | 124 tool definitions + handlers + self-check. High volume, handler dispatch is repetitive but tool schemas must match Python exactly. |
| **Phase 7** — Hooks | **5** | 🟡 Low | 16 TS files. Each hook is a standalone script (stdin JSON → query DB → exit code). Independent of each other. |
| **Phase 8** — Skills+Stacks+Bootstrap | **3** | 🟡 Low | Mostly static assets (copy markdown/JSON). Bootstrap is new code but small surface. |
| **Phase 9** — Brain+Model+Providers | **8** | ⚠️ Medium | Brain sync (Notion integration), model routing matrix, web search providers. Moderate complexity but optional. |
| **Phase 10** — Risk+RENAR+Audit | **5** | 🟡 Low | Risk model, RENAR conformance, plan parser, remaining utilities. Smaller modules. |
| **Total** | **65** | | |

### Effort by Layer

```
Layer                    Points   % of total
─────────────────────────────────────────
Backend (Phase 1)          13      20%
Service (Phase 2)           8      12%
Entry Points (Phases 5+6)  13      20%   ← CLI + MCP together = same effort as Backend
Gates+Verify (Phase 3)      5       8%
Crypto (Phase 4)            3       5%
Hooks (Phase 7)             5       8%
Skills+Stacks (Phase 8)     3       5%
Brain+Model (Phase 9)       8      12%
Risk+RENAR (Phase 10)       5       8%
Foundation (Phase 0)        2       3%
─────────────────────────────────────────
Total                      65     100%
```

### Parallelized Timeline

```
Phase 0     ██ done
Phase 1     ██████████████ (13)          ← longest pole
Phase 4     ████ (3)                     ← parallel with Phase 1
Phase 2     ████████ (8)                ← after Phase 1
Phase 3     ██████ (5)                  ← parallel with Phase 2
Phase 7     ██████ (5)                  ← parallel with Phase 2+3
Phase 5     ██████ (5)                  ← after Phase 2+3+4
Phase 6     ████████ (8)                ← parallel with Phase 5
Phase 8     ████ (3)                    ← parallel with Phase 5+6
Phase 9     ████████ (8)                ← after Phase 6
Phase 10    ██████ (5)                  ← parallel with Phase 9
```

**Critical path:** Phase 0 → Phase 1 → Phase 2 → Phase 5 → Phase 6 → Phase 9 → Phase 10 = ~48 points

With parallelism (Phase 4 with Phase 1, Phase 3+7 with Phase 2, Phase 5+6 together):
**Effective path:** ~35 points of sequential work.

### Risk-Weighted Priority

Despite the "Phase" numbering, if this were a single developer:

1. **Do Phase 1 first** — everything depends on it. Once Backend is done, the system can be tested end-to-end.
2. **Do Phase 4 alongside Phase 1** — crypto is small but critical, and it has zero DB dependency. Can be built and verified independently.
3. **Do Phase 2 next** — service layer on top of Backend enables `task start`/`task done` workflows.
4. **Parallelize Phase 3 + Phase 7 after Phase 2** — verify cache and hooks are the "rails" that enforce the workflow.
5. **Do Phase 5 + Phase 6 together** — CLI and MCP are two entry points to the same service. Build one handler pattern, replicate.
6. **Phases 8–10 are lower priority** — they add value but the core workflow (task → code → verify → done) runs without them.

### What "done" looks like per phase

| Phase | Verifiable output |
|---|---|
| 0 | `tsc --noEmit` clean, 27+ tests green |
| 1 | In-memory DB: all CRUD ops tested, migration v1→v37 passes, FTS5 search returns ranked results |
| 2 | `task_start('no-ac')` throws QG-0 error; `task_start('with-ac')` succeeds; `task_done()` returns structured report |
| 3 | `run_gates('verify', [...files])` returns gate results; cache hit returns same result without re-running |
| 4 | `signReceipt(buildReceipt(...))` produces verifiable envelope; Python-generated receipt verified by TS |
| 5 | `tausik status` prints project summary; `tausik task add/start/done` works end-to-end via CLI |
| 6 | `tools/list` returns 124 tools; `tools/call` on `tausik_status` returns structured text |
| 7 | `task_gate` hook blocks Write when no active task (exit 2); `TAUSIK_SKIP_HOOKS=1` allows (exit 0) |
| 8 | `tausik skill install <name>` downloads and installs; `stack list` shows 25 stacks |
| 9 | `tausik brain search "query"` returns cross-project results (or graceful "no brain configured") |
| 10 | `tausik renar check` runs conformance scan; `tausik metrics` shows SENAR KPIs |
