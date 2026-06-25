# Nutausik.js Comprehensive Roadmap — v1.0

**Date:** 2026-06-25
**Package:** `@nocowboy/nutausik` v0.1.0
**Source:** Python TAUSIK v1.5.6 (~113,540 lines, 244 modules, ~3,355 tests)
**Target:** 100% feature parity + npm publication

---

## 1. Current State Assessment

**64 source files, 16 test files, 149 tests passing.** `tsc --noEmit` clean. All 10 planned phases have substantial code. The project is **~65-70% complete** overall, not "Phase 0 only" as the original plan stated.

### Per-Phase Completion Matrix

| Phase | Source Files | Test Files | Tests | AC Items Met | Completion |
|-------|------------|------------|-------|-------------|------------|
| **0 — Foundation** | 6/6 | 5 | 24 | 8/8 | **✅ 100%** |
| **1 — Backend** | 8/8 | 1 | 36 | 15/20 | **🟢 85%** |
| **2 — Service** | 7/7 | 4 | 48 | 18/21 | **🟢 90%** |
| **3 — Verify + Gates** | 10/12 | 3 | 16 | 10/15 | **🟡 70%** |
| **4 — Crypto** | 4/4 | 4 | 22 | 11/13 | **🟢 85%** |
| **5 — CLI** | 1/1 | 0 | 0 | 18/21 | **🟡 60%** |
| **6 — MCP** | 3/4 | 0 | 0 | 3/24 | **🔴 15%** |
| **7 — Hooks** | 13/16 | 0 | 0 | 6/13 | **🟡 50%** |
| **8 — Skills + Stacks** | 2/2 | 0 | 0 | 6/12 | **🟡 50%** |
| **9 — Brain + Model + Providers** | 6/6 | 0 | 0 | 2/12 | **🔴 20%** |
| **10 — Risk + RENAR + Audit** | 2/7 | 0 | 0 | 1/10 | **🔴 10%** |

### Key Findings

| Area | Status | Notes |
|------|--------|-------|
| TypeScript | ✅ Clean | `tsc --noEmit` passes, strict mode |
| Unit tests | ✅ 149 passing | Focused on backend, service, crypto, gates |
| Schema | ✅ 35 CREATE TABLEs | SQLite schema substantially complete |
| Service layer | ✅ Full CRUD | Task/session/hierarchy/knowledge lifecycle |
| Crypto | ✅ Working | ed25519 keygen, sign, verify, receipts |
| CLI | ⚠️ Commands scaffolded | All ~50 subcommands defined but need handler completion |
| MCP | 🔴 Tool registry gap | 98 handlers but only 7 registered tools |
| Hooks | 🟡 Most written | 13/16 files exist but untested |
| Integration tests | 🔴 None | No E2E or MCP integration tests |
| Cross-platform crypto | 🔴 Not verified | No Python↔TS interoperability gate |

---

## 2. Gap Analysis — What Remains

### Phase 1 — Backend (85% → 100%)

**Missing AC items:**
- AC-1.15: Cascade delete tests for FK constraints
- AC-1.16: Migration v1→v37 full pipeline test (migrations/index.ts exists but needs integration test)
- AC-1.17: FTS5 ranked search test across tasks+memory+decisions
- AC-1.18: Meta key-value store get/set tested
- AC-1.20: Already met (tsc clean)

**Missing files:** None — all planned files exist.

### Phase 3 — Verify + Gates (70% → 100%)

**Missing AC items:**
- AC-3.1 through AC-3.3: Verify cache record/lookup/staleness tests
- AC-3.4: `run_gates()` integration test
- AC-3.10/3.11: QG-0 enforcement tests (no goal/AC blocks)
- AC-3.12: AC checklist validation
- AC-3.13: `run_gates_with_cache()` test
- AC-3.14: Pipeline timeout test

**Missing files:** `src/verify/receipt-emit.ts`, `src/verify/receipt-check.ts`, `src/gates/qg0.ts`, `src/gates/ac.ts`

### Phase 4 — Crypto (85% → 100%)

**Missing AC items:**
- AC-4.5: RFC 8032 Section 7.1 test vectors (already tested via ed25519.test.ts — verify)
- **AC-4.13 CRITICAL:** Python-generated receipt verified by TS (MUST add bidirectional cross-runtime gate)

**Missing files:** None — all planned files exist.

### Phase 5 — CLI (60% → 100%)

