# NUTAUSIK — Roadmap

## v0.1.0 ✅ (TypeScript Port)
Full rewrite from Python TAUSIK → TypeScript.
- 123 MCP tools, SQLite backend, ed25519 crypto, 480 tests

## v0.2.0 ✅ (Session Auto-Wiring)
- `context_inject`, `handoff_save/load`, `coherence_check`, `loop_close`
- 488 tests, Node.js 26 support

## v0.2.1 🟡 (Documentation)
- **`write-docs` skill** — loaded by any agent for complex documentation tasks
- **Code agent discipline** — documentation is part of engineering workflow, not a separate agent

## v0.3.0 🟡 (Planned)
- **NoCowboy Integration** — Todo Injection in `session/prompt.ts`, Session Auto-Wiring hooks
- **Branch per task** — `task_branch`, `task_merge`, `task_diff` tools
- **Diff sandbox** — isolate AI changes until reviewed

## v0.4.0 🟡 (Planned)
- **Repo map** — tree-sitter AST project map (Aider-style)
- **Auto lint/test loop** — auto-verify after each change
- **Docker sandbox** — isolated execution (OpenHands-style)

## v1.0.0 🟡 (Milestone)
- **Plan versioning UI**
- **Multi-project MCP daemon** — serve many projects from one process
- **npm publish** — `@nocowboy/nutausik` on public registry
