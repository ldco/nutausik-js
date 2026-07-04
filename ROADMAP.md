# NUTAUSIK — Roadmap

> **Sync:** NUTAUSIK releases are paired with NoCowboy releases.
> See [NoCowboy Roadmap](https://github.com/nocowboy/nocowboy/blob/master/docs/ROADMAP.md) for NoCowboy-side details.
> **Versioning:** x.y.z — z is for bugfixes only. This roadmap tracks x.y.0 releases.

---

## v0.2.0 ✅ Released — Session Auto-Wiring

| What | Details |
|---|---|
| `context_inject` | Generates `<nutausik_context>` block for agent prompt injection |
| `handoff_save/load` | Session handoff persistence via meta table |
| `coherence_check` | Validates plan against memory, decisions, tasks |
| `loop_close` | Compares plan vs actual, generates UNIFY SUMMARY |
| CLI | `context-inject`, `handoff-save`, `handoff-load`, `coherence-check`, `loop-close` |
| Node.js 26 | better-sqlite3 12.11.1 |
| Tests | 488 (45 files, 100% pass) |

**NoCowboy companion:** v0.7.0

---

## v0.3.0 🟡 — NoCowboy Integration + Branching

| What | Details | ↔ NoCowboy |
|---|---|---|
| **NoCowboy hooks** | Full lifecycle hooks: SessionStart→task, PostToolUse→log, SessionEnd→verify+handoff | ↔ v0.8.0 P2-A7-12 |
| **Task↔Session binding** | Link session ID ↔ task slug automatically | ↔ v0.8.0 auto-wiring |
| **`task_branch`** | Create alternative task branch (Plandex-style) | ↔ v0.8.0 |
| **`task_merge`** | Merge task branch back | ↔ v0.8.0 |
| **`task_diff`** | Show diff between task branches | ↔ v0.8.0 |
| **`write-docs` skill** | Documentation skill for any agent | ↔ v0.8.0 |
| **Diff sandbox** | Isolate AI changes until reviewed | ↔ v0.9.0 P3-A1 |
| Tests | Target 550+ tests | — |

**NoCowboy companion:** v0.8.0

---

## v0.4.0 🟡 — Repo Map + Sandbox

| What | Details | ↔ NoCowboy |
|---|---|---|
| **Repo map** | Tree-sitter AST project map (Aider-style) | ↔ v0.9.0 P3-A4 |
| **Auto lint/test loop** | Auto-verify after each change via `verify` tool | ↔ v0.9.0 |
| **Docker sandbox** | Isolated execution (OpenHands-style) | ↔ v0.9.0 P3-A2 |
| **Cost tracking** | Per-task token/cost ledger | ↔ v0.9.0 P3-A8 |
| **Multi-project MCP** | Serve many projects from one daemon process | — |
| Tests | Target 650+ tests | — |

**NoCowboy companion:** v0.9.0

---

## v1.0.0 🟡 — Production

| What | Details | ↔ NoCowboy |
|---|---|---|
| **Plan versioning UI** | Visual history of plan changes | ↔ v1.0.0 |
| **Turso backend** | Production SQLite for multi-machine sync | ↔ v1.0.0 P4.4 |
| **npm publish** | `@nocowboy/nutausik` on public npm registry | ↔ v1.0.0 |
| **API stabilization** | Freeze MCP tool signatures, formal deprecation policy | — |
| **Benchmarks** | Performance benchmarks for all tools | — |
| Tests | Target 800+ tests | — |

**NoCowboy companion:** v1.0.0