**Missing AC items:**
- AC-5.1 through AC-5.21: CLI smoke tests (all 21 AC items need test coverage)
- CLI handlers need to be verified against Python reference output format

**Missing files:** None — single `src/cli/index.ts` is functional.

### Phase 6 — MCP (15% → 100%)

**Critical gap:** Only 7 tools registered vs ~98 handlers implemented.

**Missing AC items:**
- AC-6.2: Tool count must be 124 (currently 7 registered + 0 brain)
- AC-6.3: Tool naming must match Python (`tausik_*` → `nutausik_*` mapping to verify)
- AC-6.4: Every tool needs `inputSchema` with Zod validation
- AC-6.5 through AC-6.24: ALL MCP AC items need tool registration + testing
- AC-6.24: MCP integration test with SDK client

**Missing files:** `src/mcp/self-check.ts`

### Phase 7 — Hooks (50% → 100%)

**Missing files (3 of 16):**
- `src/hooks/brain-webfetch.ts`
- `src/hooks/brain-search.ts`
- `src/hooks/activity.ts`
- `src/hooks/check-docs.ts`

**Missing AC items:**
- AC-7.1 through AC-7.13: ALL hook tests (0 tests currently)

### Phase 9 — Brain + Model + Providers (20% → 100%)

**Missing AC items:**
- AC-9.1 through AC-9.12: ALL brain/model/provider tests
- Brain DB schema + init + sync (Notion integration untested)
- Model routing matrix tests
- DuckDuckGo provider integration test (gated)
- Rate limiter token-bucket tests

### Phase 10 — Risk + RENAR + Audit (10% → 100%)

**Missing files:**
- `src/risk/` — only `compute.ts` exists, missing trigger, review
- `src/renar/` — only `conformance.ts` exists, missing drift, export
- `src/utils/pricing.ts`, `src/utils/plan-parser.ts`
- `src/audit/` — no audit scripts ported yet

---

## 3. Prioritized Implementation Order

Based on dependency chains, risk, and value delivery:

### Tier 1 — Must Complete (Core Workflow Enablers)

```
MCP Tool Registration (6) → MCP Integration Tests (6) → MCP Complete
    ↓
CLI Handler Completion (5) → CLI Smoke Tests (5) → CLI Complete
    ↓
Verify/Gates Missing Files (3) → QG-0/QG-2 Live Tests (3) → Gates Complete
```

**Rationale:** MCP + CLI + Gates are the three entry points. Without them, nothing is end-to-end usable.

### Tier 2 — Must Validate (Safety & Correctness)

```
Hook Tests (7) → Hook Missing Files (7) → Hooks Complete
    ↓
Cross-Platform Crypto Gate (4) → Crypto Complete
    ↓
Migration Integration Test (1) → Backend Complete
```

**Rationale:** Hooks enforce the workflow. Cross-platform crypto is the single biggest risk. Migrations must be verified for byte-identical schemas.

### Tier 3 — Complete Feature Set

```
Brain DB + Sync (9) → Model Routing Tests (9) → Providers Integration (9)
    ↓
Risk + RENAR + Audit Remaining (10) → Utils Completion (10)
    ↓
Skill Install/Uninstall Tests (8) → Stack Validation Tests (8)
```

**Rationale:** These add value but don't block the core task → code → verify → done loop.

### Tier 4 — Ship-Ready

```
npm Package Validation → Cross-Platform E2E → Documentation Update → Coverage Gate (76%+)
```

---

## 4. Milestones with Verifiable Exit Criteria

### Milestone M1: MCP Tool Registration Complete
**Files:** `src/mcp/tools.ts`
**AC:** 124 tool definitions registered with Zod inputSchemas matching Python names
**Verification:** `tausik tools/list` returns 124 tools via MCP inspector

### Milestone M2: CLI Smoke Tests Complete
**Files:** `tests/integration/cli/*.test.ts`
**AC:** 21 CLI commands tested end-to-end against in-memory DB
**Verification:** `vitest run tests/integration/cli/` — 21+ tests passing

### Milestone M3: QG-0/QG-2 Live Enforced
**Files:** `src/gates/qg0.ts`, `src/gates/ac.ts`, tests
**AC:** `task_start` blocks without goal/AC. `task_done` blocks without verify cache.
**Verification:** Unit tests demonstrate both blocking and passing paths

