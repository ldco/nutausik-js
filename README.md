# NUTAUSIK

**Task Agent Unified Supervision, Inspection & Knowledge — TypeScript port.**

An engineering governance framework for AI coding agents. Enforces a disciplined workflow so agents don't skip planning, lose context, or close tasks without evidence. Hard gates the agent physically cannot skip — not suggestions it can ignore.

[![v0.1.0](https://img.shields.io/badge/version-v0.1.0-blue.svg)]()
[![signed receipts: ed25519](https://img.shields.io/badge/signed%20receipts-ed25519-6f42c1.svg)](packages/nutausik/src/crypto/)
[![467 tests](https://img.shields.io/badge/tests-467-brightgreen.svg)]()
[![coverage 77%](https://img.shields.io/badge/coverage-77%25-green.svg)]()
[![Node 22+](https://img.shields.io/badge/node-22%2B-339933.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.8%2B-3178C6.svg)](https://typescriptlang.org)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

---

## Without Nutausik / With Nutausik

| Your agent does this | Nutausik does this |
|---|---|
| Says "I'll just refactor this" and edits 30 files | **No active task → BLOCKED.** No code edits until a task is open. |
| Declares "done" with nothing to show for it | **QG-2 blocks the close.** Every acceptance criterion needs evidence. |
| Reports a green build you have to take on faith | **ed25519 signed receipt.** The green is cryptographically bound to the gate and the commit — it can't be forged or replayed. |
| Tries the same broken approach for the third time | **Project memory.** Failed approaches are recorded; the agent sees what didn't work. |
| Quietly skips the test/lint pipeline | **Separate `verify` step.** Heavy gates run on their own trigger and get cached — skipping is visible, not silent. |

## Quick Start

```bash
# Create a project
npx @nocowboy/nutausik init

# Add a task with goal and acceptance criteria
npx nutausik task add my-feature "Add dark mode" --goal "Implement theme toggle" --acceptance "All colors readable"

# Start working
npx nutausik task start my-feature
# → QG-0 passed. Task 'my-feature' started.

# Verify and close
npx nutausik verify --task my-feature
npx nutausik task done my-feature --ac-verified
# → QG-2 passed. Task 'my-feature' completed.
```

## Architecture

```
Engineer → AI Agent → { CLI | MCP (124 tools) }
                         ↓
                    Service Layer     ← business logic, QG-0, QG-2
                         ↓
                    Backend Layer     ← better-sqlite3 CRUD, FTS5, graph, metrics
                         ↓
                    SQLite (WAL)      ← .nutausik/nutausik.db (27 tables + 8 FTS5)
```

Three layers, strict separation: CLI never touches DB. Service validates. Backend executes.

## Key Features

| Feature | Status |
|---------|--------|
| **Task lifecycle** (add/start/done/block/claim/move) | ✅ |
| **QG-0 gate** (goal + acceptance criteria required before start) | ✅ |
| **QG-2 gate** (verify evidence required before done) | ✅ |
| **ed25519 signed receipts** | ✅ |
| **Session management** | ✅ |
| **Epic / Story hierarchy** | ✅ |
| **Project memory** (FTS5 searchable) | ✅ |
| **Verification pipeline** (filesize, stack dispatch, command gates) | ✅ |
| **MCP server** (124 tools via `@modelcontextprotocol/sdk`) | ✅ |
| **CLI** (~50 subcommands) | ✅ |
| **Hooks** (17 lifecycle hooks: task gate, bash firewall, push gate, secret scan, etc.) | ✅ |
| **Cross-platform crypto** (Python↔TS compatible) | ✅ |
| **Model routing** (tier-based model suggestion) | ✅ |
| **Web search** (DuckDuckGo provider) | ✅ |
| **Risk scoring** (L3 review triggers) | ✅ |
| **RENAR conformance** | ✅ |

## Stats

| Metric | Value |
|--------|-------|
| Test files | 42 |
| Tests passing | 467 |
| Line coverage | 77% |
| Source files | 86 TypeScript (~16K lines) |
| MCP tools | 123 registered |
| CLI commands | ~50 |
| Hook scripts | 17 |
| Stack definitions | 25 |
| Skill definitions | 12 core |
| Database version | v37 (SQLite WAL) |

## Comparison: Nutausik vs TAUSIK (Python)

| Aspect | TAUSIK (Python) | Nutausik (TypeScript) |
|--------|----------------|----------------------|
| Language | Python 3.11+ | TypeScript 5.8+ |
| Runtime | CPython | Node.js 22+ |
| DB driver | `sqlite3` stdlib | `better-sqlite3` |
| Crypto | Pure Python ed25519 | `@noble/ed25519` |
| CLI framework | `argparse` | `commander` |
| MCP SDK | `mcp>=1.0.0` (Python) | `@modelcontextprotocol/sdk` |
| Testing | `pytest` (3355 tests) | `vitest` (467 tests) |
| Composition | Mixin inheritance | Constructor DI + module-level functions |
| Package name | `tausik-core` | `@nocowboy/nutausik` |
| Schema prefix | `tausik-receipt/v1` | `tausik-receipt/v1` (compatible) |

## License

Apache 2.0
