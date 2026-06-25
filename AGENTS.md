# AGENTS.md — AI Agent Onboarding

**You are an AI agent working on a project that uses NUTAUSIK.**
This document tells you what NUTAUSIK is, why it exists, and how to work with it.

## What is NUTAUSIK?

NUTAUSIK (**N**ode **U**nified **T**ask **A**gent **U**nified **S**upervision, **I**nspection & **K**nowledge) is an engineering governance framework for AI agents, ported from Python to TypeScript. It enforces a disciplined workflow so you don't skip planning, lose context between sessions, or close tasks without evidence.

NUTAUSIK implements [SENAR v1.3 Core](https://senar.tech) — an open methodology for AI-native development. SENAR defines:
- **Quality gates** — hard blocks that prevent skipping steps (no code without a task, no completion without evidence)
- **Workflow rules** — task lifecycle, session management, checkpoints, dead end tracking
- **Metrics** — throughput, first-pass success rate, defect escape rate, lead time (all automatic)

**Why this matters to you:** Without NUTAUSIK, you might hallucinate completion, repeat failed approaches, or lose context. With NUTAUSIK, every piece of work has a goal, acceptance criteria, and verification evidence — making your output predictable and auditable.

## Your First 60 Seconds

1. **MCP-first** — use `nutausik_*` tools (preferred). 123 tools registered. Tool naming: `nutausik_task_add`, `nutausik_status`, etc.
2. **CLI fallback** — `npx nutausik <cmd>` mirrors MCP. Try `npx nutausik status`.
3. **Skills / slash wrappers** — execute the numbered procedure inside `packages/nutausik/skills/<name>/SKILL.md`.

Hard workflow rules (`task_start` before edits, **`nutausik_verify` before task closure**, `--ac-verified`) are unchanged — see § *The Rules* below.

## Tool Surface (MCP)

| Tool prefix | Count | Purpose |
|-------------|-------|---------|
| `nutausik_` (project) | 116 | Task lifecycle, session, epic/story, memory, gates, verify, config, roles, skills, stacks, search, events, crypto, receipts |
| `nutausik_brain_*` | 7 | Brain search, classify, publish, sync, config |
| **Total** | **123** | |

## The Rules You Must Follow

1. **No code without a task.** Always create a task (`nutausik_task_add` / `nutausik_task_quick`) before writing code.
2. **QG-0: Define before you start.** Every task needs a goal and acceptance criteria before `task start`. No exceptions.
3. **QG-2: Prove before you close.** Log AC verification evidence via `task log`, then `task done --ac-verified`. No shortcuts.
4. **Log your progress.** Use `nutausik_task_log` after each significant step.
5. **Document dead ends.** Failed approach? `nutausik_dead_end` — so the next session doesn't repeat it.
6. **Session limit: 180 minutes.** Use session handoff to save progress.
7. **Ask before committing.** Never `git commit` or `git push` without user confirmation.
8. **MCP-first.** Prefer MCP tools over CLI bash commands.

## Testing Discipline (Agents) — HARD RULES

When you touch NUTAUSIK core (`packages/nutausik/src/`), or write tests in any project that uses NUTAUSIK:

1. **Add or extend tests that align with files you changed** so scoped `vitest run` on `task done` / `verify --task` stays meaningful.
2. Call **`nutausik_verify`** before closure.
3. **Do not duplicate tests.** If a new test has the same structure as an existing one and only differs in inputs — **use `describe.each` or `it.each`**. Never add 5 tests where one parametrized test covers the same matrix.
4. **Do not write tests on trivial getters / `assert callable(f)` / `x is not None` without behavior check** — these tests catch zero bugs and inflate suite time. If the only signal is "the import works", remove the test.
5. **Do not write mock-only tests** where 100% of meaningful calls are mocks and no real code path runs. The test must exercise the SUT.
6. **Do not write tests on implementation detail** (exact log strings, private method names, exact SQL syntax). Test behavior, not implementation.
7. **Security-sensitive paths** (hooks, auth, crypto) are **not** exempt — gates and verify-cache rules treat them **stricter**, not looser.

## Work Cycle

1. Session open (`start` skill) → plan (`plan` skill, `nutausik_task_add`) → **`nutausik_task_start` (QG-0)** → implement + `nutausik_task_log` / `nutausik_dead_end` → **`nutausik_verify`** → **`nutausik_task_done` (QG-2)** → optional ship → end.

## Repository Structure

```
packages/nutausik/
  src/
    backend/       SQLite CRUD, FTS5, graph, metrics, migrations (v1→v37)
    service/       Task, session, hierarchy, knowledge, verification
    gates/         QG-0, AC, filesize, stack-dispatch, command-runner
    verify/        Cache, constants, files-hash, git-diff, receipt
    crypto/        ed25519 keygen/sign/verify, receipts
    cli/           ~50 commander subcommands
    mcp/           123 tool definitions + handlers
    hooks/         17 lifecycle hooks (task-gate, bash-firewall, etc.)
    brain/         File-based document search
    model/         Tier/complexity-based model routing
    providers/     DuckDuckGo web search, provider registry
    risk/          Risk scoring, L3 review triggers
    renar/         RENAR conformance checks
    audit/         Project audit scripts
    skills/        12 core skill definitions
    stacks/        25 stack definition JSONs
    utils/         Helpers, security, pricing, plan parser
  tests/           42 test files, 467 tests
    unit/          Unit tests per module
    integration/   CLI, MCP, cross-crypto, backend integration
```

## Key Entry Points

| What you want | Where to look |
|---------------|---------------|
| Run a CLI command | `packages/nutausik/src/cli/index.ts` |
| Business logic | `packages/nutausik/src/service/` |
| Database schema | `packages/nutausik/src/backend/schema.ts` |
| Gate runner | `packages/nutausik/src/gates/runner.ts` |
| MCP handlers | `packages/nutausik/src/mcp/handlers.ts` |
| Add a skill | `packages/nutausik/skills/<name>/SKILL.md` |
| Run tests | `npm test` (from `packages/nutausik/`) |
| Run typecheck | `npm run typecheck` |

## How Things Connect

```
User message → Skill (SKILL.md) → MCP tool or CLI
                                 → service/ (business logic)
                                 → backend/ (SQLite + FTS5)
                                 → gates/ (quality checks)
```

Three layers, strict separation: **CLI never touches DB. Service validates. Backend executes.**