### Milestone M4: Hooks Full Coverage
**Files:** 16 hook files + `tests/unit/hooks/*.test.ts`
**AC:** 13 hook behaviors tested. Missing hooks implemented.
**Verification:** `vitest run tests/unit/hooks/` — all hooks tested

### Milestone M5: Cross-Platform Crypto Verified
**Files:** `tests/integration/cross-crypto/*.test.ts`
**AC:** Python-generated receipt verified by TS. TS-generated receipt verified by Python.
**Verification:** `node scripts/test-cross-crypto.ts` passes against Python reference

### Milestone M6: MCP Integration Tests
**Files:** `tests/integration/mcp/*.test.ts`
**AC:** Every tool category exercised via MCP SDK client
**Verification:** `vitest run tests/integration/mcp/` — 124 tool calls pass

### Milestone M7: Migration Pipeline Verified
**Files:** `tests/integration/backend/migration.test.ts`
**AC:** Fresh DB runs v1→v37 migrations, schema matches Python `CREATE TABLE` output
**Verification:** DDL diff tool shows zero differences

### Milestone M8: Full Test Suite
**Files:** All test files complete
**AC:** Coverage ≥76% (matching Python), all integration tests pass
**Verification:** `vitest run --coverage` — threshold met

### Milestone M9: npm Publication Ready
**Files:** `dist/`, `stacks/`, `skills/`, `README.md`, `package.json`
**AC:** `npm pack` produces valid package. `npx @nocowboy/nutausik status` works.
**Verification:** Dry-run publish + smoke test on clean install

---

## 5. Coverage Targets by Module

| Package/Module | Current Tests | Target Tests | Coverage Target |
|---------------|--------------|-------------|-----------------|
| `src/types/` | (compile-time) | — | N/A |
| `src/utils/` | 13 + 3 (helpers + ide) | 20 | 90%+ |
| `src/config.ts` | 11 | 11 | 85%+ |
| `src/backend/` | 36 (crud) | 55 | 85%+ |
| `src/service/` | 48 (task+session+hierarchy+knowledge) | 65 | 80%+ |
| `src/gates/` | 12 (filesize+stack-dispatch) | 25 | 85%+ |
| `src/verify/` | 4 (files-hash) | 15 | 85%+ |
| `src/crypto/` | 22 (all 4 files) | 25 | 95%+ |
| `src/hooks/` | **0** | 30 | 80%+ |
| `src/cli/` | **0** | 25 | 70%+ |
| `src/mcp/` | **0** | 40 | 75%+ |
| `src/skills/` | **0** | 5 | 60%+ |
| `src/stacks/` | **0** | 5 | 60%+ |
| `src/brain/` | **0** | 10 | 70%+ |
| `src/model/` | **0** | 5 | 70%+ |
| `src/providers/` | **0** | 10 | 80%+ |
| `src/risk/` | **0** | 5 | 70%+ |
| `src/renar/` | **0** | 5 | 70%+ |
| **Total** | **149** | **355** | **76%+** |

---

## 6. Risk Register (Updated)

| # | Risk | Severity | Current State | Mitigation |
|---|------|---------|--------------|------------|
| R1 | MCP tool registry gap (7/124) | 🔴 Critical | Handlers exist, tools not registered | Complete `tools.ts` registration first |
| R2 | Cross-platform crypto not verified | 🔴 Critical | TS crypto works in isolation | M5 milestone — bidirectional CI gate |
| R3 | Zero hook tests | ⚠️ High | 13/16 hook files exist | M4 milestone — structured test harness |
| R4 | No CLI or MCP integration tests | ⚠️ High | Scaffolding exists | M2 + M6 milestones |
| R5 | Migration pipeline untested | 🟡 Medium | migrations/index.ts exists | M7 milestone |
| R6 | `better-sqlite3` native compile | 🟡 Low | `sql.js` WASM fallback planned | Fallback not implemented yet |
| R7 | Test debt accumulated | 🟡 Medium | 149 tests for 64 source files | Targeted per-module push |
| R8 | Missing hook files (3/16) | 🟡 Low | Low complexity — standalone scripts | Deferred to M4 |

---

## 7. File Inventory — Exists vs. Missing

