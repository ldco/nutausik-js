# NUTAUSIK — Roadmap

Last updated: 2026-07-04 (v0.2.0 released)

## ✅ Done (TypeScript Port, v0.1.0)
- Full TypeScript port from Python TAUSIK
- 123 MCP tools (tasks, sessions, memory, gates, verify, specs, brain, skills, stacks, web, crypto, receipts)
- SQLite backend with FTS5, 27 tables, ed25519 crypto
- 480 tests, 77% coverage
- CLI with 20+ subcommands
- QG-0 / QG-2 hard gates

## ✅ Done (Session Auto-Wiring, v0.2.0)
- `context_inject` — generates NUTAUSIK context block for agent prompt injection
- `handoff_save` / `handoff_load` — session handoff persistence
- `coherence_check` — validates plan against memory/decisions
- `loop_close` — compares plan vs actual, generates UNIFY SUMMARY
- CLI commands for all new tools
- 488 tests, 45 files, 100% pass
- better-sqlite3 12.11.1 (Node.js 26 support)

## 🟡 Next (when NoCowboy is ready)

Item | Priority | What's needed
---|---|---
**Todo Injection** (NoCowboy) | 🔴 Critical | Modify `session/prompt.ts` to call `context_inject` MCP tool
**Session Auto-Wiring** (NoCowboy) | 🔴 Critical | NoCowboy SessionStart → create task, PostToolUse → log, SessionEnd → handoff
**Coherence Check** (NoCowboy) | 🟡 Medium | SessionStart → run coherence_check, warn on conflicts
**Handoff Auto-Load** (NoCowboy) | 🟡 Medium | `/resume` → load handoff data, inject into system prompt

## ❌ Future Releases

Item | Priority | Notes
---|---|---
**Branch per task** | 🟡 Medium | `task_branch` / `task_merge` / `task_diff` tools
**Diff sandbox** | 🟡 Medium | Isolate AI changes until reviewed (Plandex-style)
**Repo map** | 🟡 Medium | Tree-sitter AST project map (Aider-style)
**Auto lint/test loop** | 🟢 Low | Auto-verify after each change via `verify` tool
**Docker sandbox** | 🟢 Low | Isolated execution (OpenHands-style)
**Plan versioning UI** | 🟢 Low | Visual history of plan changes (Plandex-style)

| Task | What |
|---|---|
| `v2-mcp-request-time-db-routing` | DB resolution spawn-time → request-time (connection pool per project root) |
| `v2-engine-standalone-package` | Engine as a pip-installable package; `.claude/` becomes an optional IDE adapter |
| `v2-stale-mcp-reaping` | Reap stale MCP servers (or single daemon) — kills the drift/hang class (#77/#79/#80) |

---

## 🛠 Post-1.5 — the 1.x track (before 2.0)

Deferred from v1.5 to keep the release a focused hardening cut (scope decision
#95). Nothing dropped — sequenced here.

**Snippets** (reusable-artifact detection & search)
- `v15-snippet-classifier` — heuristic `detect_artifact_kind()` + advisory wire
- `v15-snippet-table` — dedicated `snippets` table + migration
- `v15-snippet-ast-detect` — AST-based clone detection (`tausik snippet detect`)
- `v15-snippet-mcp-search` — `tausik_snippet_search` semantic search
- `v15-snippet-brain-integration` — `extract --scope brain` writes a snippet to Notion

**Orchestration**
- `v15-orchestrator-worker-pattern` — task-delegation primitive (orchestrator/worker)

**Model routing** (remaining, after the v1.5 fable-tier fix)
- `v15mr-phase-matrix` — phase × complexity matrix for model selection
- `v15mr-phase-surfaces` — phase hints in plan/explore/task starts
- `v15mr-subagent-model-hints` — model hints for subagents (research = haiku)
- `v15mr-routing-telemetry` — routing-adherence telemetry in metrics

**RENAR conformance** (`v16r-*` — reasoning trace + spec/conformance layer)
- `v16r-reasoning-steps-table` / `v16r-reason-skill` — reasoning_steps + `/reason`
- `v16r-model-pinning` — model-version pinning per task
- `v16r-task-replay` — reconstruct a task timeline
- `v16r-audit-hashchain` — hash-chain immutability for the event log
- `v16r-spec-types` — SPEC artifacts: 9 closed types (ARCH/API/DATA/INT/PROC/UI/AI/SEC/OPS)
- `v16r-adapt-lite` — forward interpretation + backward findings + dual signature
- `v16r-drift-detectors` — drift-1 (schema) + drift-7 (test↔requirement provenance)
- `v16r-conformance-yaml` — `RENAR-CONFORMANCE.yaml` self-assessment generator

**Shared Brain hardening** (`brainh-*`)
- `brainh-audit` — brain pain-point audit → improvement spec
- `brainh-reliability` — offline queue + local-first sync + health
- `brainh-semantic-search` — local embeddings
- `brainh-capture-ux` — auto-capture nudge on task done / session end
- `brainh-outline-spike` — spike: Outline as an alternative brain backend

---

## 📣 Release & adoption

- [ ] One-line install script (`curl ... | bash`) to cut onboarding friction
- [ ] Add a GIF/asciinema demo to the README (the agent hitting a BLOCKED gate, then the happy path)
- [ ] Verify GitHub repo + CI badges
- [ ] Publish to PyPI (ties into `gmcp-packaging`)
- [ ] Example project demonstrating the TAUSIK workflow
- [ ] Gather community feedback on the skill system

---

## 🔭 Loose threads

- [ ] `notify_on_done` hook (Discord/Slack/Telegram on `task_done`). Implementation existed but was removed in 1.3.6 as an orphan — restore from git history and register a PostToolUse in `bootstrap_generate.py` + optional `.tausik/config.json` (channel + webhook).
- [ ] Evaluate **Outline** as an alternative self-hosted backend for the Shared Brain (API + FTS out of the box) — revisit vs Notion after MVP (tracked as `brainh-outline-spike`).