### Backend (8/8 files exist)
```
src/backend/database.ts    ✅ (tests: crud.test.ts covers)
src/backend/schema.ts      ✅ (35 CREATE TABLE)
src/backend/init.ts        ✅
src/backend/crud.ts        ✅ (36 tests)
src/backend/queries.ts     ✅ (no dedicated tests)
src/backend/fts.ts         ✅ (no dedicated tests)
src/backend/graph.ts       ✅ (no dedicated tests)
src/backend/metrics.ts     ✅ (no dedicated tests)
src/backend/migrations/    ✅ (index.ts exists)
```

### Service (7/7 files exist)
```
src/service/index.ts       ✅ (ProjectService)
src/service/task.ts        ✅ (22 tests)
src/service/session.ts     ✅ (8 tests)
src/service/hierarchy.ts   ✅ (8 tests)
src/service/knowledge.ts   ✅ (10 tests)
src/service/verification.ts ✅ (no dedicated tests)
src/service/validation.ts  ✅ (no dedicated tests)
```

### Verify + Gates (10/14 files exist, 4 missing)
```
src/verify/cache.ts        ✅ (no tests)
src/verify/constants.ts    ✅
src/verify/files-hash.ts   ✅ (4 tests)
src/verify/git-diff.ts     ✅
src/verify/receipt-emit.ts ❌ MISSING
src/verify/receipt-check.ts ❌ MISSING
src/gates/defaults.ts      ✅
src/gates/runner.ts        ✅ (no tests)
src/gates/command-runner.ts ✅
src/gates/filesize.ts      ✅ (3 tests)
src/gates/stack-dispatch.ts ✅ (9 tests)
src/gates/test-resolver.ts ✅
src/gates/qg0.ts           ❌ MISSING (QG-0 checks)
src/gates/ac.ts            ❌ MISSING (AC validation)
```

### Crypto (4/4 files exist)
```
src/crypto/ed25519.ts      ✅ (7 tests)
src/crypto/keys.ts         ✅ (7 tests)
src/crypto/receipt.ts      ✅ (4 tests)
src/crypto/sign.ts         ✅ (4 tests)
```

### CLI (1/1 file exists)
```
src/cli/index.ts           ✅ (full CLI tree, no tests)
```

### MCP (3/4 files exist, 1 missing)
```
src/mcp/index.ts           ✅ (server entry)
src/mcp/tools.ts           ⚠️ (7 tools registered, need 117 more)
src/mcp/handlers.ts        ✅ (98 handler cases)
src/mcp/self-check.ts      ❌ MISSING
```

### Hooks (13/17 files exist, 4 missing)
```
src/hooks/common.ts        ✅
src/hooks/task-gate.ts     ✅
src/hooks/bash-firewall.ts ✅
src/hooks/session-start.ts ✅
src/hooks/git-push-gate.ts ✅
src/hooks/secret-scan.ts   ✅
src/hooks/scope-gate.ts    ✅
src/hooks/task-verify.ts   ✅
src/hooks/auto-format.ts   ✅
src/hooks/memory-audit.ts  ✅
src/hooks/session-metrics.ts ✅
src/hooks/budgets.ts       ✅
src/hooks/keyword-detect.ts ✅
src/hooks/brain-webfetch.ts ❌ MISSING
src/hooks/brain-search.ts  ❌ MISSING
src/hooks/activity.ts      ❌ MISSING
src/hooks/check-docs.ts    ❌ MISSING
```

### Skills + Stacks (2/2 files exist + 25 JSON + skills dir)
```
src/skills/manager.ts      ✅ (no tests)
src/stacks/registry.ts     ✅ (no tests)
stacks/*/stack.json        ✅ (25 stacks)
skills/*/SKILL.md          ⚠️ (need verification)
```

### Brain + Model + Providers (6/6 files exist)
```
src/brain/search.ts        ✅ (no tests)
src/model/routing.ts       ✅ (no tests)
src/providers/types.ts     ✅
src/providers/registry.ts  ✅
src/providers/web-search.ts ✅
src/providers/duckduckgo.ts ✅
```
**Missing from plan:** Brain DB schema, init, sync, publish, config, classify, artifact files.

### Risk + RENAR + Audit (2/9 files exist, 7 missing)
```
src/risk/compute.ts        ✅ (no tests)
src/renar/conformance.ts   ✅ (no tests)
src/risk/trigger.ts        ❌ MISSING
src/risk/review.ts         ❌ MISSING
src/renar/drift.ts         ❌ MISSING
src/renar/export.ts        ❌ MISSING
src/utils/pricing.ts       ❌ MISSING
src/utils/plan-parser.ts   ❌ MISSING
src/audit/*                ❌ MISSING (entire dir)
```

---

## 8. Dependency Graph (Actual — Based on Current State)

```
Tier 1 (Blocking):
  ┌── MCP Tool Registration (124 tools)
  │    └── MCP Integration Tests
  ├── CLI Handler Smoke Tests
  ├── QG-0/QG-2 Gate Files + Tests
  └── Verify Cache Integration Tests

Tier 2 (Stability):
  ├── Hook Tests (13 files) + Missing Hooks (4 files)
  ├── Cross-Platform Crypto Verification
  └── Migration Pipeline Integration Test

Tier 3 (Completeness):
  ├── Brain DB Schema + Init + Sync + Tests
  ├── Model Routing Tests
  ├── Provider Integration Tests
  ├── Risk/RENAR Missing Files + Tests
  ├── Utils (pricing, plan-parser)
  └── Skill/Stack Tests

Tier 4 (Ship):
  ├── npm Package Validation
  ├── Cross-Platform E2E (full workflow)
  ├── Coverage Gate (76%+)
  └── Documentation Update
```

---

## 9. Suggested Work Breakdown (Agent Sessions)

Each session is one independent chunk of work. Chunks are ordered by priority but many can run in parallel.

### Session 1: MCP Tool Registration (Critical)
- Register 117 remaining tool definitions in `src/mcp/tools.ts`
- Map Python tool names (`tausik_*`) to nutausik names (`nutausik_*`)
- Add Zod inputSchemas matching Python MCP server schemas
- Output: 124 tool definitions in `tools/list` output

### Session 2: CLI Smoke Tests
- Create `tests/integration/cli/` directory
- Test every CLI subcommand end-to-end against in-memory DB
- Verify exit codes match Python CLI conventions
- Output: 21+ CLI integration tests

### Session 3: QG-0 + QG-2 Gate Implementation
- Create `src/gates/qg0.ts` — enforce goal + acceptance_criteria before `task_start`
- Create `src/gates/ac.ts` — tier-based AC verification checklist
- Test blocking and passing paths
- Output: 10+ gate tests

### Session 4: Hook Test Suite
- Create `tests/unit/hooks/` directory
- Test all 13 existing hook files
- Implement 4 missing hooks
- Output: 30+ hook tests

### Session 5: Cross-Platform Crypto Gate
- Generate reference receipt from Python TAUSIK
- Verify TS can validate Python-generated receipt
- Generate receipt from TS, verify Python can validate it
- Add bidirectional CI script
- Output: `tests/integration/cross-crypto/` + CI gate

### Session 6: MCP Integration Tests
- Create `tests/integration/mcp/` directory
- Exercise every tool category via MCP SDK client
- Verify tool responses match expected structure
- Output: 40+ MCP integration tests

### Session 7: Migration Pipeline Test
- Create integration test for migration v1→v37
- Write DDL diff tool comparing TS schema to Python schema
- Output: Migration test + DDL diff validation

### Session 8: Brain + Model + Provider Tests
- Add Brain DB schema if needed
- Test model routing matrix
- Test DuckDuckGo provider (gated)
- Test provider registry
- Output: 20+ brain/model/provider tests

### Session 9: Risk + RENAR + Audit Completion
- Create missing risk/review/trigger files
- Create missing renar/drift/export files
- Create audit directory with baseline scripts
- Create utils/pricing.ts + utils/plan-parser.ts
- Output: 15+ tests across risk/renar/audit/utils

### Session 10: Coverage Push + npm Validation
- Run coverage report, identify gaps
- Push coverage to 76%+ across all modules
- Validate npm package build + smoke test
- Output: Coverage report ≥76%, `npm pack` validation

---

## 10. Verification Checklist (Per Milestone)

### M1: MCP Tool Registration
- [ ] `tausik tools/list` returns exactly 124 tools
- [ ] Every tool has name, description, inputSchema
- [ ] `tausik_task_start` via MCP enforces QG-0
- [ ] `tausik_task_done` via MCP enforces QG-2
- [ ] Error responses include `usage:` hint for self-correcting calls

### M2: CLI Smoke Tests
- [ ] `tausik init` creates `.tausik/` with config + DB
- [ ] `tausik status` prints correct task/session summary
- [ ] `tausik task add/start/done` works end-to-end
- [ ] `tausik session start/end` works
- [ ] `tausik verify` runs gates and returns results

### M3: QG-0/QG-2 Live
- [ ] `task_start('no-ac')` throws QG-0 error
- [ ] `task_start('with-ac')` succeeds
- [ ] `task_done('unverified')` throws QG-2 error
- [ ] `task_done('verified')` succeeds

### M4: Hooks
- [ ] `task_gate` blocks Write when no active task (exit 2)
- [ ] `TAUSIK_SKIP_HOOKS=1` bypasses all hooks (exit 0)
- [ ] `bash_firewall` blocks `rm -rf /` (exit 1)
- [ ] `git_push_gate` blocks push without ticket
- [ ] `secret_scan` detects API keys in staged files

### M5: Cross-Platform Crypto
- [ ] Python-generated receipt → TS verifies signature ✓
- [ ] TS-generated receipt → Python verifies signature ✓
- [ ] Same receipt JSON → identical canonical bytes in both runtimes
- [ ] RFC 8032 Section 7.1 test vectors pass in TS

### M6: MCP Integration
- [ ] MCP SDK client can call every tool
- [ ] Structured error responses for invalid inputs
- [ ] `tausik_status` returns project status
- [ ] `tausik_verify` returns gate results with pass/fail
- [ ] `tausik_doctor` returns 4-group health check

### M7: Migration Pipeline
- [ ] Fresh DB runs v1→v37 migrations without error
- [ ] DDL diff between TS and Python shows zero differences
- [ ] Schema version stored as 37 in `meta` table

### M8: Coverage Gate
- [ ] `vitest run --coverage` reports ≥76% line coverage
- [ ] All modules above minimum thresholds
- [ ] No skipped or pending tests

### M9: npm Ship
- [ ] `npm pack` creates valid tarball
- [ ] `npm install ./nutausik-0.1.0.tgz` succeeds on clean system
- [ ] `npx nutausik status` works
- [ ] `npx nutausik --serve` starts MCP server

---

## 11. Edge Case Stress Tests to Add

| Test | Module | Why |
|------|--------|-----|
| Concurrent task start by two sessions | Service | Race condition on `task_start` |
| FTS5 search with emoji/unicode queries | Backend | Encoding edge cases |
| Receipt with null/empty fields | Crypto | Canonical serialization robustness |
| Hook receives malformed JSON on stdin | Hooks | Error resilience |
| MCP tool call with missing required param | MCP | Error message quality |
| DB file on read-only filesystem | Backend | Graceful degradation |
| `better-sqlite3` compile failure → `sql.js` fallback | Backend | Failover test |
| Clock skew: verify cache at boundary of 10-min TTL | Verify | TTL edge accuracy |
| Task slug with max-length (64 chars) | Service | Boundary validation |
| Bash firewall: word-boundary false positive test | Hooks | Regex precision |

---

## 12. Key Architecture Decisions (ADR Index)

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | `better-sqlite3` sync in CLI, Worker thread in MCP | Implemented |
| ADR-002 | `@noble/ed25519` for crypto (audit-proof, tree-shakeable) | Implemented |
| ADR-003 | Constructor DI + module-level functions (composition over mixin inheritance) | Implemented |
| ADR-004 | `commander` for CLI (simpler than `yargs`) | Implemented |
| ADR-005 | `vitest` for testing (faster startup than Jest) | Implemented |
| ADR-006 | MCP tools registered once, dispatched to handlers (single dispatch loop) | Implemented |
| ADR-007 | Cross-platform crypto verification gate (bidirectional TS↔Python) | Proposed |
| ADR-008 | Coverage gate at 76% (matching Python benchmark) | Proposed |

---

## 13. Timeline (Effort-Ordered, Not Calendar)

```
Week 1: Sessions 1+2+3 (MCP Tools + CLI Tests + QG Gates)     ← Critical path
Week 2: Sessions 4+5     (Hook Tests + Cross-Platform Crypto)  ← Stability
Week 3: Sessions 6+7     (MCP Integration + Migration)         ← Integration
Week 4: Sessions 8+9     (Brain/Model + Risk/RENAR)            ← Completeness
Week 5: Session 10       (Coverage Push + npm Validation)      ← Ship-ready
```

Each "week" is a relative effort unit, not a calendar week. Sessions 1-3 are the highest priority because they close the MCP→CLI→Gates loop that makes TAUSIK usable end-to-end.
