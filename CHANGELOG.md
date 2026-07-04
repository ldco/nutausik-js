# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

> Russian mirror: [`CHANGELOG.ru.md`](CHANGELOG.ru.md). Both files cover
> the same releases — keep them in sync when adding a new entry.

## [Unreleased]

### Fixed
- **better-sqlite3 updated to 12.11.1** — supports Node.js 26 (NODE_MODULE_VERSION 147)
- **MCP port config fix** — NUTAUSIK server no longer collides with ncp-validator

## [0.1.0] — 2026-07-04 (TypeScript Port)

### Breaking
- **Complete TypeScript rewrite** — NUTAUSIK was ported from Python (TAUSIK) to TypeScript
- **MCP server** — 123 tools via JSON-RPC, STDIO and HTTP transports
- **CLI** — `nutausik` command with 20+ subcommands (task, session, memory, verify, etc.)
- **SQLite backend** — better-sqlite3 with FTS5 full-text search, 27 tables
- **Cryptographic receipts** — ed25519 signed execution evidence (RFC 8032)
- **Hard gates** — QG-0 (define before start), QG-2 (prove before close)
- **480 tests** — unit + integration, 77% coverage

See `docs/en/quickstart.md` and `README.ru.md` for setup instructions.

---

## [1.5.6] — 2026-06-19

Fine-tune release from a live Kilo Code + z.ai (GLM) field test. The structural
root was three drifted IDE lists; they are now two named constants.

### Fixed

- **Kilo-only installs got "no scripts dir found" from the CLI.** The wrapper's
  IDE-discovery loop hardcoded `claude cursor qwen windsurf codex` — no `kilo` —
  so `bootstrap --ide kilo` produced a `.tausik/tausik` that couldn't find
  `.kilo/scripts`. The loop is now **injected from `bootstrap_config.IDE_DIRS`**
  (the single source of truth) into the wrapper template at install time via an
  `__IDE_LIST__` placeholder; add an IDE to `IDE_DIRS` and every consumer picks
  it up. `--ide all` and the `--ide` argparse choices now derive from a sibling
  `SCAFFOLD_IDES` constant. (P0/P4)
- **Windows UnicodeEncodeError on Cyrillic / ✓ output.** Layered UTF-8 hardening:
  the CLI wrapper exports `PYTHONUTF8=1`; every hook runs via `python -X utf8`
  (one injection point in the hook-command builder, covering all hooks); and the
  standalone entry points — `bootstrap.py` and all MCP servers — call
  `fix_stdio_encoding()` at startup. Note: `PYTHONUTF8`/`-X utf8` fix the locale
  default but do not override an explicit `PYTHONIOENCODING`; the runtime
  reconfigure does. (P1)
- **Skill/rules paths resolved to `.claude` under Kilo/Qwen.** The runtime IDE
  layer (`ide_utils`) only knew claude/cursor/windsurf/codex, so under a
  Kilo-only install `detect_ide()` fell back to claude and skill install /
  SessionStart profile rebuild targeted `.claude` instead of `.kilo`. `qwen`
  (`.qwen`/`QWEN.md`) and `kilo` (`.kilo`/`AGENTS.md`) are now registered and
  detected via their project dirs + `TAUSIK_IDE`. (Env-var auto-detection for
  kilo/qwen is intentionally deferred until verified on a live build.) (P5)

### Added

- **`task quick --ac/--acceptance`.** Quick-create a task with its acceptance
  criteria in one command, so it is QG-0-ready (goal + AC) without a follow-up
  `task update`. Blank/whitespace AC is ignored — QG-0 is unchanged. Exposed on
  the `tausik_task_quick` MCP tool as well. (P2)
- **`tausik doctor` validates the Kilo MCP config.** When a `.kilo/`/`.kilocode/`
  install is present, doctor checks that `kilo.jsonc` / `mcp.json` parse (JSONC
  tolerated), carry a `tausik-project` `mcp` stanza with a `command` array, and
  that the referenced `server.py` resolves (`${workspaceFolder}` expanded). Each
  finding tells you to re-bootstrap and restart Kilo. Silent for non-Kilo
  projects. (P3)

### Internal

- Guard tests lock the IDE single-source invariant (`SCAFFOLD_IDES ⊆ IDE_DIRS`,
  argparse choices and `--ide all` derive from the constants, no hardcoded IDE
  list literal in `bootstrap/`) and the Unicode-stdio fixes (wrapper, hooks, MCP
  servers, bootstrap).

## [1.5.5] — 2026-06-19

### Added — Kilo Code + z.ai (GLM) first-class support

- **`--ide kilo` bootstrap target.** `bootstrap.py --ide kilo` re-exposes the
  TAUSIK MCP server inside Kilo Code (VSCode addon + CLI). The MCP stanza is
  written to **both** known Kilo config paths — `.kilo/kilo.jsonc` and
  `.kilocode/mcp.json` — so it works across Kilo versions (Decision #120). Format
  is Kilo-native (`mcp` key, `command` as an array, `type: local`, `enabled`);
  existing servers are merged, not overwritten; re-runs are idempotent. Override
  the target paths via `.tausik/config.json` `kilo.config_paths`.
- **Model profiles as data — z.ai GLM routing with no code change** (Decision #119).
  New `scripts/model_profiles.py` maps vendor families (`claude`, `glm`) ×
  capability ranks → concrete model ids, overridable/extendable in
  `.tausik/config.json` `model_profiles.families`. `suggest_model(family=…)` and
  the task-start banner now recommend **within the active model's family**: a
  z.ai GLM session (Anthropic-compatible endpoint → transcript reads `glm-*`)
  routes to GLM models and gets correct under/over-powered verdicts. Optional
  `model_profiles.default_family` pins the family when detection is unavailable.
- **Provider registry** (`scripts/providers/`) abstracting runtime/IDE detection
  (claude/cursor/kilo/qwen). Kilo reads the active model from `KILO_MODEL` /
  `.kilo` config; Claude delegates to the existing transcript parser.
- **Docs:** [Kilo + z.ai](docs/en/kilo-zai.md) (+ RU mirror) — setup, model
  switching, secret hygiene; architecture two-axis (runtime × model) table.

### Changed — rename-proof generated configs

- Generated MCP configs and Claude hooks no longer embed absolute project paths,
  so **renaming the project folder no longer breaks the framework**. In-project
  paths use the host's workspace variable — `${CLAUDE_PROJECT_DIR:-.}` (Claude
  `.mcp.json`), `${CLAUDE_PROJECT_DIR}` (Claude hooks), `${workspaceFolder}`
  (Cursor, Kilo); paths outside the project (system venv, external lib) stay
  absolute. Shared helper `bootstrap/bootstrap_paths.py`. Qwen Code is unchanged
  (no workspace variable in its config format) — tracked as a follow-up.

### Fixed

- Provider scaffold rewritten: removed a syntactically broken `claude.py`,
  inconsistent registration, and a `model_routing` import that silently nulled
  active-model detection.

## [1.5.3] — 2026-06-15

### Fixed (Windows)

- **CLI wrapper failed on every command (critical regression).** A literal `(` / `)` in the "no scripts dir found" error text sat *inside* the `if not defined SCRIPTS (...)` block in `tausik_wrapper.cmd`, closing the block early — so `exit /b 1` ran unconditionally and `.tausik/tausik.cmd <anything>` exited 1 right after bootstrap. Rewritten to `goto :noscripts` (no inline block to break) with an explicit `exit /b %ERRORLEVEL%` so the wrapper propagates Python's exit code. Now covered by a Windows `.cmd` smoke test (passthrough + negative).
- **RAG index silently empty on projects with reserved-name paths.** A path component that is a Windows reserved device name (`con`/`prn`/`aux`/`nul`/`com1-9`/`lpt1-9`, with or without an extension) makes `os.path.relpath` raise `ValueError`, which aborted the entire `os.walk` in `codebase-rag`'s `get_file_list` → an empty code index with no error. Added `_is_reserved_name` pruning (dirs and files) plus defensive `try/except ValueError` around both `relpath` calls; mirrored into the Cursor harness copy.

## [1.5.2] — 2026-06-15

### Security / housekeeping (public-release readiness)

- **Removed confidential material from the tree.** `docs/audit/` (internal GTM/COI strategy, private-repo paths, a 1.7MB audit PDF) and `site/_archive/` (a leaked internal GitLab URL) are deleted and gitignored — they should never have shipped in the public mirror. (Earlier 1.5.x tarballs still contain them; this is the first clean release.)
- **Onboarding fixes.** The Windows quickstart command pointed at a nonexistent path → `.tausik/tausik.cmd status`. The CLI wrapper now resolves `.qwen/.windsurf/.codex/scripts` (Qwen/others were broken).
- **Doc accuracy.** Corrected showcase counters (tests 4341, MCP 124, 20 official / 13 core skills, matrix v1.5.1) and added the RU coverage badge.
- **Community health files.** Added SECURITY.md, CODE_OF_CONDUCT.md, issue/PR templates.

All driven by a multi-agent public-release-readiness audit.

## [1.5.1] — 2026-06-15

### Fixed

- **CLI broken on a clean install (critical).** Every `tausik` command crashed with `ModuleNotFoundError: No module named 'yaml'` on a fresh clone: `project.py` imports the RENAR CLI unconditionally and the renar modules did a module-level `import yaml`, but PyYAML is an OPTIONAL dependency (the core CLI is stdlib-only). yaml is now lazy-imported inside the renar functions that emit it — the core CLI (`init`/`status`/`task`/…) loads stdlib-only, and `renar conformance/export` degrade with a clear `pip install pyyaml` hint when it's absent. Guarded by an AST test + a release-checklist fresh-clone smoke. Found by the post-1.5.0 fresh-clone smoke.

## [1.5.0] — 2026-06-15

The pre-2.0 hardening release. Cryptographic verification receipts, fail-closed gates, scope ACL, closure-risk scoring + external review, the AIDD layer, orchestrator-worker delegation, advisory-first RENAR, and "no silent errors" enforcement.

### AIDD layer — cross-IDE parity

- **`tausik aidd autogen [--write] [--force]`.** Drafts a `vision.md` pre-seeded from repo signals (package name/description, README title/intro, top-level dirs, detected languages, test framework). Stdlib-only, no LLM; missing signal → placeholder, never crashes; reuses the scaffold conflict prompt. Bootstrap now bundles `harness/aidd-templates` into the generated tree (also fixes `init --template aidd` via the CLI wrapper).
- **`tausik aidd validate`.** Checks `conventions.md` machine-checkable claims (language/version pin, lint/format tool, testing framework, max file-size) against the repo: ok / drift / unverifiable; exit 1 on hard drift, 2 if missing. Numeric version + word-boundary tool matching (no substring false-positives).

### Memory strictness & agent-UX

- **Context memory surfaced at session start.** `context`-type memories (durable env facts: hosts, machines, access, paths) now appear in the CLAUDE.md memory tail every session, plus a hard **memory-first** rule: `memory_search` before asking the user for / guessing an established project fact.
- **`update-claudemd` syncs AGENTS.md** dynamic section alongside CLAUDE.md.
- **Threshold-gated FTS optimize** on session end (events-churn proxy, best-effort).
- **Coverage badge** (76% baseline) + CI `coverage.json` artifact upload.
- Fix: dropped a phantom `diff` extension skill (no more `skills not found: diff` on bootstrap).

### No silent errors — enforced

- **ruff BLE001 enabled** across the tree: every blind `except Exception` is now justified with `# noqa: BLE001 — <why>` or narrowed; new unjustified blind catches fail CI. Makes the "нулевая толерантность к тихим ошибкам" principle real.

### Orchestrator-worker — model auto-switch via sub-agents

- **`tausik task delegate <slug>`** marks a complexity≤medium task delegated to a worker sub-agent (records the recommended model + parent session in the `meta` kv — no schema migration); complex tasks are refused (they stay with the coordinator). `task undelegate` clears it.
- **`tausik task handoff <slug>`** prints the deterministic worker contract (goal/AC/scope/scope_exclude/model + trimmed `WORKER_SKILLS`) the coordinator passes to the Agent tool.
- **In-session recognition:** `task start` on a delegated task surfaces worker mode and suppresses the orchestrator-only model banner. **Scope hard-gate:** a delegated worker is blocked from editing outside its `scope_paths` (and blocked until it declares one).
- **`tausik task summary-back <slug> "<summary>"`** returns a structured worker result (stored in `meta`, surfaced in `task show`) so the coordinator picks it up without the worker transcript. CLI-first; full workflow documented in `architecture.md`.

### RENAR adoption — advisory-first ("lite")

- **`tausik renar export [--out] [--check]`.** Deterministic, one-way derived view of the SQLite project into a `renar/` tree (README + conformance + specs + adapts). `--check` is a CI drift gate; the export is date-free and pinned to `eol=lf` (`.gitattributes renar/**`) for stable diffs, with a containment-guarded `--out` target.
- **RENAR SPEC + ADAPT substrate.** 17 MCP tools (`tausik_spec_*` ×8, `tausik_adapt_*` ×9): formal requirements (SPEC, 9 closed types) and TZ-interpretation (ADAPT §7) with forward-interpretations, closed-list backward findings, and dual ed25519/name signatures. Documented in `docs/ru/mcp.md`.
- **First self-applied SPEC-ARCH + ADAPT.** TAUSIK reached **RENAR-1** on honest data (blocked at RENAR-2 — ADAPT left draft, no faked client signature); `tausik renar conformance` self-assesses the level.
- **QG-0 advisory (lite, rung 2).** A non-blocking nudge when a high-stakes task (tier `substantial`/`deep`, or `complex`) starts without a linked SPEC/ADAPT — toggle `renar.qg0_advisory`. RENAR is adopted advisory-first by design (lightweight framework); hard-gate (rung 3) and signed/immutable RENAR-2 (rung 4) are 2.0 work. See the adoption ladder in `architecture.md`.

### Evidence attestation — cryptographic receipts

- **Signed verification receipts.** `tausik verify` emits an ed25519-signed receipt (`tausik-signed/v1`) bound to the gate signature and HEAD sha; `task done` (QG-2) validates the signed receipt before closing, so a green cannot be forged or replayed.
- **Portable receipts + offline verify.** Export a receipt and verify it with no SDK: a stateless HTTP verify endpoint plus a CI-tested no-SDK example guide.
- **Supply-chain signing.** Skill and stack releases are signed; skill installs verify the signature before writing.

### SENAR hardening

- **Rule 2 scope ACL.** Tasks declare `scope` / `scope_exclude`; a write-enforcement hook blocks edits outside the declared surface; the QG-0 scope warning is now a hard gate.
- **Closure-risk scoring.** A composite risk model computes + persists a closure-risk score on `task done`, surfaced in `metrics` / `status`; measured-high closures require an L3 adversarial review before they can close.
- **Rule 4 external validation.** A `tausik-external-reviewer` subagent (different model, read-only — separation of duties) gates high-risk closures; a domain-challenge question was added to the QG-2 checklist.
- **Rule 5 checklist hard gate** for substantial/deep planning tiers (escalating nudge for smaller tiers).
- **Rule 7 root cause.** Fail-closed keyword gate (defect tasks cannot close without a documented cause) plus a **structured** layer — closed-list categories + parser + coverage metric in `metrics` + an advisory escalating nudge toward `Root cause (category): … Prevention: …`.
- **Fail-closed gate policy** across the QG-2 surface (a gate that cannot evaluate blocks rather than passes).

### Reliability, routing & drift

- **Shell-less gate runner.** `shell=True` dropped — gate commands are tokenized (shlex) and only `&&` / `|` are honoured; every other shell metacharacter fails safe (command-injection fix for custom-stack templates).
- **Escalating nudges framework** (silent → hint → warning → strong) — soft invariants get louder per breach and reset on compliance, replacing the tuned-out fixed reminder.
- **Model routing.** Tier-aware verdict (haiku < sonnet < opus < fable) kills the false `MODEL MISMATCH` banner for capable models on medium/complex tasks.
- **Doc-drift gate.** `gen_doc_constants --check` now scans cross-file version refs, MCP tool counts, test counts, and repo-state counts, plus an MCP-description cache-bust hash.
- **Memory lint.** `tausik memory lint` flags contradictions, superseded entries, and stale file references.

### Fixed

- **MCP `task_done` / `verify` hang (Windows).** Restored `stdin=subprocess.DEVNULL` on git subprocesses (`risk_compute`, `verify_receipt_emit`, `cli_push_ok`) — a reintroduction of `v14b-defect-mcp-task-done-stdin-hang` where git, inheriting the MCP JSON-RPC stdin pipe, blocks on a paginator/credential probe. Added an AST class-guard test that fails on any `scripts/` top-level `subprocess` call missing a `stdin` argument, so the class cannot silently return again.

## [1.4.2] — 2026-05-15

### Site

- **Landing rework — honest slogan + concrete Without/With + enforcement-in-hero.** The v1.4.0 slogan ("Git for AI workflow") was clever but misleading — Git is version control for source files; TAUSIK is a discipline layer over coding agents. Replaced with a direct, pain-point slogan: **"AI agents that can't fake 'done'."** (EN) / **"AI-агенты, которые не врут «готово»"** (RU). Eyebrow shifted from the generic "AI development framework" / "Фреймворк AI-разработки" to **"Discipline layer for AI coding agents"** / **"Discipline-слой для AI-кодинг-агентов"** — first-time visitors now read what TAUSIK *is* in the first six words. Hero lede tightened to name the two failure modes the framework intercepts: "starting a task without a goal, and claiming completion without proof." Hero terminal demo now opens on a **BLOCKED — no active task** line (red, weight 600) showing enforcement before showing the happy path; the previous version led with the happy path and never demonstrated a block.

- **Without/With rows rewritten with concrete agent phrases.** Each of the six rows was abstract ("Agent starts coding immediately"). Now each is a concrete agent-quote + the matching hook output — e.g. `'Agent says "I'll quickly refactor this" and edits 30 files.'` → `'task_gate.py hook returns: BLOCKED — no active task (SENAR Rule 9.1).'`. Six rows, six concrete failure modes, six named code paths (task_gate.py, task_done_verify, SessionStart hook, tausik dead-end, tausik verify, tausik metrics + events log). EN + RU.

- **Three-message cycle: section name → "Task lifecycle".** Eyebrow + title (EN: "Task lifecycle / Three messages. Full lifecycle." | RU: "Жизненный цикл задачи / Три сообщения. Полный цикл.") so the section reads as "what TAUSIK organises" rather than "the pitch line". Cycle.sub rewritten to: "You describe what you want. The framework forces the steps you skip when you trust the agent too much." — names the actual problem the framework solves (skipping under trust) rather than the abstract "you describe what you want; framework enforces how it gets done".

- **Stats reframed — main framework promise made visible.** Old stats tiles: `732 tasks completed / 73 sessions / 3,378 tests / 0 core dependencies`. The 73-sessions and bare 732-tasks numbers are dogfood trivia, not framework-trust signals. New tiles surface the gate-truth headline: `732 tasks closed — every one with a goal + AC / 0 closed without verify evidence (accent) / 3,400 tests passing / 0 core dependencies / phone-home calls`. Same numbers, different framing: visitor now reads how the framework was actually used. EN + RU.

### Internal

- pyproject.toml: 1.4.1 → 1.4.2. docs/_generated/constants.json regenerated. README badges unchanged (test_count stable at 3400).

## [1.4.1] — 2026-05-15

### Fixed

- **`tausik_search` FTS5 syntax error on `.` in query (`bug-tausik-search-fts5-syntax-error-on-dot`).** `tausik_search "tausik.tech site"` (and any query with `.`, `-`, `/`, `@`, `#` inside a token) raised `sqlite3.OperationalError: fts5: syntax error near "."` because the previous `_sanitize_fts5` stripped only `"`, `(`, `)`, `*`, `:`, `^` and the boolean keywords `AND` / `OR` / `NOT` / `NEAR`. FTS5 then read the leftover dot as a column separator (`col.match` syntax) and aborted. Fix wraps any token that contains one of those special characters in phrase quotes — `tausik.tech` becomes `"tausik.tech"`, which the default `unicode61` tokenizer renders as the phrase `"tausik" "tech"`. Bare alphanumeric tokens still go through unquoted (so implicit AND between words is preserved), and the existing `"quoted phrase"` extraction still works first. Internal: `scripts/backend_queries.py` `_sanitize_fts5`. Tests: `tests/test_fts5_sanitizer.py` (22 cases — plain query, empty, dot in token, hyphen, slash, trailing dot, quoted passthrough, boolean operator stripping, paren/star/colon/caret, mixed phrases + tokens, `@` / `#`, plus a parametrized end-to-end matrix that runs each shape against a real FTS5 virtual table and asserts no `OperationalError`). Surfaced on the live `tausik_search("tausik.tech")` query that motivated the bug ticket — it now returns rows. Affected callers: `tausik_search` (MCP + CLI), `memory_search`, `decisions search`, `task list` FTS lookups — all consume the same sanitizer.

### Site

- **Dockerfile build context fix.** v1.4.0's `site-numbers-truth` commit wired `HomeLanding.vue` to import `docs/_generated/constants.json` for the live counts on the landing, but the Dockerfile copied only `docs/en` and `docs/ru` into the build context. Vite/rollup failed at `pnpm build` with `Could not resolve "../../../../docs/_generated/constants.json"`, killing three consecutive deploys (pipelines 2273, 2275, 2276) and stranding `tausik.tech` on the previous release commit. Fix adds `COPY docs/_generated docs/_generated` between the existing `COPY docs/ru` and `COPY site/` lines; `.dockerignore` does not exclude `_generated`. CI on the fix commit (`a7aa6d4`) reached `deploy success` in 24s. No code path changed; the bug was purely in build wiring.

- **Honest landing-numbers + audit-driven doc refresh.** v1.4.0 polish that landed in the same release window: HomeLanding numbers (review_agents_count, hooks_count, skills_core_count, mcp_main_tools, test_count, stacks_count) read from `docs/_generated/constants.json` via a new `scripts/code_counts.py` helper; "0 dependencies" → "0 core dependencies"; "5-agent review" → "6-agent review"; "19 real-time hooks" → "20 real-time hooks"; "25 stack-aware checks" → "25 stack-aware verify suites"; release-snapshot label on the 732/73 stats tiles. 4-agent documentation audit found and closed 58 defects (32 WRONG, 22 DRIFT) across `architecture.md` (Schema v18→v27, 16→25 gates, 117→138 source files, 2590→3378 tests), `hooks.md` (full lifecycle rewrite — 20+1 hooks, 3 missing PostToolUse rows, brain_search_proactive moved out of UserPromptSubmit), `cli.md` (+9 missing commands), `mcp.md` (98→103, +3 missing tools), `troubleshooting.md` (CouchDB/Meilisearch/Raven legacy purged, replaced with Notion-flow), `plan-stacks.md` (18 phantom rows removed, 13 real stacks added — `/plan` skill now reads truth), `skill-spec.md` + `skill-profiles.md` (11 core skills, two-axis claim qualified), `shared-brain.md` ("Still TODO" of 14 already-shipped modules removed), `environment.md` (full TAUSIK env-vars reference for the first time, 50+ vars), `troubleshooting.md` Brain section rewritten under the Notion architecture. EN+RU sidebars surface 12 previously-orphan pages. Landing also gained a **TAUSIK is NOT** section (5 bullets — not SaaS / not a model / not a Cursor replacement / not junior onboarding / not auto-merging), a **comparison table** vs Aider / Cursor Rules / Continue / Claude Skills, and a **FAQ** (5 questions). Hero lede rewritten to a concrete product-shape sentence; quickstart eyebrow now reads "Quick start — 10 minutes (after your AI IDE is set up)" with a Windows-wrapper note in the side-bullets. Live: https://tausik.tech / https://tausik.tech/ru/.

### Planned (v1.5)

- **Cursor MCP integration rework.** Composer / workspace MCP filesystem mirror (`mcps/` lease snapshot) in Cursor 3.2.x **does not currently publish project stdio servers** (`tausik-project`, `codebase-rag`, `tausik-brain`) into the same snapshot path as the built-in browser MCP — they appear in `lease_server_status` but **`cursor_mcp_lease_snapshot_store` lists only `cursor-ide-browser`** (see investigation: [`docs/en/research/tausik-1.5-mcp-cursor-rework-2026-05-08.md`](docs/en/research/tausik-1.5-mcp-cursor-rework-2026-05-08.md), RU: [`docs/ru/research/tausik-1.5-mcp-cursor-rework-2026-05-08.md`](docs/ru/research/tausik-1.5-mcp-cursor-rework-2026-05-08.md)). v1.5 backlog: host contract matrix, optional HTTP/SSE bridge or extension registration, diagnostic script, upstream report — **without** dropping the supported **`.tausik/tausik` CLI** fallback.

## [1.4.0] — 2026-05-07

### Added

- **Push-ticket flow replaces broken env bypass (`replace-broken-git-push-gate-env-bypass-with-ticke`).** New CLI `tausik push-ok [--ttl SECONDS]` writes a single-use ticket at `.tausik/.push_ticket.json` (schema_version=1, default 60s TTL, atomic write with temp-then-rename) bound to current HEAD SHA + branch. `scripts/hooks/git_push_gate.py` rewritten to consume the ticket on a valid match (schema + non-expired + HEAD-SHA match) and re-block on missing / expired / malformed / mismatched / already-consumed. The historical `TAUSIK_ALLOW_PUSH=1` env path is **removed** — it never worked across IDEs because PreToolUse hooks run in the harness process, not the Bash subprocess (Claude Code, Cursor, Qwen Code all share this constraint), so inline `VAR=val git push` env never reached the hook. Skills `/commit` (step 8) and `/ship` (sonnet/haiku variants) updated to run `tausik push-ok && git push` after user "y". `TAUSIK_SKIP_PUSH_HOOK=1` retained as a debug-only bypass; new `TAUSIK_PUSH_TICKET_PATH` env override added for tests. Single-use + short TTL + bound-to-HEAD reduce the accidental-push window; this is a discipline rail, not a malicious-agent firewall (that role belongs to `bash_firewall.py` for force-push and IDE permissions). New: `scripts/cli_push_ok.py` (~110L), `tests/test_push_ok_cli.py` (10 tests — atomic write + temp leftover + overwrite + nested mkdir + detached-HEAD normalization + TTL math + zero/negative TTL rejection + E2E subprocess via `project.py push-ok`). Modified: `scripts/hooks/git_push_gate.py` (full rewrite — env check removed, ticket validation + consumption added), `scripts/project.py` (dispatch wire), `scripts/project_parser.py` + `scripts/project_parser_ops.py` (subcommand registration), `tests/test_hooks.py::TestGitPushGate` (13 tests — ticket happy / missing / expired / SHA-mismatch keeps ticket / malformed / wrong schema_version / one-shot second push blocked / SKIP_PUSH_HOOK still bypasses / old ALLOW_PUSH env no longer bypasses). Skills: `harness/skills/commit/SKILL.md`, `harness/skills/ship/SKILL.md`, `harness/skills/ship/variants/model/{sonnet,haiku}.md`. Docs: `docs/{en,ru}/hooks.md`, `docs/en/security.md`, `docs/ru/troubleshooting.md`, `docs/ru/environment.md`.

- **Mass test parametrize, batch 1 (`v14c-mass-parametrize-batch-1`).** [partial completion — long-tail in same task, 1.4 closure target] Collapsed 25+ pytest dedupe groups from the regenerated 2026-05-07 audit (212 groups / 587 tests, supersedes 2026-05-02) into `@pytest.mark.parametrize` blocks across 19 test modules. ~125 `def test_*` functions removed in source; no production code changed; no behaviour regression (3345 passed). Cross-file groups handled per-file (no test moves between modules). G7+G13 merged together (12→1, two audit groups eliminated in one edit). G15 lifted cross-class to a module-level parametrized `test_generator_emits_required_markers` in `test_bootstrap_generate.py`. Auto-format hook applied during edits. G8+G18 in `test_hooks_common.py` (12 negative-bypass cases including U+2028/U+2029/U+0085 invisible separators) merged via a byte-aware Python script that preserves the unicode bytes in test text — Edit-string match could not preserve them, so the merge runs through `re.sub` on the file content with utf-8 round-trip. Spawned two defect tasks for pre-existing failures discovered during full-suite verification but unrelated to this batch: `v14c-defect-mcp-tool-handler-drift` (test_every_tool_name_has_handler) and `v14c-defect-bulk-decisions-stress` (test_bulk_decisions). New: `docs/ru/research/tausik-1.4-pytest-dedupe-2026-05-07.md` (regenerated audit baseline). Modified: `tests/test_ac_evidence_json.py`, `tests/test_audit_orphan_files.py`, `tests/test_audit_stale_docs.py`, `tests/test_audit_unused_python.py`, `tests/test_bootstrap_generate.py`, `tests/test_brain_fallback.py`, `tests/test_brain_hook_utils.py`, `tests/test_brain_schema.py`, `tests/test_brain_search.py`, `tests/test_brain_universality.py`, `tests/test_doctor_drift_baselines.py`, `tests/test_edge_cases.py`, `tests/test_memory_cleanup_cli.py`, `tests/test_model_routing.py`, `tests/test_qg0_dimensions.py`, `tests/test_rag.py`, `tests/test_rag_edge.py`, `tests/test_senar.py`, `tests/test_service_verification.py`, `tests/test_session_cleanup_check.py`, `tests/test_skill_manager.py`, `tests/test_skill_profile_detect.py`, `tests/test_stack_go_rust.py`, `tests/test_stack_iac.py`, `tests/test_stack_php_js.py`, `tests/test_task_start_model_banner.py`.

- **Per-task cost / token budget with runaway protection (`v14c-token-budget-task`).** Sister to `call_budget`. Adds USD-spend and token-total caps per task, with two enforcement points: at `task_done` (write actuals back + 1.5× warning) and after every tool call (`PostToolUse` hook emits stderr at 1.5× WARN / 2.0× BLOCKER). **Schema v27** adds 4 nullable columns to `tasks`: `cost_budget_usd REAL`, `cost_actual_usd REAL`, `token_budget INTEGER`, `tokens_actual INTEGER`. Existing rows get NULL — feature is opt-in per task. **CLI**: `tausik task add|update --cost-budget <USD float> --token-budget <int>`. Validation in `service_validation.validate_task_add_inputs` rejects negative values with descriptive errors; non-numeric is type-coerced via `float()`/`int()` raising `ServiceError`. **Backend setters**: `task_set_cost_budget` / `task_set_cost_actual` / `task_set_token_budget` / `task_set_tokens_actual` in `backend_crud.py` (mirror of existing `task_set_call_*` shape). **Rollup helper**: `usage_events_cost_rollup_for_task(slug, since=task.started_at)` in `backend_queries_usage.py` — same safety contract as `usage_events_cost_rollup_by_task` (`task_slug = ?` filter excludes session_record NULL-slug double-count rows automatically). Returns `{task_slug, event_count, tokens_total, cost_usd}` — zero-event case yields zeros, never None. **`task_done` flow**: new `service_recording.record_cost_actual` runs after `record_call_actual`, rolls up usage for the task's started_at window, writes `cost_actual_usd` + `tokens_actual` back to the row, returns warning string when actual > 1.5× of cost_budget OR token_budget (independent triggers). Never raises — DB / type errors return empty warning so `task_done` lifecycle never breaks. **PostToolUse hook** `scripts/hooks/task_cost_budget_check.py` (~230L): after every tool call, finds the SINGLE active task with at least one budget set, rolls up `usage_events`, classifies into `WARN` (1.5× ≤ ratio < 2.0×) / `BLOCKER` (≥ 2.0×) / None. Emits one stderr line per tool call at the chosen level, throttled to 1 emission per 30s per `(slug, level)` via atomic write to `.tausik/.cost_budget_throttle.json` (write-temp-then-rename, leftover .tmp cleanup on error). Silent no-op when `TAUSIK_SKIP_HOOKS=1`, 0 or ≥2 active tasks (multi-agent ambiguity — same policy as `task_call_counter`), active task has neither budget set, DB missing or locked, or stdin malformed. Never raises (subprocess exit 0). **Bootstrap**: registered in both `bootstrap_hooks.py` (Claude — wide PostToolUse matcher `""`) and `bootstrap_qwen.py` (Qwen parity). `tests/test_bootstrap_hooks_parity.py` required-set extended. **Hard caps are advisory** — Claude Code hooks can't physically stop the agent; the BLOCKER message is a "stop and re-plan" signal the agent honors next turn. **Out of scope** (separate tasks): session-level token cap (mirror of `session_capacity_calls`), HUD/status display, token-tier mapping in `/plan` SKILL.md. **task_show** detail printer surfaces `cost: actual=$X / budget=$Y` and `tokens: actual=N / budget=M` lines when the new columns are set. New: `scripts/hooks/task_cost_budget_check.py` (~230L), `tests/test_cost_budget_task.py` (37 tests — schema migration, validation reject/accept matrix on add+update, rollup happy/zero-event/cross-slug/since-filter, record_cost_actual writes-back + warn at 1.5×/no-warn within / no-warn without, hook subprocess: 7 silent no-op variants + WARN/BLOCKER for both cost and tokens + throttle dedupes + atomic write integrity, hook unit-level: classify/should_emit/format_msg). Modified: `scripts/backend_schema.py` (v27 + canonical CREATE TABLE), `scripts/backend_migrations.py` (v27 ALTER), `scripts/backend_crud.py` (4 setters), `scripts/backend_queries_usage.py` (rollup_for_task), `scripts/service_validation.py` (negative-budget rejection), `scripts/service_task.py` (task_add/update wiring), `scripts/service_recording.py` (record_cost_actual), `scripts/service_task_done.py` (call after record_call_actual), `scripts/project_parser_task.py` (--cost-budget / --token-budget flags), `scripts/project_cli_task.py` (CLI dispatch + task_show printer), `bootstrap/bootstrap_hooks.py` + `bootstrap/bootstrap_qwen.py` (hook registration), `tests/test_bootstrap_hooks_parity.py` (required-hook set), `docs/{en,ru}/cost-telemetry.md` (Per-task cost/token budget section). Pytest scoped on cost-budget suite: 37 PASS.

- **Semantic universality layer + 4 new regex topics (`v14c-ai-classifier-universality`).** Closes the gap left by B3 (regex-only `brain_universality.py`) — synonyms ("access control" → `rbac`, "token bucket" → `rate-limit`) were silently missed because the regex layer is literal-keyword bound. **Two changes, one combined hint pipeline.** **(1) Regex extension**: `_TOPIC_PATTERNS` gains 4 new entries — `csrf` (CSRF, XSRF, Cross-Site Request Forgery), `graphql` (GraphQL, gql query/mutation/subscription/schema/resolver), `feature-flag` (feature flag/toggle), `circuit-breaker` (circuit breaker, bulkhead pattern). All four use `\b` word-boundary regexes with explicit false-positive tests (`xcsrfx`, `photographqlike`, bare `feature`, electrical `circuit`). New `KNOWN_UNIVERSAL_TOPICS` frozenset (= `_TOPIC_PATTERNS.keys()`) exported for the semantic layer. **(2) Semantic layer**: new `scripts/brain_universality_semantic.py` (288L) — pure stdlib, zero new deps. `find_similar_universal(content, conn, threshold, limit)` tokenizes content (lowercase, stopwords filtered, length ≥ 4, deduped, capped at 8 distinct tokens), runs each token through `brain_search.search_local` (existing FTS5 + bm25 infra), aggregates hits by `(category, notion_page_id)` keeping the best score per row, then filters: keeps only rows whose `tags` overlap `KNOWN_UNIVERSAL_TOPICS` AND whose bm25 score ≤ threshold (default 8.0; lower = better). Returns `[(topic, best_score), ...]` sorted ascending. `emit_semantic_universality_hint(text, cfg)` gates on `brain.enabled` AND `brain.semantic_universality_enabled` (new config knob, default True) AND mirror file existing on disk; topics already caught by the regex layer are deduped out so users see only NEW signal; never raises, never blocks. **(3) Wire**: `emit_universality_hint` (the public API called from `service_knowledge.memory_add`, `brain_runtime.try_brain_write_decision`, `brain_runtime.try_brain_write_web_cache`) now invokes both layers — regex first (fast, synchronous), semantic second (opt-in, FTS5). All 3 call-sites unchanged at source level. Memory dead-end #27 (ChromaDB rejected as too heavy) and CLAUDE.md stdlib rule both honored — no ML, no embeddings, no new deps. Future ML extension is explicitly **out of scope** for 1.4 — captured as separate v1.5 backlog if ever needed. New: `scripts/brain_universality_semantic.py` (288L), `tests/test_brain_universality_semantic.py` (32 tests — token extraction edge cases, find_similar_universal happy/empty/threshold/exception/tag-filter paths, emit_semantic gating across enabled/disabled/missing-mirror/empty-text/dedupe-vs-regex/new-topic-detection/pathological-input, integrated `emit_universality_hint` triggering both layers when brain enabled). Modified: `scripts/brain_universality.py` (new topics + `emit_universality_hint` invokes semantic), `scripts/brain_config.py` (new `semantic_universality_enabled: True` default), `tests/test_brain_universality.py` (+9 cases — 8 new-topic positives + 6 false-positive guards + universe sanity check), `docs/{en,ru}/memory-merge-guidelines.md` (semantic-layer section + 4 new topics in the table). Pytest scoped on universality suite: 88 PASS.

- **Persisted per-task model recommendation (`v14c-auto-switch-model`).** Phase B already prints a `Model recommendation` banner on `tausik task start`, but the suggestion is one-shot — it scrolls past, gets ignored, and Claude Code can't switch model mid-session anyway. This task makes the recommendation outlive the print: a new `scripts/model_routing_session.py` (~140L) records the suggestion as `.tausik/.task_recommendation.json` (`{schema_version, slug, complexity, model, display, recorded_at}`) when a task starts and clears it when the task closes. Storage is intentionally separate from `.session.json` (skill_profile_session): that file's `model` key tracks the AGREED profile (env > config > auto), while this file tracks the SUGGESTED profile for the active task — different question, different lifetime, different file. `service_task.task_start` calls `record_active_task_recommendation(find_tausik_dir(), slug, complexity)` after the banner, `task_done` calls `clear_active_task_recommendation`. Both calls are wrapped in `try/except: pass` so persistence IO never blocks task lifecycle. The banner itself gains a fourth line on MISMATCH: `↪ Persist for next session: `tausik config set model_profile <slug>`` — names a concrete next action instead of relying on the agent to remember `/fast` exists. Profile slug derives from the routing model id via a small whitelist (`claude-haiku-4-5`→`haiku`, `claude-sonnet-4-6`→`sonnet`, `claude-opus-4-7`→`opus`); GPT/Qwen variants come from upstream profile work, not suggest_model, so they're omitted on purpose. Env knob `TAUSIK_DISABLE_TASK_RECOMMENDATION=1` makes record/read/clear all no-ops without raising — useful in CI or sandboxes that don't tolerate writes under `.tausik/`. Defensive: malformed JSON, non-object payload, missing required fields (`slug`, `model`, `display`, `recorded_at`) all read as None — partial writes / hand edits are treated as missing rather than yielding a half-broken dict. New: `scripts/model_routing_session.py` (140L), `tests/test_model_routing_session.py` (14 cases — record/read/clear roundtrip across simple/medium/complex, env-disable on all three operations, malformed/partial/non-object JSON read as None, isolation from `.session.json`, overwrite semantics on consecutive task_start calls, atomic write leaves no `.tmp` leftover). Modified: `scripts/service_task.py` (start/done hooks), `scripts/model_routing.py` (banner persist hint + `_model_id_to_profile_slug` mapping). Full pytest: scoped on new + model_routing + skill_profile = 45 PASS.

- **Setup-heavy fixture extraction (`v14c-setup-heavy-fixtures`).** Two test modules with repeated setup boilerplate trimmed without changing the assertion surface. **`tests/test_brain_sync.py`**: introduced compact Notion property helpers (`_title`, `_rich_text`, `_url`, `_date`, `_number`, `_select`, `_multi_select`) — each returns the exact dict shape that `map_page_to_row` inspects, so the title-vs-rich_text-vs-select-vs-multi_select type discriminators are still load-bearing — and a `_web_cache_page(**property_overrides)` builder with sensible defaults. `test_map_web_cache` shrinks from a 38-line inline page dict to a single `_web_cache_page()` call (full assertion block intact); `test_map_web_cache_default_ttl_when_missing` keeps its sparse skeleton (TTL Days / URL / Domain absent — exercises the 30-day fallback path) but each property is now a one-line helper call. **`tests/test_audit_pytest_dedupe.py`**: subprocess wrapping in `TestCli.test_real_repo_runs` (venv-python lookup + `subprocess.run` with UTF-8 env, ~13 lines) extracted to module-level helpers `_venv_python(repo)` + `_run_audit_script(repo, *args)`. Future subprocess tests that drive the audit CLI can reuse the helper without re-deriving the venv path or repeating the `PYTHONIOENCODING` env tweak. Pytest scoped on both files: 30 passed in 0.79s. Test coverage unchanged — same `assert row[<field>] == ...` checks, same return-code/stdout assertions on the CLI smoke. Note: `test_brain_runtime_web_cache.py` was originally in this task's scope but its patch-block consolidation (the `_patched_store` contextmanager) landed earlier in `v14c-rewrite-brittle-tests`; this task therefore proceeds with the narrowed two-file scope.

- **Brittle-test rewrite (`v14c-rewrite-brittle-tests`).** Replaced 5 implementation-detail tests with behaviour/structural equivalents that survive non-semantic refactors. **(1)** `tests/test_audit_pytest_dedupe.py::TestArtifactExists::test_research_artifact_committed` — pinned filename `tausik-1.4-pytest-dedupe-2026-05-02.md` swapped for a `glob("tausik-1.4-pytest-dedupe-*.md")` lookup so re-runs of the audit script (with a fresh date) don't break the test. **(2)** `TestRenderMarkdown::test_empty_groups_clean_message` (renamed → `test_empty_groups_omits_per_test_rows`): two literal-string asserts (`"No duplicate test scenarios detected"`, `"Documented false positives"`) replaced with an empty-vs-populated behavior contrast — empty input must NOT enumerate per-test rows, populated input MUST; copy can change without churning the test. **(3)** `tests/test_brain_sync.py::test_allowed_cols_matches_schema` — bespoke `re.compile(r"CREATE TABLE IF NOT EXISTS\s+(brain_\w+)\s*\((.*?)\);", re.DOTALL)` parse + handcrafted line-skipping for CHECK/FOREIGN KEY clauses replaced with `sqlite3.connect(":memory:").executescript(SCHEMA_SQL)` + `PRAGMA table_info(<table>)` — uses the actual SQLite parser so multi-line declarations, quoted identifiers, and constraint clauses are handled by the engine. **(4)** `tests/test_brain_hook_utils.py::test_multi_row_mixed_iso_formats_picks_freshest` — original case (`'.000Z'` vs `'Z'`) preserved, but parametrized with two additional ISO format pairs (microsecond `'.000000Z'`, fractional `'.5Z'`) so the epoch-vs-text correctness gate covers a wider tolerance band. **(5)** `tests/test_brain_runtime_web_cache.py` — 7 tests had near-identical 6-line `with patch("brain_notion_client.NotionClient", autospec=True), patch("brain_mcp_write.store_record", return_value=...)` blocks; consolidated into a `_patched_store(return_value)` `@contextmanager` helper at module level. Net diff is shape-preserving — same patches, same return values, same call_args inspection — but the per-test scaffolding shrinks from 6 lines to 1. The exception-injection test (`test_exception_inside_returns_false`) keeps its inline `side_effect=RuntimeError(...)` patch since it doesn't use `store_record`. Pytest scoped on the 4 files: 65 passed in 2.94s. No production code changed.

- **Skill bundles marketplace (LOCAL scope) (`v14b-skill-bundles-marketplace`).**
  Logical grouping layer over `skills-official/` vendor skills. New `skills-official/bundles.json` defines 6 bundles: `integrations` (jira/bitrix24/confluence/sentry), `data-formats` (excel/pdf/markitdown), `quality-pro` (audit/security/optimize/zero-defect/ultra), `automation` (run/loop-task/dispatch), `workflow-helpers` (daily/retro/presale/skill-test/docs), `ru-locale` (empty placeholder for future RU-specific skills). Physical layout stays flat — `tausik skill install <name>` keeps working for the 20 individual skills. New `scripts/skill_bundles.py` service module (load/list/show/install/uninstall + format helpers). New CLI `tausik skill bundle [list|show|install|uninstall] [--json]`: bundle install routes each skill through the existing `skill_install` pipeline (continues on per-skill error; skips deprecated names with migration message; placeholder bundles return clean no-op). **5 deprecated skills removed** from `skills-official/` and `registry.json`: `go` (use `/plan` + `/task`), `next` (use `tausik task next` CLI), `diff` (use `git diff` + `/review`), `onboard` (use `/start`), `init` (use `bootstrap.py --init`). Each removal includes a migration message in `bundles.json::deprecated`. **Final push to `Kibertum/tausik-skills`** (public marketplace publication) is **deferred to post-1.4** per polish moratorium — local CLI works against the in-tree mirror today and will read the GitHub raw URL once the push lands. New: `scripts/skill_bundles.py` (243L), `tests/test_skill_bundles.py` (22 tests — schema, deprecation removal, install/uninstall callback routing, error continuation, placeholder no-op, format helpers), `docs/{en,ru}/skill-bundles.md`, `docs/{en,ru}/skill-bundles-migration.md`. Modified: `scripts/project_cli_skill.py` (bundle subcommand dispatch), `scripts/project_parser_ops.py` (argparse). Live smoke: `tausik skill bundle list` → 6-row table; `bundle show integrations` → 4 skills; `bundle show ru-locale` → empty placeholder; `bundle show nope` → clean error.

- **`/start --lite` mode + tool-output truncation nudge (`v14b-start-lite-tool-truncation`).**
  Salvageable remainder of the dropped `tier2-architectural` task (CLAUDE.md split is explicitly out of scope). Two pieces. **(1) `/start --lite`** (or `/start lite` arg): `harness/skills/start/SKILL.md` Phase 3 gains a Lite Mode contract — render ≤ 50 lines (counts only, MCP Health if drifting, one-sentence Suggested Next, no handoff body / no per-task title / no warning prose). Default `/start` flow unchanged. **(2) Tool-output truncation nudge** (`scripts/hooks/tool_output_truncation_nudge.py`, NEW): PostToolUse coaching hook on `Read|Grep|Bash|Glob`. Counts lines in `tool_response`, emits a single stderr line like `[TAUSIK truncation nudge] <Tool> returned <N> lines (threshold 250, +N over). Prefer narrower scope: search_code / Grep with glob/path / Read with offset/limit.` when output exceeds the threshold. Threshold lookup: `.tausik/config.json::tool_output_truncation_threshold` (int) → env `TAUSIK_OUTPUT_TRUNCATION_THRESHOLD` → hard default 250. Hook NEVER modifies tool output (built-in head_limits already truncate content) — coaching signal only. Defensive: malformed stdin, missing tool_response, IO error → silent exit 0 so the harness never breaks. Skipped via `TAUSIK_SKIP_HOOKS=1`. Bootstrap registers it as a 7th PostToolUse hook in both `bootstrap_hooks.py` (Claude) and `bootstrap_qwen.py` (parity test enforces this). Tests: 24 cases (12 unit on threshold resolution + line counting + payload extraction; 7 subprocess integration on stderr behavior across thresholds, watched-tool filter, malformed inputs, env skip; 5 SKILL.md content checks for Lite Mode contract).

- **Sub-agent: `tausik-gate-fixer` (`v14b-subagent-gate-fixer`).**
  Read-only PLAN agent invoked from `/debug` when a `tausik verify` gate fails. New `harness/claude/subagents/tausik-gate-fixer.md` (2878B; sonnet; Read+Grep+Bash). Reads gate stderr + `docs/en/troubleshooting.md` + `docs/en/architecture.md` at runtime, returns 1-3 step JSON fix plan `{gate, family, plan: [{step, action, target, change, why}], meta}`. Action vocabulary fixed (closed set): `edit`, `extract_module`, `add_test`, `move_file`, `delete_dead_code`, `re_run_gate`. Sub-agent NEVER applies edits — invoker re-runs `tausik verify` after the plan is applied. `/debug` SKILL.md adds Step 7 documenting the auto-helper invocation pattern; `docs/{en,ru}/troubleshooting.md` add a "Failed verify-gate → tausik-gate-fixer" section; `docs/{en,ru}/skill-ecosystem.md` add a row to the Claude-native sub-agents table. Reuses the `copy_subagents()` deploy pattern landed in `v14b-subagent-reviewer`. Smoke test: synthetic ruff E501 stderr → simulated agent returned valid JSON with `edit` + `re_run_gate` plan; agent caught a stderr-line drift (formatter shifted lines) by re-reading the file and re-locating the offender. Tests: 7 cases (frontmatter contract, < 3KB size, runtime-doc citation, action vocabulary present, JSON-only enforcement, /debug skill mention, file existence).

- **Sub-agent: `tausik-reviewer` + Lite review mode (`v14b-subagent-reviewer`).**
  Claude-native sub-agent for code review. New `harness/claude/subagents/tausik-reviewer.md` (2854B; sonnet; Read+Grep+Bash) reads `harness/skills/review/agents/quality.md` + `docs/en/security.md` + `docs/en/security-checklist.md` at runtime (NOT embedded — keeps the definition under 3KB) and returns structured JSON `{scope, critical[], high[], medium[], low[], meta}`. Bootstrap deploys via new `bootstrap_copy.copy_subagents()` (Claude-only, copies `harness/claude/subagents/*.md` → `<target>/agents/*.md`; no-op for Cursor/Qwen which lack named-subagent concept). `/review` SKILL.md adds **Lite Mode** (`/review lite` or `/review src/ lite`): single sub-agent invocation instead of the default 6-agent fork. Token-economy alternative for low-stakes diffs; default 6-agent flow unchanged. AC #6 (≥30% main-context token reduction) DEFERRED — requires ≥10 baseline sessions of `token_metrics.jsonl` data; will be re-measured once baseline matures. Smoke test: planted SQL injection + cleartext-token logging → agent returned critical[] + high[] correctly. `docs/{en,ru}/skill-ecosystem.md` document the new "Claude-native sub-agents" section + add-pattern. Tests: 8 cases (file existence, < 3KB size, frontmatter contract, runtime-doc citation, JSON schema, copy_subagents deploys to claude only, no-op for non-claude IDEs, no source dir handled).

- **Brain sync display key fix (`v14b-followup-brain-sync-cursor-pulls-zero`).**
  `scripts/brain_cli_ops.py:93` was reading `payload.get("upserts")` (typo, missing 'd') and `payload.get("pulled")` (never-existed key) from `sync_category()` results, falling through to `0` and reporting `pulled 0` for every category even on successful syncs. Data was correctly written to the local mirror — only the CLI display lied. Fix: read `payload.get("upserted", payload.get("fetched", 0))` — uses the actual key names returned by `sync_all`. Original investigation hypothesized the bug lived in the delta-cursor / `--join-existing` flow; live read disproved that — sync_state populates correctly and `iter_database_query` returns pages. Sub-agent diagnosis bypassed the wrong-hypothesis trap by going straight to the return contract. Regression test in `tests/test_brain_sync.py` pins the dict-key contract between `sync_all` and `cmd_brain` (would have caught the typo at PR time).

- **Research dump audit (`v14b-junk-research-archive`).**
  Re-scoped from a manual one-time move (NOT READY: all 4 research files in `docs/{en,ru}/research/` were 3-6 days old at task time, criteria required >30) to an automated audit script. New `tausik audit research [--min-age-days N] [--json]` walks `docs/{en,ru}/research/`, filters by file age + absence of references in `tests/`, `scripts/`, `CHANGELOG.md/.ru.md`, `README.md/.ru.md`, and surfaces stale unreferenced files as cleanup candidates. Read-only — no moves, no deletes. Helper `scripts/audit_research_dump.py::audit_research_dump(repo_root, min_age_days=30)` returns `{candidates, skipped_recent, skipped_referenced, scanned}`. Replaces the manual 2026-06-02 review in the original task notes — rerun any time and act when candidates appear. Tests: 7 cases (empty dir, recent skip, old + referenced skip, old + unreferenced is candidate, age threshold boundary, multi-locale scan, CHANGELOG ref skip). docs/{en,ru}/cli.md document the new subcommand.

- **Vendor cleanup audit (`v14b-junk-vendor-usage-audit`).**
  New `tausik audit vendors [--json]` — read-only static cross-check of `.tausik/vendor/<name>/` against `installed_skills` in `.tausik/config.json`. Classifies each cloned vendor repo as `installed` (≥1 skill in config) or `vendored_unused` (cleanup candidate); errors land in `unknown` bucket. Surfaces removal command (`tausik skill repo remove <name>`) for review — audit itself NEVER deletes. Re-scoped from telemetry-based design (original AC assumed `usage_events` tracked skill invocations, but that table tracks tokens/cost only — finding logged in task notes). Helper `scripts/audit_vendor_usage.py::audit_vendor_usage(vendor_dir, config_path)` returns `{installed, vendored_unused, unknown}`. Tests: 9 cases (empty vendor dir, single installed, single unused, mixed, missing config, malformed config, vendor without skills, read-only invariant, last-modified ISO format). docs/{en,ru}/cli.md document the new subcommand.

- **GPT model profile overlays — gpt-4 / gpt-5 / gpt-5-5 (`v14b-gpt-model-profile`).**
  Unblocked by B8-pre. Added 9 telegraphic delta overlays under `harness/skills/{plan,task,ship}/variants/model/{gpt-4,gpt-5,gpt-5-5}.md`. Style: imperative voice, ≤25 lines each, **delta-only** (no base SKILL.md restatement) — encodes GPT-specific behavior nudges (aggressive parallel tool calls esp. for gpt-5/gpt-5-5, zero narrative reasoning, single-turn task completion, heredoc commit messages). Resolved via two-axis `merge_skill_markdown(skill_dir, ide=..., model="gpt-5")`. Form `gpt-5.5` (with dot) normalizes to slug `gpt-5-5` via `normalize_model_profile_slug` and resolves the `model/gpt-5-5.md` overlay automatically. Tests: parametrized 9 cases (3 skills × 3 gpt profiles) + unknown-profile fallback (`gpt-99` → base only) + dot-form normalize (`gpt-5.5` → `gpt-5-5`). docs/{en,ru}/skill-profiles.md document the GPT additions and design intent.

- **Skill profile auto-detect + two-axis variants/ + disk pre-merge (`b8-pre-model-profile-auto-detect-interactive-promp`).**
  Resolved B8 axis decision: `variants/` now has two independent subdirs — `variants/ide/{claude,cursor,qwen,codex}.md` and `variants/model/{opus,sonnet,haiku,gpt-4,gpt-5,gpt-5-5,qwen}.md`. Two-axis merge order: `base + ide overlay + model overlay`. Either or both overlays may be missing — silently skipped. Backward compat: legacy flat `variants/<slug>.md` still works via `merge_skill_markdown(skill_dir, requested_profile=<slug>)` for external skill repos. Migration of `harness/skills/{plan,task,ship}/variants/{sonnet,haiku}.md` → `variants/model/<slug>.md` and `_profile-demo/variants/{claude,codex}.md` → `variants/ide/<slug>.md`. New `scripts/skill_profile_detect.py` (`detect_ide`, `detect_model`, `normalize_model_profile_slug`, `VALID_IDES`, `VALID_MODELS`) reads env (`CLAUDE_CODE_*`, `CURSOR_*`, `QWEN_*`, `CODEX_*`, `ANTHROPIC_MODEL`, `OPENAI_MODEL`, `QWEN_MODEL`, `TAUSIK_MODEL`); model is `None` when host doesn't expose it (Cursor/Qwen UI selection). New `scripts/skill_profile_session.py` (`load_session_state`, `save_session_state`, `resolve_profile`) implements precedence env > config.json > auto-detect, persists `(ide, model, source, last_rebuild_at)` in `.tausik/.session.json` (schema_version: 1). New `scripts/skill_profile_rebuild.py` (`rebuild_skills`) walks `.claude/skills/` with sha256 cache — writes only when merged content differs (cache hit = no-op, microseconds; preserves mtime for git/watcher safety). `merge_skill_markdown` adds `_strip_existing_overlays` (idempotency: re-merging an already-merged SKILL.md never accumulates overlay sections). SessionStart hook (`scripts/hooks/session_start.py::_auto_rebuild_skills`) auto-runs detect + rebuild before context injection — silent on cache hit, never blocks. New CLI: `tausik skill rebuild [--force]`, `tausik config set {ide,model}_profile <slug>`, `tausik config show`. New scripts/project_cli_config.py keeps service code under filesize gate. `harness/skills/start/SKILL.md` Phase 0 documents the auto-rebuild contract. Tests: 56 cases (21 detect, 11 rebuild, 11 session_state, 13 skill_profile two-axis + backward compat). Local copy of `parse_skill_frontmatter` inlined into `skill_profile.py` (scripts/ no longer depends on bootstrap/ at runtime). Unblocks `v14b-gpt-model-profile` (B8): GPT model profiles can now be authored as `variants/model/{gpt-4,gpt-5,gpt-5-5}.md` overlays. docs/{en,ru}/skill-profiles.md fully rewritten.

- **Universality heuristic for brain artifact suggestions (`v14b-brain-universality-heuristic`).**
  New `scripts/brain_universality.py` — pure stdlib regex/keyword detector for 8 well-known cross-project topics: `rbac`, `jwt`, `oauth`, `rate-limit`, `pagination`, `retry`, `idempotency`, `webhook`. Public API: `detect_universal_patterns(content) -> list[str]` (sorted unique slugs, `[]` on empty/non-string) and `format_universality_hint(topics) -> str` (single-line stderr-friendly hint pointing at `brain_draft_artifact`). Word-boundary aware regexes guard against false positives like `aggregate` triggering `rate-limit`. Wired into three call sites (advisory only — never blocks): `service_knowledge.memory_add` (always, since memory has no brain auto-routing) and `brain_runtime.try_brain_write_decision` / `try_brain_write_web_cache` success paths. Hint format: `Universal pattern(s) detected: jwt, retry — consider promoting via \`brain_draft_artifact\` (or skip with \`confirm: cross-project\`).`. Tests: 33 unit cases (per-topic positives, project-specific negatives, false-positive guards for `aggregate`/`oauthorization`, multi-topic dedupe + sort, case-insensitivity, format helpers, pathological-input safety) + 8 integration cases (memory_add emission, brain_runtime success paths, detector-blowup never breaks the write). docs/{en,ru}/memory-merge-guidelines.md document the heuristic and topic list.

- **Skill discovery catalog (`v14b-skill-catalog`).**
  `tausik skill catalog [<repo>] [--json]` lists skills offered by configured/cloned skill repos: `name`, `category`, `repo`, `description`, plus `triggers` and `requires` in JSON mode. Without args it scans every repo in `.tausik/vendor/`; with a repo name it filters to one. New helper `skill_repos.repo_catalog()` (also drives the existing `repo_list_all_skills`) reads each repo's `tausik-skills.json` manifest, surfacing optional `category` field with empty-string fallback. Service entry `ProjectService.skill_catalog(vendor_dir, repo_name=, config_path=)` raises `ServiceError` for unknown repo names (not configured AND not cloned). New MCP tool `tausik_skill_catalog` with optional `repo` + `as_json` params (project tool count 95→96, main 102→103, with-rag 109→110). Mirrors landed in claude + cursor handlers/tools. Tests: 10 cases (multi-repo discovery, single-repo filter, empty vendor, unknown-repo error, configured-but-not-cloned passes, category fallback, JSON mode, repo_list_all_skills delegation). docs/{en,ru}/cli.md + docs/{en,ru}/mcp.md document the new command.

- **Memory hygiene CLI (`v14b-memory-cleanup-cli`).**
  Two new commands for long-running projects whose memory FTS has accumulated noise. `tausik memory archive --before <duration> [--confirm]` soft-archives memory rows older than the given duration (`90d` / `12w` / `2m` / `1y`); dry-run by default, idempotent on `--confirm`. `tausik memory dedupe [--threshold 0.85] [--limit 200]` lists near-duplicate pairs above the similarity threshold using `difflib.SequenceMatcher.ratio()` over `title || content`, scoped to same `type` (so a `pattern` is never suggested to merge with a `gotcha`); read-only — consolidate manually via `memory show` + `memory delete`. `memory list` / `memory search` filter `archived_at IS NOT NULL` by default; `--include-archived` (CLI) and `include_archived: true` (MCP `tausik_memory_list` / `tausik_memory_search`) opt back in. New MCP tools: `tausik_memory_archive`, `tausik_memory_dedupe` (project tool count 93→95). Schema migration v26 adds nullable `archived_at TEXT` + `idx_memory_archived_at` on the `memory` table; archived rows stay queryable via `memory show <id>` so content can be recovered before deletion. Helper module: `scripts/memory_cleanup.py` (`parse_duration_to_days`, `find_dedupe_candidates`). Tests: 18 cases across duration grammar, archive lifecycle (dry-run, --confirm, idempotency), list/search filter symmetry, and dedupe (skips different types, rejects bad threshold, ignores archived). docs/{en,ru}/memory-merge-guidelines.md document both commands.

- **Soft-archive of stale done tasks (`v14b-hygiene-archive-confirm`).**
  `tausik hygiene archive --confirm` now actually writes — it stamps `archived_at` (UTC ISO8601) on done tasks whose `completed_at` is older than `task_archive.done_age_days` (config-gated, idempotent). The row stays in `tasks` (`status='done'` unchanged) so FTS, `task_show`, decisions, and metrics keep seeing it; `tausik task list` filters `archived_at IS NOT NULL` by default and a new `--include-archived` flag (CLI + `tausik_task_list` MCP `include_archived: bool`) opts back in. Schema migration v25: `ALTER TABLE tasks ADD COLUMN archived_at TEXT` + `idx_tasks_archived_at`. `--confirm` does NOT bypass `task_archive.enabled=false`. Tests: +8 cases (apply stamps timestamp, idempotent re-run, disabled config blocks --confirm, recent done untouched, default list hides archived, --include-archived shows them, task_show still works on archived row, v25 migration adds nullable column). Spec docs/{en,ru}/task-archive-spec.md rewritten — removed "future implementation" framing.

- **Cross-file pytest test-count consistency check (`v14b-doc-gen-test-count`).**
  Follow-up to `v14b-doc-gen-mcp-tool-counts`. New `scripts/pytest_test_count.py` runs `pytest --collect-only -q --override-ini="addopts="` (60s timeout, `stdin=DEVNULL` per gotcha #88) and parses the trailing `N tests collected` summary — returning the FULL suite size independent of the fast-lane `-m 'not slow'` filter. `gen_doc_constants.py` adds `test_count` to `constants.json` (with prior-value preservation if collection fails so a transient pytest error doesn't poison the payload). Cross-file scanner extended with 4 narrow context-tight patterns: `pytest suite (N tests)`, badge URL `tests-N%20passed`, badge alt-text `[!N tests]`, markdown bold `**N tests**` — deliberately narrow to avoid noise on illustrative phrases like "Never add 5 tests where one parametrized test covers". New `--skip-test-count` CLI flag isolates the new scan; `--skip-cross-files` skips all three. First run on the live tree surfaced two real drifts: README.md + README.ru.md badges showed `2590 tests` (actual 3056) and `AGENTS.md` repo-layout `pytest suite (2590 tests)` — fixed in all four. AGENTS.md drift was inside a fenced code block (stripped by scanner); manual fix kept since scanner is intentionally fence-blind for false-positive control. Tests: +6 cases (clean-when-all-match, pytest-suite drift, badge URL+label drift, fenced-code skip, illustrative-numbers safety, `--skip-test-count` isolation). pytest 3050 → 3056 passed; ruff + mypy clean.

- **Cross-file MCP tool-count consistency check (`v14b-doc-gen-mcp-tool-counts`).**
  Follow-up to `v14b-doc-gen-cross-files`. `scripts/gen_doc_constants.py --check` now also flags drift in MCP tool-count phrasings across `README.md`, `README.ru.md`, `AGENTS.md`, `CLAUDE.md`, `docs/{en,ru}/architecture.md`, `docs/{en,ru}/mcp.md` (last two added to scan targets) — comparing every match of `**N tools**`, `N project tools`, `N brain tools`, `(N project + M brain`, ``` `tausik-brain`, N tools ``` against `constants.json` (`mcp_project_tools` / `mcp_brain_tools` / `mcp_main_tools`). Patterns are RU/EN-aware (matches `tools?` and `инструмент(а|ов)?`). Fenced code blocks are stripped before scanning so doc examples (e.g. `90 project tools (legacy example)`) don't trip the scanner. New `--skip-mcp-counts` CLI flag opts out of the new scan while keeping version-ref scan on; `--skip-cross-files` still skips both. First run on the live tree surfaced two real drifts in `docs/{en,ru}/mcp.md`: the `## Shared Brain (`tausik-brain`, 6 tools)` header was stale (actual count is 7) and the table was missing `brain_draft_artifact` — both fixed and the trailing "is 6" prose corrected. Tests: +6 cases (clean-when-all-match, brain-header drift, project drift, project+brain pair drift, fenced-code skip, `--skip-mcp-counts` flag isolation). pytest 2917 → 2923 passed; ruff + mypy clean.

- **Compound RPC `tausik_session_open` for `/start` Phase 1 (`v14b-session-open-compound-rpc-impl`).**
  Single MCP call returns one JSON envelope with `{session, status, handoff, tasks{active,blocked}, self_check}` — replaces 5 sequential calls (session_start + status compact + last_handoff + task_list active+blocked + self_check) with one round-trip. Each sub-section is best-effort: a sub-call failure surfaces an inline `error` key without aborting the envelope, so `/start` still renders a degraded dashboard. MCP tool count: 99 → 100 (93 project + 7 brain). `/start` SKILL.md Phase 1 collapses from "5 parallel tools" to "single compound call"; drift fallback to CLI on `self_check.drift_detected=true` is preserved.

- **Cross-file version-ref consistency check (`v14b-doc-gen-cross-files`).**
  `scripts/gen_doc_constants.py --check` now also walks README.md,
  README.ru.md, AGENTS.md, CLAUDE.md, docs/en/architecture.md,
  docs/ru/architecture.md and verifies every `vX.Y` / `vX.Y.Z`
  occurrence outside fenced code blocks against
  `constants.json["tausik_version"]`. 2-part refs (`v1.4`) match by
  major+minor only; 3-part refs (`v1.4.0`) require exact match.
  Foreign version timelines (`SENAR vX`, `Python vX`, `OWASP vX`) are
  detected via a 24-char lookback window and skipped — those
  products version independently. Fenced code blocks are stripped
  with line-number-preserving whitespace so reported `file:line`
  positions point at the original source line. New `--skip-cross-files`
  CLI flag preserves the prior single-file check behaviour for
  contexts where doc-scan runs separately. First run on the live
  tree surfaced 4 stale `v1.3` refs in
  `docs/{en,ru}/architecture.md` (the Scripts section was claiming
  "73 source files (v1.3)" — current count is 117 in v1.4) plus 2
  parenthetical `v1.3 CLI handlers` notes. All four updated to
  reflect current state. Tests: +7 cases — clean-when-all-match,
  minor-drift detection, patch-drift detection, foreign-version
  skip (SENAR/Python/OWASP), fenced-code-block skip, run_main
  cross-file drift exit-1, --skip-cross-files preserves legacy.
  pytest 2910 → 2917 passed; ruff + mypy clean.

- **Translation-drift audit: skip-marker + code-fence awareness (`v14b-audit-translation-skip-marker`).**
  Two improvements to `scripts/audit_translation_drift.py` that close
  the remaining 3 deferred pairs from the RU-mirror sweep without
  forcing structural parity on intentionally-abbreviated docs. (a)
  The audit now honors an HTML comment marker
  `<!-- audit-translation-drift: skip -->` placed in either side of
  a pair — those pairs are listed in a new "Intentionally abbreviated"
  section and excluded from drift counting (and from `--check` exit-1
  triggering). The marker is added to the three RU summaries that
  already explicitly point to the long-form EN doc:
  `docs/ru/claude-md-guide.md`, `docs/ru/brain-db-schema.md`,
  `docs/ru/environment.md`. (b) The heading regex now strips fenced
  code blocks before counting — `# BAD` / `# GOOD` lines inside
  ` ```markdown ... ``` ` examples no longer count as document
  headings (false positive that previously inflated EN heading counts
  in tutorial-style docs). `audit_pairs()` now returns a 4-tuple
  `(drifts, en_only, ru_only, abbreviated)`; renderers accept the
  new optional `abbreviated` arg and add an "Intentionally
  abbreviated" section. Tests: +7 cases (skip marker EN/RU side,
  code-fence heading exclusion, fence-close sanity, abbreviated
  list-rendering, --check exit-0 with only abbreviated pairs,
  has_skip_marker shape) — pytest 2903 → 2910 passed; ruff + mypy
  clean. Final audit state: zero paired drift, 3 intentionally
  abbreviated, 4 EN-only + 1 RU-only unpaired (informational). The
  full v14b RU-mirror sweep (8 originally drifted pairs) now closes
  out across 3 commits.

- **RU-mirror sweep batch 2: 2 of 5 deferred pairs cleared bilaterally (`v14b-ru-mirror-sync-batch-2`).**
  Second pass through the drift report. Resolved bilaterally:
  `architecture.md` (Δ-2 hd / +2 tbl) — removed a broken empty 3-col
  table from EN at line 51-52 (header + separator with no rows; the
  new audit script surfaced it as a doc bug); changed EN line 18 ASCII
  art `|                |` to `v                v` so the audit regex
  no longer treats vertical-pipe diagram lines as table separators
  (false-positive); added `## Hooks (anti-drift)` and `## Memory
  Aggregates` sections to EN, translated from existing RU content
  that documented `scripts/hooks/` registration and
  `service_knowledge_aggregates.py`. `security.md` (Δ-10 hd / -2 cb)
  — backported 4 RU-only sections to EN: `## Authentication` (Password
  requirements + Cookie security), restructured `## Secrets
  management` with Never / Do this instead / `.gitignore` subsections
  and a fenced `.gitignore` example, restructured `## Audit logging`
  with What to log / What NOT to log subsections, new `## Checklists`
  with Pre-commit / Pre-deploy lists. Added `## Гарантии TAUSIK`
  section to RU translated from EN's existing `## TAUSIK-specific
  guards`. Both pairs now at zero drift.

  Deferred to `v14b-audit-translation-skip-marker`: the remaining 3
  pairs (`claude-md-guide.md`, `brain-db-schema.md`, `environment.md`)
  are intentionally-abbreviated RU mirrors that explicitly point
  readers to the full EN version. Forcing structural parity defeats
  their design. The follow-up adds two improvements to the audit
  script: (a) honor a `<!-- audit-translation-drift: skip -->`
  HTML-comment marker so abbreviated mirrors are listed in their own
  section rather than as drift; (b) heading regex tracks fenced-code-
  block context so triple-backtick markdown examples (`# BAD` /
  `# GOOD` lines inside code fences) no longer count as real headings.

  Audit drift count: 5 → 3 paired (after batch 1's 8 → 5 + batch 2's
  5 → 3); pytest 2903 passed; ruff + mypy clean.

- **RU-mirror sweep batch 1: 3 of 8 drifted pairs cleared (`v14b-ru-mirror-sync-batch`).**
  First pass through the drift report from the new translation-drift
  audit script. Resolved: `docs/ru/stacks.md` (removed RU-only
  `## DEFAULT_STACKS (25)` list — TODO followup: add this 25-stack
  list to `docs/en/stacks.md`); `docs/ru/upgrade.md` (removed RU-only
  `## Версионная политика` semver section + `## См. также` cross-link
  block — TODO followup: backport both to `docs/en/upgrade.md`);
  `docs/ru/senar-compliance-matrix.md` (added missing
  `### Gaps и план закрытия` subsection with the gap-tracking table
  to match EN's `### Gaps and Plan to Close`). Deferred to
  `v14b-ru-mirror-sync-batch-2` with per-file rationale: `architecture.md`
  (EN has a broken empty table at line 51-52 — fixing parity requires
  editing EN, blocked by one-direction-sweep AC), `security.md` (RU
  has 10+ extra sections — informed review needed whether RU is stale
  or EN dropped content), `claude-md-guide.md` (+21 heading delta),
  `brain-db-schema.md` (+10 hd / +6 tbl), `environment.md` (+43 hd /
  +12 cb / +4 tbl) — last three need real translation scoped to a
  dedicated session. Audit count: 8 → 5 paired drift; full pytest
  suite still green (zero regression on markdown-only edits).

- **Translation-drift audit script (`v14b-junk-translation-drift-audit`).**
  New `scripts/audit_translation_drift.py` reports structural drift
  between EN/RU mirror docs (`docs/en/foo.md` ↔ `docs/ru/foo.md`)
  by comparing three coarse metrics per pair: ATX heading count
  (`#`..`######`), fenced code-block count (triple-backtick fences),
  markdown-table-separator count (`|---|---|` rows). Pairing by
  basename — `paired-with-drift`, `en-only`, `ru-only` rendered as
  separate sections. Three modes mirroring `audit_stale_docs.py`:
  default markdown report, `--json`, `--check`. Default mode is
  always advisory (exit 0 even when drift exists). `--check` exits
  1 only when paired drift is found, never on unpaired files alone
  — those are informational. Pure-stdlib (`re` + `pathlib` +
  `argparse` + `json`); no NLP, no semantic comparison, no auto-fix,
  no integration into pre-commit hooks or `gate_runner.py`. First run
  against the live tree surfaces 8 drifted pairs (architecture,
  brain-db-schema, claude-md-guide, environment, security,
  senar-compliance-matrix, stacks, upgrade) plus 4 EN-only and 1
  RU-only docs — exactly the visibility the spin-off was scoped for.
  Tests: 14 cases in `tests/test_audit_translation_drift.py` cover
  metric counting, drift detection per metric, unpaired
  categorisation, exit-code semantics, and JSON shape. ruff + mypy
  clean; full pytest 2889 → 2903 passed (+14, zero regression).

- **Mass test parametrize, batch 3 long-tail: WONT FIX in v1.4.0 (`v14c-mass-parametrize-batch-3`).** The size=2 long-tail (~145 groups / 290 tests, audit groups #68-212 from 2026-05-07) is **not processed** in 1.4 and is **not deferred** to 1.4.1 (per the user's "не дробить минор" guidance against patch-release polish churn). Decision #83 recorded via `tausik decide` with full cost-benefit rationale. Why: 2-test audit groups are HIGH false-positive rate — by structural hash, `test_X_returns_true` + `test_X_returns_false` and other legit happy/sad pairs look identical to actual duplicates, requiring per-group semantic review (~5 min each → ~12h for all 145). Even at perfect collapse the gain is ~4% test-count reduction (-145 tests of ~3360), diminishing returns after batches 1+2 already removed ~110 high-confidence dupes. **What 1.4 ships for dedupe:** batch-1 (size≥4, 25+ groups) + batch-2 (size=3, 33 groups) cover the high-confidence slot where structural identity ≈ semantic identity. **Rollback path for post-1.4:** if a future audit cycle re-flags specific size=2 pairs as real dupes, point-fix them in a 1.4.x patch instead of resurrecting the bulk task. **If ever revisited (post-v1.5+):** explore-first sampling pass to compute true false-positive rate before any batch processing. Modified: `CHANGELOG.md`, `CHANGELOG.ru.md`. Decision id: #83.

- **Mass test parametrize, batch 2 (`v14c-mass-parametrize-batch-2`).** Consolidated dedupe groups #35-67 (size=3) from the 2026-05-07 audit into `@pytest.mark.parametrize` blocks across 22 test modules. Cross-file groups handled per-file (tests in the same file parametrized together; lone tests in a single file from a cross-file group left alone — can't parametrize a sample size of 1). Test count moved from 3355 → 3362 collected with batch-2 collapses (full-suite pytest: 3234 passed, 8 skipped, 120 deselected slow-lane in 103.82s). README badges (`README.md` + `README.ru.md`) and `docs/_generated/constants.json` regenerated to match. Ruff: 3 errors in tests/ pre-changes → 2 after (both pre-existing, untouched). Mypy: tests/ baseline 396 → 397 errors (delta +1 import-not-found from a new monkeypatch import — same pattern as existing tests, not a new violation class). Modified test files: `tests/test_audit_unused_python.py`, `tests/test_bootstrap_frontmatter.py`, `tests/test_bootstrap_generate.py`, `tests/test_brain_classifier.py`, `tests/test_brain_mcp_handlers.py`, `tests/test_brain_search.py`, `tests/test_cost_pricing.py`, `tests/test_cq_client.py`, `tests/test_edge_cases.py`, `tests/test_gen_doc_constants.py`, `tests/test_hooks.py`, `tests/test_hooks_common.py`, `tests/test_ide_utils.py`, `tests/test_project_mcp.py`, `tests/test_senar.py`, `tests/test_service_verification.py`, `tests/test_session_cleanup_check.py`, `tests/test_task_done_verify_hook.py`, `tests/test_tausik_service.py`, `tests/test_tool_output_truncation_nudge.py`, `tests/test_v131_blind_review.py`. Auto-generated: `docs/_generated/constants.json`. Doc badges: `README.md`, `README.ru.md`. Lone-in-file cross-file fragments (groups #35/36/43/45/64) kept as-is — flagged for batch-3 follow-up if dedupe is wanted at module level.

- **Gate B (sub-agent token remeasure): KEEP-pending-remeasure (`v14b-post-subagent-remeasure`).** Both sub-agents (`tausik-reviewer` + `tausik-gate-fixer`) confirmed staying in v1.4.0; the quantitative input-token reduction remeasure (AC-3 threshold: keep ≥15%, revert <15%) is **DEFERRED to post-1.4 telemetry sweep** because the prerequisite ≥10 sample sessions with sub-agents enabled have not yet accumulated in `.tausik/token_metrics.jsonl`. Decision #82 recorded via `tausik decide` with full rationale: (a) qualitative validation already in (smoke tests caught SQLi/cleartext-token in `/review`, valid JSON plan from `/debug` auto-helper), (b) `/review lite` is opt-in so the default 6-agent flow is unaffected, (c) <3KB definition files per sub-agent — carrying-forward cost is negligible, (d) reverting now would be more disruptive than waiting one telemetry cycle. Follow-up task `v14b-followup-subagent-remeasure-quant` created for post-1.4 quantitative sweep — when ≥10 sessions accumulate, that task runs `tausik metrics tokens`, computes reduction %, records FINAL Gate B decision, and triggers the 1.4.x revert recipe (`.claude/agents/*.md` removal + `/review` revert to inline) if reduction <15%. Modified: `CHANGELOG.md`, `CHANGELOG.ru.md`. Decision recorded: id #82.

### Fixed

- **Stress test `test_bulk_decisions` — local-DB assertion vs brain routing (`v14c-defect-bulk-decisions-stress`).**
  `tests/test_stress.py::TestStressMemory::test_bulk_decisions` was failing with `assert 1 == 300` — the loop inserted 300 decisions via `svc.decide(...)` but only 1 row landed in the local DB, and the run took ~270s. **Root cause:** the test was written before the brain integration (Epic v14-brain-snippets / `service_knowledge.decide`) added auto-routing. With brain enabled in real `.tausik/config.json` and a valid `NOTION_TAUSIK_TOKEN` in env, `svc.decide(text, rationale=...)` calls `brain_classifier.classify` → routes to brain → writes to Notion → SKIPS the local `decision_add`. So 299/300 calls wrote to Notion (not local), and ~1/300 occasionally fell back to local on transient brain failures (the surviving "Decision 25", id=1). The 270s runtime was 300 sequential Notion HTTP round-trips. The bulk-stress test was always meant to measure local SQLite throughput, not brain routing — the brain detour was an unintended side-effect of the routing feature landing in `decide`. **Fix:** monkeypatch `brain_config.load_brain` to return `{"enabled": False}` in the `svc` stress fixture (same pattern as `tests/test_service_knowledge_decide.py::svc`, which is the canonical guard for tests that don't want to touch live Notion). The stress fixture now forces local-only path, so all 300 inserts land in SQLite as the test assumed. Result: 270.10s → 0.21s (~1300× speedup), 300/300 rows asserted, 5 consecutive runs all green (no flakiness). Note: this is **not** a real bulk-insert bug — production behavior is correct (brain routing is the design); the test was outdated. The stress module already carries `pytestmark = pytest.mark.slow` (line 14), so this test is excluded from the default fast-lane and the drift slipped past CI default until the user ran the slow lane explicitly. Modified: `tests/test_stress.py` (svc fixture). Ruff clean; mypy errors match baseline (3 pre-existing import-not-found in this file via runtime sys.path — same pattern as `tests/test_service_knowledge_decide.py`, no new violations).

- **MCP test drift: `tausik_memory_archive` missing from skip_tools (`v14c-defect-mcp-tool-handler-drift`).**
  `tests/test_mcp_integration.py::TestMCPHandlerDispatch::test_every_tool_name_has_handler` was failing on `KeyError: 'before'` — the test loops every entry in `TOOLS` and dispatches to its handler with empty args, maintaining a `skip_tools` set for tools that legitimately require args (52 entries already). When `tausik_memory_archive` was added (handlers.py:501; tools.py:587 with `required: ["before"]`), the test wasn't updated to skip it. Production paths are unaffected — the MCP framework enforces the `required` schema before dispatch, and the CLI uses argparse with `--before` required at parse time, so neither agent nor user ever reaches the raw `KeyError`. The drift only surfaces in this test that bypasses both validation layers. Fix: one-line addition of `"tausik_memory_archive"` to the skip_tools set, alphabetically grouped with the other `memory_*` skips. Note: the test module carries `pytestmark = pytest.mark.slow` (line 12), so it's excluded from the default fast-lane and the drift slipped past CI default runs — caught only when the user ran the slow lane explicitly. Test now passes (`pytest -m "" tests/test_mcp_integration.py::TestMCPHandlerDispatch::test_every_tool_name_has_handler` → 1 passed in 1.95s). Modified: `tests/test_mcp_integration.py`. Ruff clean; mypy errors unchanged from baseline (11 pre-existing import-not-found / union-attr in this file, not introduced by the edit).

- **Model recommendation banner — drop incorrect `/fast` advice (`v14c-banner-fix-model-recommendation`).**
  Previous banner on `tausik task start` MISMATCH said `↪ switch to <model> via /fast or model picker for cost savings`. The `/fast` part is wrong — per Claude Code system prompt, `/fast` toggles fast-output on Opus 4.6 and does NOT downgrade to a smaller model. Following the wrong hint left the user/agent puzzled when `/fast` did nothing visible. Fix: replace the verdict line with `⚠ MODEL MISMATCH — recommended <model> for cost savings`, then append two clearly-labeled actionable hints — `ⓘ Mid-session switch: use the IDE model picker (Claude Code has no programmatic switch — `/fast` toggles fast-output on Opus only)` and `↪ Persist for next session: `tausik config set model_profile <slug>``. Module docstring (`scripts/model_routing.py`) updated to drop the `/fast` reference and document the IDE-picker reality. `bootstrap/bootstrap_templates.py` "Cost-aware model selection" paragraph rewritten the same way; `QWEN.md` synced (root `CLAUDE.md` / `AGENTS.md` / `.cursorrules` did not carry the buggy line). Test `tests/test_task_start_model_banner.py::TestFormatBanner::test_mismatch_loud_warning` updated — asserts on `IDE model picker` + `tausik config set model_profile` + slug instead of the literal `/fast`, plus a negative assertion that the wrong `switch to ... via /fast` substring is absent. Scoped pytest: model_routing + banner suite green. **Rationale for the rewrite over a quick edit:** the agent (not just the user) reads this banner — leaving a wrong "actionable hint" in machine-targeted output trains the model to suggest `/fast` to the user too. Modified: `scripts/model_routing.py`, `bootstrap/bootstrap_templates.py`, `QWEN.md`, `tests/test_task_start_model_banner.py`.

### Changed

- **Filesize debt paydown: `scripts/service_gates.py` 653 → 368 over
  three files (`v14b-service-gates-debt-paydown`).**
  Final filesize-debt candidate of the v1.4-tail thread (after
  `tools_extra` / `project_backend` / `bootstrap_copy` / `brain_init`).
  `service_gates.py` carried 253 lines over the 400-line gate. Split
  by responsibility, not line count (Pattern #91): the QG-0 Context
  Gate (`check_qg0_start` plus the `SECURITY_KEYWORDS` and
  `SECURITY_AC_KEYWORDS` keyword tuples it consults) extracted to a
  new `scripts/gate_qg0_check.py` (171 lines); the QG-2 acceptance-
  criteria, plan-completion, and SENAR Rule 5 checklist helpers
  (`verify_ac`, `verify_plan_complete`, `determine_checklist_tier`,
  `check_verification_checklist`) extracted to a new
  `scripts/gate_ac_check.py` (223 lines) as pure free functions that
  take the task dict and return warnings or raise `ServiceError`.
  Verify-pipeline + Verify-First Contract methods stayed in
  `service_gates.py` because they depend on `self.be._conn` /
  `self.be.task_append_notes`. `GatesMixin` keeps the same public
  method names (`_check_qg0_start`, `_verify_ac`,
  `_verify_plan_complete`, `_determine_checklist_tier`,
  `_check_verification_checklist`) — they're now 2-3 line delegators.
  `_check_qg0_start` threads optional `audit_check` /
  `session_check_duration` callbacks via `getattr(self, ..., None)`
  instead of the prior in-method `try/except (AttributeError, ...)`,
  so the pure function works outside `ProjectService` (e.g. on
  bare `GatesMixin` instances in unit tests). Backward compatibility
  preserved: `from service_gates import SECURITY_KEYWORDS`,
  `SECURITY_AC_KEYWORDS`, `has_negative_scenario`,
  `NEGATIVE_SCENARIO_KEYWORDS`, `qg0_dimensions_score`, and
  `check_qg0_start` all still work via `# noqa: F401` re-exports.
  Result: full pytest suite green (2889 passed / 7 skipped /
  120 deselected); 244 gate-related tests focused-pass; ruff + mypy
  clean across the three files; filesize gate PASS for
  `service_gates.py` (368 < 400) without exemption. The v1.4-tail
  filesize-gate `exempt_files` array stays empty — the entire debt
  thread is structurally clean.

- **Filesize debt paydown: `scripts/brain_init.py` 722 → 367 over four
  files (`v14b-followup-brain-init-filesize-debt`).**
  The brain init wizard module had a sticky 322-line filesize-gate
  exemption (entry in `.tausik/config.json` `gates.filesize.exempt_files`)
  ever since the v1.4 initial-discovery split landed `brain_discovery.py`.
  Paying it down without changing semantics meant carving up the wizard
  by responsibility, not by line count: schemas + Notion DB ops moved
  to a new `scripts/brain_init_schemas.py` (186 lines — `CATEGORIES`,
  `DB_TITLES`, four `_<category>_schema()` helpers, `_SCHEMAS` dispatch,
  `db_schema`, `PartialCreateError`, `create_brain_databases`,
  `verify_brain_databases`); the `--join-existing` branch + post-create
  config save migrated to `scripts/brain_init_join.py` (190 lines —
  `run_join_branch`, `_finalize_join`, full diagnostics for the
  integration-not-shared / non-canonical-titles cases); the
  `--force-create` / clean-workspace branch went to
  `scripts/brain_init_create.py` (138 lines — `run_create_branch`
  including parent_page_id / project_name prompts, registration,
  orphan-cleanup guidance for partial creates and post-create save
  failures). `brain_init.py` keeps the dispatcher: token resolution,
  `users.me()` pre-flight, workspace search, branch selection
  (Branch B/C refusals stay inline, Branch A/D delegate to the new
  modules), CLI IO classes (`WizardIO`, `ConfigOps`, `WizardError`,
  `CliIO`), shared helpers (`_print_orphan_cleanup_guidance`,
  `_has_existing_brain`, `_collect_explicit_join_ids`),
  `merge_brain_config`. All 19 public names that test code or other
  modules historically imported from `brain_init.*` (CATEGORIES,
  DB_TITLES, db_schema, create_brain_databases, verify_brain_databases,
  merge_brain_config, PartialCreateError, WizardError, WizardIO,
  ConfigOps, CliIO, run_wizard, _finalize_join, _has_existing_brain,
  _collect_explicit_join_ids, _print_orphan_cleanup_guidance,
  find_workspace_brain_databases, inspect_workspace_brain_databases,
  _extract_db_title) are re-exported via `# noqa: F401` so test code
  needs **zero** modifications. `import brain_project_registry` stays
  at module level in `brain_init.py` so the existing
  `monkeypatch.setattr(brain_init.brain_project_registry, ...)` call
  in `test_brain_init.py:559` keeps working — modules are singletons
  in `sys.modules`, so the patch propagates to `brain_init_create.py`
  through the same module object. Cycle is avoided by lazy imports of
  `run_join_branch` / `run_create_branch` inside `run_wizard`. Result:
  all 69 `tests/test_brain_init.py` cases green, plus 192 broader brain
  tests pass; ruff + mypy clean across the four files; filesize gate
  PASS for all four; `scripts/brain_init.py` removed from
  `.tausik/config.json` `gates.filesize.exempt_files` (dropped the
  string entry, leaving the array empty).

- **Filesize debt paydown: `bootstrap/bootstrap_copy.py` 420 → 311
  (`v14b-bootstrap-copy-debt-paydown`).**
  Skill-specific helpers (`parse_skill_frontmatter`,
  `validate_skill_frontmatter`, `_resolve_skill`, `_generate_stub`,
  `_load_registry`, plus `VALID_CONTEXT` / `VALID_EFFORT` constants)
  extracted to a new `bootstrap/bootstrap_skill_helpers.py` (139 lines).
  `bootstrap_copy.py` re-exports the names with `# noqa: F401` so all
  external imports keep working unchanged: `bootstrap.py` (uses
  `copy_skills` which closes over `_resolve_skill` via a local import),
  `scripts/skill_profile.py` (uses `parse_skill_frontmatter`),
  `tests/test_bootstrap_frontmatter.py` (uses both frontmatter
  functions), `tests/test_vendor.py`, `tests/test_v13_hardening.py`,
  `tests/test_copy_symlinks_disabled.py`. The `import re` import is
  also gone from `bootstrap_copy.py` — only the new helpers module
  needs it. Behaviour byte-for-byte identical: re-running
  `python bootstrap/bootstrap.py --ide claude --smart` against this
  repo produced zero `.claude/` diffs after the split. 76 bootstrap
  tests (frontmatter + vendor + non-destructive + symlink-disable +
  v13-hardening) green. Filesize gate clean for both files.

- **Filesize debt paydown: `scripts/project_backend.py` 403 → 327
  (`v14b-project-backend-debt-paydown`).**
  The 67-line `_init_schema` method (DDL bootstrap + version-guard +
  migration backup + FTS rebuild) extracted into a free function
  `init_schema(conn)` in a new `scripts/backend_init.py` (96 lines).
  `SQLiteBackend.__init__` calls it directly; the method is gone, no
  caller other than `__init__` ever referenced it. Behaviour byte-for-byte
  identical: same skip-DDL-on-current-version path, same `RuntimeError`
  on a newer-than-code on-disk schema, same idempotent `.bak.v<old>`
  backup before `run_migrations`, same FTS rebuild for
  `fts_{tasks,memory,decisions}`. The `shutil` + `run_migrations`
  imports moved to the new module — no longer referenced from
  `project_backend.py`. Full pytest 2889 passed (0 regressions).
  Ruff + mypy clean.

- **Preempt-split `harness/{claude,cursor}/mcp/project/tools_extra.py`
  (`v14b-tools-extra-preempt-split`).**
  The file was at 399/400 lines after the session-open compound RPC
  landed — one tool addition away from the filesize gate. Roles CRUD
  (`tausik_role_{list,show,create,update,delete,seed}`) and
  `tausik_stack_scaffold` extracted into a new
  `tools_extra_admin.TOOLS_EXTRA_ADMIN` list (admin / config-modifying
  tools, cohesive thematic group). `tools.py` imports both lists and
  extends `TOOLS` from each. After split: `tools_extra.py` 317 lines
  (was 399), `tools_extra_admin.py` 97 lines. Tool count unchanged
  (93 project + 7 brain = 100 total, sanity-checked: no duplicates, all
  7 admin tools resolvable post-split). Cursor mirror byte-identical.
  Bootstrap regenerates `.claude/mcp/project/tools_extra_admin.py`
  alongside the existing copy. Full pytest 2889 passed (mirror-sync
  tests `test_mcp_mirrors_in_sync` + `test_mirror_in_sync` initially
  failed pre-bootstrap, expected — re-run green after `.claude/` resync).

- **Source directory `agents/` renamed to `harness/` (`v14b-rename-harness`).**
  Eliminates the long-standing collision with Claude Code's native
  `.claude/agents/` namespace (sub-agent profiles). `git mv` preserves
  history; bootstrap scripts, doc strings, comments, tests, and CLI help
  text all updated to read from `harness/`. Clean break — no
  backward-compat alias for the old path. **Migration:** if you have a
  fork or local script that hardcodes the source path, replace
  `agents/skills/`, `agents/roles/`, `agents/stacks/`, `agents/{ide}/mcp/`,
  `agents/overrides/`, `agents/schemas/`, `agents/aidd-templates/` with
  the matching `harness/...` path. Three concepts are deliberately
  preserved as `agents/`: the host's `.claude/agents/` directory (Claude
  Code sub-agents), the vendor-skill `agents/` namespace inside vendor
  tarballs (still installs into the host's `.claude/agents/`), and the
  internal `harness/skills/review/agents/<name>.md` subfolder (parallel
  reviewer instructions inside the `/review` skill — distinct from
  framework-source `agents/`). Verified: full pytest 2812 passed,
  `tausik doctor` clean, bootstrap dry-run + real run regenerate
  `.claude/`, `.cursor/`, `.qwen/` from `harness/` cleanly.

### Changed

- **Dedupe `.tausik/config.json` path construction (`v14b-review57-followups` M2).**
  New helper `tausik_utils.tausik_config_path(project_dir)` is the single
  source of truth, replacing 8 inline `os.path.join(project_dir, ".tausik", "config.json")`
  call-sites across `bootstrap/bootstrap.py`, `bootstrap/bootstrap_modes.py`,
  `harness/{claude,cursor}/mcp/project/handlers.py` (cq-client lookup),
  `harness/{claude,cursor}/mcp/project/handlers_skill.py` (`_skill_paths`),
  `scripts/project_cli_extra.py`, and `scripts/hooks/session_cleanup_check.py`.
  A regression test (`tests/test_tausik_utils.py::test_no_inline_duplicates_in_production`)
  scans `scripts/`, `harness/`, `bootstrap/` and fails on any future
  inline rebuild.

- **`/start --brain` opt-in primer documents the `brain.ignored:` filter
  (`v14b-review57-followups` M1).** `harness/skills/start/SKILL.md` now
  tells agents to skip page ids that appear in
  `tausik_memory_list type=convention` with title prefix
  `brain.ignored:` — the same dismissal mechanic /task and /plan already
  honour. A regression test in `tests/test_tausik_utils.py` keeps this
  pointer present.

  /review session #57 L1 (preempt-split `scripts/project_cli_extra.py`
  before it crosses the 400-line filesize gate) is a no-op: the file
  measured 353 lines at follow-up time — well under threshold.

### Added

- **Structured `--evidence-json` for `task done` (`v14b-token-t15-evidence-json`).**
  New flag accepts agent-supplied JSON: `{"ac_evidence":[{"n":1,"status":"pass","evidence":"tests/foo.py::test_bar"}, ...]}`
  with optional `manual` / `negative` flags per item. The new helper
  `service_ac_evidence.evidence_json_to_prose()` converts JSON to the
  canonical "AC verified: 1. ✓ ..." prose form, which then flows
  unchanged through the existing `task_log` + `service_ac_evidence`
  parser pipeline. Mutually exclusive with `--evidence` (argparse
  enforces at the CLI; `_task_done_report` re-checks for MCP callers).
  MCP tool `tausik_task_done` gains an `evidence_json` arg with the
  same semantics; backward-compat is full — prose `--evidence` /
  `evidence` continues to work as before. Tests in
  `tests/test_ac_evidence_json.py` — 19 cases (5 positive incl.
  3-AC round-trip, 12 negative incl. malformed JSON / missing keys /
  invalid status / `n` as bool, 1 SQL-payload safety, 1 service-layer
  mutex).

- **AIDD project scaffold (`v14b-aidd-scaffold-basic`).** New CLI subcommand
  `tausik init --template aidd` copies three layered templates —
  `idea.md`, `vision.md`, `conventions.md` — from `harness/aidd-templates/`
  into the current project root. Conflict detection: each existing
  file triggers a 4-option prompt (overwrite / merge-append / skip /
  abort-all); empty input or unknown choice defaults to skip with a
  warning. `--force` bypasses prompting and overwrites every conflict.
  `merge-append` preserves the user's existing content and appends the
  template under a `<!-- merged from AIDD template -->` marker. New
  `scripts/project_cli_aidd.py` module (handler), `scripts/project_parser.py`
  + `scripts/project_cli.py` extended with `--template` / `--force`.
  v1.5 follow-ups recorded as stories under epic `v15-cross-ide-parity`:
  `v15-aidd-autogen` (autogen `vision.md` from existing code) and
  `v15-aidd-ai-validation` (drift detection between AIDD layers and
  shipped code). Tests (`tests/test_aidd_scaffold.py`): 14 cases —
  resolve-choice mapping (empty / first-letter / unknown), template-name
  whitelist, scaffold scenarios (clean dir, partial conflict, full
  conflict default-skip, `--force` overwrites all without prompt,
  explicit `o` / `m` choices, `abort-all` short-circuits remaining files),
  CLI dispatch (unknown template → exit 2 + stderr; happy path → exit 0).
  Smoke-tested end-to-end via `python scripts/project.py init --template aidd`
  in a clean tmp dir. Docs: `docs/en/cli.md` + `docs/ru/cli.md` document
  the new flags and conflict-prompt semantics.

- **Prompt-caching validation script + docs (`v14b-token-t13-prompt-caching-docs`).**
  New `scripts/validate_prompt_caching.py` parses a Claude Code transcript
  JSONL (`--auto` finds the latest, or pass an explicit path) and reports
  `cache_creation_input_tokens`, `cache_read_input_tokens`, hit rate, and a
  classification: exit 0 = caching active, 1 = prefix unstable (creation
  but no reads), 2 = API never returned cache fields, 64 = bad CLI / file
  not found. New `docs/{en,ru}/architecture.md` "Prompt Caching" section
  enumerates the cacheable surface (system prompt + tool schemas, CLAUDE.md,
  MCP tool descriptions, SKILL.md) and the invalidators (chiefly
  `tausik_update_claudemd` mid-session). New `docs/{en,ru}/troubleshooting.md`
  "Prompt caching not active" entry maps low / zero hit-rate symptoms to
  causes (third-party wrapper not sending `cache_control`, mid-session
  CLAUDE.md edit, agent artifacts edited in worktree). Hard prerequisite
  for `v14b-baseline-token-metrics` — that task measures tokens, this one
  pins down whether the measurement is coming from a stable cache regime
  or a noisy one. Tests: `tests/test_validate_prompt_caching.py` covers
  the parser (extracts both fields, handles missing fields, top-level
  vs nested usage, blank lines, explicit-zero cache field still counted),
  the classifier (3 exit-code states), and CLI dispatch (missing file,
  no args, active-cache happy path). 11 tests pass; mypy clean.

### Changed

- **Session active-time switched from "exclude" to "clip" semantics
  (`v14b-session-active-time`).** `compute_active_minutes` (and the new
  `compute_active_seconds` companion) used to drop any inter-tool-call
  gap ≥ `idle_threshold` from the active sum (gap → 0 contribution). The
  bounded-deltas intent in SENAR Rule 9.2 was always "each gap counts
  for at most threshold seconds", so a multi-day session that briefly
  works once a day would otherwise log near-zero active time and never
  trip the 180-min limit. v1.4 polish flips the SQL CASE branch from
  `THEN 0` to `THEN ?` (clipped to `idle_threshold_seconds`): a long
  AFK now contributes exactly `idle_threshold` (default 600 s / 10 min)
  to the active sum. Sub-minute precision exposed via
  `backend_session_metrics.compute_active_seconds`,
  `service_session_metrics.session_active_seconds`,
  `ProjectService.session_active_seconds`, and a new `active_seconds`
  field in both `tausik_status` MCP responses (claude + cursor handlers)
  alongside the existing `active_minutes`. `recompute_all_sessions`
  now also returns `active_seconds` per row. **Behavior change:**
  sessions that previously logged a 0-min "long AFK gap" will now
  show `~10 min` more active each — Rule 9.2 will now correctly enforce
  the 180-min budget on sessions that were previously under-counted.
  Tests: `test_backend_session_metrics::TestComputeActiveSeconds` adds
  9 cases covering AC scenarios (a) short session, (b) 30-min gap clipped,
  (c) 180-min triggers warning, plus negative scenarios (no events,
  long AFK keeps active low, non-monotonic timestamps best-effort,
  sub-minute precision, minutes-wrapper rounding). Existing
  `test_gap_above_threshold_excluded` renamed `_clipped_not_excluded`
  with assertion flipped from 10 → 20 min. `test_custom_threshold` updated:
  threshold-bound gap now contributes the threshold value (5 min), not 0.
  Docs: `docs/{en,ru}/session-active-time.md` rewritten around clip
  formula `Σ min(Δ, idle_threshold)`; `senar-compliance-matrix.md`
  + `agent-contract.md` (RU) Rule 9.2 row updated. 24 backend-metric
  tests + full fast lane pass.

- **`tausik_task_done_v2` MCP tool dropped — single `tausik_task_done`
  returns the structured JSON dict
  (`v14b-task-done-rename-drop-v2`).** The interim `_v2` alias added in
  1.3.7 (when the structured-JSON contract was being proven out) caused
  ongoing confusion: skills shipped fallback prose ("call v2; if absent,
  fall back to v1"), `/troubleshooting.md` had a whole "v2 vs v1" entry,
  and the PostToolUse matcher carried both names. Consolidation: the
  single MCP tool is `tausik_task_done` and it always returns the
  structured-response dict (`ok`, `gates`, `blocking_failures`,
  `cache_status`, …). Internal: `service_task.py::task_done_v2` method
  removed; the str-returning `task_done()` wrapper kept for the CLI
  command (`scripts/project_cli.py`) — backward compatible there.
  `agents/{claude,cursor}/mcp/project/handlers.py::_do_task_done` now
  calls `_task_done_report()` directly and JSON-encodes; `_do_task_done_v2`
  removed from both handlers and the `_DISPATCH` table; `tools.py` drops
  the duplicate `tausik_task_done_v2` tool definition (project tool count:
  93 → 92, total with brain: 100 → 99). `bootstrap_hooks.py` PostToolUse
  matcher: `tausik_task_done|tausik_task_done_v2` → `tausik_task_done`.
  `scripts/hooks/_common.py::_TASK_DONE_TOOL_NAMES` simplified to the two
  canonical forms only. Tests: `tests/test_task_done_v2_matcher.py` →
  renamed `test_task_done_matcher.py`, asserts no `_v2` alias remains;
  `test_project_mcp.py::test_task_done_v2_returns_structured_json` →
  `test_task_done_returns_structured_json` against the canonical name;
  `test_mcp_integration.py` and `test_verify_first_contract.py` updated.
  Skills (`/task`, `/ship` SKILL.md + variants/{haiku,sonnet}.md) drop
  the "fall back to legacy v1" guidance; docs (`mcp.md`, `troubleshooting.md`,
  `quickstart.md`, `hooks.md` EN+RU + AGENTS.md + QWEN.md + READMEs)
  scrubbed of `_v2` mentions and tool counts updated (100 → 99,
  107 → 106 with codebase-rag). **Breaking** for any agent or third-party
  tool that called `mcp__tausik-project__tausik_task_done_v2` directly —
  switch to `mcp__tausik-project__tausik_task_done` (same input schema,
  same structured-JSON return). Tests: 2741 passed, 7 skipped, 118 deselected.

### Fixed

- **Verify-First STRICT vs relaxed asymmetry between `has_fresh_verify_run`
  and `run_gates_with_cache` (`v14b-verify-first-relaxed-symmetry`,
  gotcha #111).**
  `service_verification.run_gates_with_cache` already accepted the
  one-direction relaxed match (Sharp edge #2: `tausik verify` ran with
  `files=[]` manual scope, follow-up `task done` arrives with explicit
  `relevant_files`), but `verify_cache.has_fresh_verify_run` — used by
  the QG-2 verify-first guard in `service_gates._enforce_verify_first` —
  did STRICT lookup only. Result: `task done <slug> --relevant-files
  scripts/foo.py` against a fresh `tausik verify --task <slug>` (no
  `--relevant-files` arg) returned `cache_status='git-mismatch'` even
  though heavy gates had just passed. Surfaced in three sessions before
  the structural fix. `has_fresh_verify_run` now mirrors the relaxed
  fallback after a strict miss: accepts a fresh exit-zero verify-trigger
  row with `files=[]` in the recorded command, rejects rows that named
  specific files (reverse direction stays strict so mtime / gate-signature
  invalidation keeps working) and rejects task-done-bucket rows
  (cache-bucket separation contract preserved). Security-sensitive paths
  are short-circuited by the existing `is_cache_allowed` check — never
  reach the relaxed branch.
  `verify_recent_lookup.lookup_any_fresh_run_for_task` gains an optional
  `command_prefix` parameter so the trigger filter applies in SQL — without
  it, an interleaved task-done bucket row between `tausik verify` and the
  follow-up `task done` would shadow the verify row by having a higher
  id under `ORDER BY id DESC LIMIT 1` (exact failure mode hit during
  dogfood verification of this fix).
  Tests: `tests/test_verify_cache.py` (9 cases —
  manual→explicit accept incl. multi-file, strict-priority-over-relaxed,
  reverse-direction reject, interleaved-bucket-shadowing, security
  short-circuit incl. strict row, no-row miss, red-row miss). Full
  pytest 2889 passed (was 2880, +9 new, 0 regressions).

- **Brain `--join-existing` discovery missed renamed databases
  (`v14b-defect-brain-enable-no-discovery`).**
  `find_workspace_brain_databases` matched candidate Notion databases
  exclusively by exact title equality with `DB_TITLES`
  (`Brain · Decisions / Web Cache / Patterns / Gotchas`). When the four
  BRAIN databases existed under any other title — UI rename, emoji
  prefix, translation, or because they were created outside the wizard
  with category-only names (`decisions` / `web_cache` / `patterns` /
  `gotchas`) — discovery returned `{}` and the wizard surfaced the
  misleading "integration not shared with the BRAIN page" error even
  when the integration could see the databases just fine.
  Discovery is now two-pass: title-match first (unchanged happy path,
  zero extra API calls), then a schema-fallback pass that scans
  unassigned visible databases and assigns the first one whose Notion
  `properties` contain the per-category required set. Discovery now
  also issues `search()` without `query="Brain"` — that pre-filter
  silently dropped databases without that word in the title. Branch A
  of `run_wizard` calls a new `inspect_workspace_brain_databases()`
  helper when discovery returns 0 hits and renders an enriched
  `WizardError` listing the visible candidates (id, title, parent
  page) plus two paths forward (rename canonically, or pass IDs
  explicitly), so users can self-diagnose without re-reading the
  source. The "integration not shared" message is preserved for the
  visible-zero case where it is still the right diagnosis.
  Discovery extracted to `scripts/brain_discovery.py` to keep
  `brain_init.py` focused. Tests: 69 passing in `tests/test_brain_init.py`
  (10 new — schema-fallback positive, mixed title+schema, schema
  conflicts, enriched error, share-via-Connections regression).
  Live evidence on this project: 4 dbs titled `decisions` / `web_cache`
  / `patterns` / `gotchas` (no `Brain ·` prefix) auto-discovered via
  `via=schema`, identical IDs to those previously wired by hand.

- **Token metrics never wrote in production
  (`v14b-defect-token-metrics-no-realworld-write`,
  defect_of=`v14b-baseline-token-metrics`).** `.tausik/token_metrics.jsonl`
  silently stayed empty across every real session because the original
  PostToolUse hook (`scripts/hooks/token_metrics.py`) read
  `tool_response.usage` from the harness payload — a field Claude Code
  never populates per-tool-call (token usage is message-level only). The
  hook was unit-tested against synthetic payloads that fabricated the
  field, so CI green and production silent. Per decision #61, capture
  moved to the existing SessionEnd transcript-parser
  (`scripts/hooks/session_metrics.py`): new `extract_token_rows` walks
  each assistant entry, splits message-level `usage` evenly across
  `tool_use` blocks (last block absorbs the integer-division remainder
  to keep totals exact), and `append_token_rows` writes the same
  schema `service_token_metrics.aggregate()` already consumes. The
  broken PostToolUse hook is removed from `bootstrap/bootstrap_hooks.py`
  + `bootstrap/bootstrap_qwen.py`; `scripts/hooks/token_metrics.py`
  remains as a no-op stub so live IDE instances with stale hook config
  don't error before restart (delete after IDE restart). Tests: 26
  cases in rewritten `tests/test_token_metrics.py` (aggregator, row
  extractor, appender, session_id resolver, end-to-end). End-to-end
  verification: ran on the live transcript of session #55 and got 73
  rows across 22 tools, `tausik metrics tokens` rendered the table
  correctly with cache_read dominating input_tokens (expected under
  prompt caching).
- **`tausik_self_check.sibling_mcp_count` chronic +1 false-positive on
  Windows venv (`v14b-defect-mcp-self-check-venv-launcher`,
  defect_of=`v14b-mcp-stale-module-detector`).** Every IDE restart left
  `sibling_mcp_count=1` even on a clean machine, repeatedly nudging the
  user toward "Restart your IDE" — the same symptom we'd been treating
  as real for sessions #49/#50/#51. Root cause: on Windows
  `venv\Scripts\python.exe` is a launcher SHIM that re-execs the real
  interpreter (`C:\Python311\python.exe`) as a CHILD process while
  keeping the same `CommandLine`; the parent therefore matches the same
  `mcp/project/server.py --project <project>` filter as the child and
  gets counted as a "sibling MCP". POSIX rarely shows this shape (venv
  resolves the real interpreter PID directly), but the guard is uniform.
  Fix: `_enumerate_sibling_mcps` captures `os.getppid()` at entry and
  excludes that PID from every introspection backend (wmic, PowerShell
  `Get-CimInstance`, `/proc` walk, `ps -A` fallback). Mirrored to
  `agents/cursor/mcp/project/self_check.py`. Regression test:
  `tests/test_mcp_self_check.py::test_enumerate_excludes_parent_pid_venv_launcher`
  mocks the PowerShell branch with three rows (parent + self + real
  sibling) and asserts only the real sibling is counted. Pre-existing
  6 self-check tests + the 2 windows-fallback tests unchanged. Project
  memory: gotcha #87 already documents the venv-launcher mechanism.
- **MCP `task_done_v2` 10-second silent hang — root cause after 5-day
  investigation (`v14b-defect-mcp-task-done-stdin-hang`).** `tausik_task_done_v2`
  consistently spent ~10s in the cache-lookup path before returning, observed
  for sessions #47–#51 across multiple users. Prior fixes (`tausik_self_check`
  diagnostics in `v14b-mcp-stale-module-detector`, wmic→PowerShell fallback in
  `v14b-defect-mcp-self-check-windows-fallback`) treated peripheral symptoms —
  none caught this real cause. Root cause traced via in-MCP timing probes:
  `is_declared_consistent_with_git_diff` in `scripts/verify_git_diff.py` calls
  `subprocess.run(["git", "log", "--since=...", ...], capture_output=True,
  timeout=10)` and `git diff --name-only HEAD`. `subprocess.run` with
  `capture_output=True` does NOT redirect stdin — the child inherits the
  parent's stdin. Inside the MCP project server's `asyncio.to_thread` worker,
  stdin IS the JSON-RPC pipe to the IDE. On Windows, git blocks reading from
  that pipe (paginator probe / credential prompt detection / generic stdin
  handling) until the 10s timeout fires; the except branch then defensively
  returns `None` and `is_declared_consistent_with_git_diff` returns `True`
  (its "git failed → assume cache OK" fallback), masking the hang as a
  successful-but-slow `cache_status=hit`. Fix: add `stdin=subprocess.DEVNULL`
  to the affected `subprocess.run` calls. Empirical measurement: MCP
  `task_done_v2` dropped from 10031ms to 63ms — **159× speedup** — in an
  end-to-end JSON-RPC harness against a fresh MCP server. Patched files:
  `scripts/verify_git_diff.py` (both git probes), `scripts/project_service.py`
  (session_metrics spawn), `scripts/project_cli_extra.py` (git branch detection),
  `scripts/skill_manager.py` (git pull, git clone, pip install). All four are
  reachable from the MCP project server's worker thread. Tests:
  `tests/test_verify_git_diff_stdin.py` (NEW) asserts `subprocess.run` is
  invoked with `stdin=subprocess.DEVNULL` on both git probes — protects
  against regression. Project memory: gotcha #88 documents the rule
  ("subprocess.run inside MCP worker MUST pass `stdin=subprocess.DEVNULL`")
  and detection recipe (grep for `subprocess\.(run|Popen)\(` lacking `stdin=`,
  triage by reachability from MCP handlers). Decision #56 sets the convention
  project-wide. **Lesson** (saved as gotcha): diagnostic toolchains can mask
  bugs that look like timeouts — when a 10s ceiling is suspicious, audit for
  defensive except-branches that swallow `subprocess.TimeoutExpired`.
- **Brain-enabled-but-misconfigured silent fallback
  (`v14b-defect-brain-decisions-empty`).** When `.tausik/config.json` had
  `brain.enabled=true` but `database_ids` were empty (or token env unset),
  `tausik_decide` silently fell back to local SQLite with a quiet "brain
  write failed: config_error: brain.database_ids.decisions is empty"
  reason. Users accumulated local-only decisions that should have been
  mirrored to Notion without realising their brain config was broken. Root
  cause: `brain_config.validate_brain()` existed and detected the issue,
  but no production code called it — only tests. Fix: (1)
  `service_knowledge.decide()` now invokes `validate_brain()` before any
  brain write attempt; on validation errors it still saves the decision
  locally (data preservation) but returns a LOUD multi-line warning
  prefixed with `⚠ Decision #N saved LOCALLY ONLY — brain mirror BLOCKED`,
  enumerates each config error, and gives explicit fix paths (`tausik
  brain init` OR `brain.enabled=false`) plus a `tausik brain move
  --to-brain` migration hint for accumulated local-only decisions. (2)
  `tausik doctor` gains a `Brain config` health row that surfaces
  `validate_brain()` errors at health-check time so misconfiguration is
  visible before the user makes any decisions. Tests:
  `tests/test_service_knowledge_decide.py` +1 case
  (`test_brain_enabled_with_empty_database_ids_returns_loud_warning`);
  three existing brain-enabled tests now also patch `validate_brain` to
  return `[]` (testing the post-validation path). One-time gap: existing
  local-only decisions from this defect are not auto-migrated — fix the
  config, then run `tausik brain move --to-brain` per decision (or per
  category) to backfill Notion.
- **Self-check sibling enumeration on Windows 11 24H2+ + remediation
  false-positive on `count=-1` (`v14b-defect-mcp-self-check-windows-fallback`,
  defect_of=`v14b-mcp-stale-module-detector`).** First live run of
  `tausik_self_check` on a Win 11 build 26200 host returned
  `sibling_mcp_count=-1` with `wmic introspection failed: WinError 2` —
  Microsoft removed `wmic.exe` from the modern Windows base image. The
  `collect()` remediation logic also conflated `count=-1` (introspection
  unavailable) with `count>0` (real sibling leak), so a healthy server on a
  modern Windows host would falsely scream "Restart your IDE". Two fixes:
  (1) `_enumerate_sibling_mcps` Windows branch now tries `wmic` first
  (legacy compat) and on `FileNotFoundError` falls through to PowerShell
  `Get-CimInstance Win32_Process` via `subprocess.run(['powershell',
  '-NoProfile', '-NonInteractive', '-Command', '<query>'])` parsing
  `pid|cmdline` lines; if PowerShell is also missing the error preserves
  that fact rather than overwriting it. (2) Remediation now distinguishes
  three states: drift OR `count>0` → "Restart IDE"; `count=-1` → "MCP
  modules in sync (drift check passed). Sibling-MCP check unavailable on
  this host"; clean → "no action needed". Tests:
  `tests/test_mcp_self_check.py` +2 cases (`test_remediation_silent_when_count_unknown`,
  `test_remediation_fires_on_real_drift`); existing 6 cases unchanged.
  Mirrored to `agents/cursor/mcp/project/self_check.py`.

### Added

- **Stale MCP module detector — root fix for silent task_done_v2 / verify
  hangs (`v14b-mcp-stale-module-detector`).** New MCP tool
  `tausik_self_check` returns the running MCP project server's startup
  time, a snapshot of watched-module mtimes captured at boot vs the
  current on-disk mtimes, a `drift_detected` flag, the list of stale
  modules (with `delta_seconds`), and `sibling_mcp_count` — the number of
  other MCP project servers running for the same project (window-leak
  signal). Watch list covers the service-layer modules that have caused
  hangs in the past: `service_verification`, `verify_cache`,
  `security_pattern`, `gate_runner`, `gate_command_runner`,
  `service_gates`, `service_task`, `project_service`, `project_backend`,
  `handlers`, `handlers_skill`. The watcher is implemented in a new
  `agents/claude/mcp/project/self_check.py` that eager-imports the watch
  list at MCP startup so the snapshot reflects what the server will
  actually call into later (lazy-imported modules would otherwise match
  current mtime by definition and mask drift). `/start` skill Phase 1 now
  calls `tausik_self_check` in the parallel batch; Phase 3 renders a
  prominent `⚠ MCP Health` block when drift or sibling MCPs exist, with
  `Restart your IDE` remediation. Companion to gotchas #77 (`tausik_verify`
  hang after editing `service_verification.py`/`gate_runner.py`), #79
  (`task_done_v2` hang on large evidence), #80 (root cause). Tests:
  `tests/test_mcp_self_check.py` (NEW, 6 cases — startup snapshot
  populated; no drift on unchanged tree; drift surfaces when mtime
  advances ≥30 s; missing files don't crash; sibling enumeration returns
  int (≥-1) without raising; handler returns valid JSON envelope). Docs:
  `docs/{en,ru}/mcp.md` registers the tool; `docs/{en,ru}/troubleshooting.md`
  gains a `Stale MCP modules (silent hangs)` section pointing at the
  remediation flow.

- **Skill core cleanup — bootstrap default = 12 + brain conditional
  (`v14b-skill-core-cleanup`).** Bootstrap previously auto-deployed all
  13 source skills plus every entry in `skills-official/registry.json`
  (~38 skills total → ~1,520 tokens in the system-reminder list every
  turn). v1.4.x default now ships **12 core skills** (`/start`, `/end`,
  `/checkpoint`, `/plan`, `/task`, `/ship`, `/commit`, `/review`,
  `/test`, `/debug`, `/explore`, `/interview`) plus `/brain`
  *conditionally* — only when `bootstrap_config.is_brain_enabled(cfg)`
  resolves to true (project has `brain.notion_db_ids` populated by
  `tausik brain init`). Empirical token impact: **−1,040 tokens/turn
  (−68%)** on the system-reminder skill list. Two new bootstrap flags
  bring back the v1.3.x set when needed: `--include-official` (full
  registry stubs) and `--include-vendor` (alias for symmetry with the
  vendor-skill terminology). `_profile-demo` stays in `agents/skills/`
  as an underscore-prefixed reference fixture (already filtered by
  bootstrap). `tausik status` now prints a one-line warning if the
  deployed skill set diverges from the flag (e.g. 38 deployed without
  `--include-official`) so unintended bloat doesn't go unnoticed.
  Negative tests pin the edge cases: `.tausik/config.json` missing or
  corrupt → brain skipped without crash; `installed_skills` config
  entries deploy regardless of the default; underscore-prefixed names
  in `installed_skills` get filtered. Source files: `bootstrap.py`,
  `bootstrap_config.is_brain_enabled`, `bootstrap_copy.copy_skills`
  (gated `builtin_names` loop + opt-in registry stubs),
  `project_cli._maybe_print_skill_set_warning`. Tests:
  `tests/test_bootstrap_skills_coverage.py` (8 cases, including 4
  negatives). Docs: `docs/{en,ru}/skills.md`,
  `docs/{en,ru}/architecture.md`, `README.md` + `README.ru.md` (new
  `## Token Efficiency` section before `## Functionality`).

### Added

- **Filesize debt paydown (`v14b-filesize-debt-paydown`).** Four
  oversized modules split into focused submodules; the
  `.tausik/config.json` `gates.filesize.exempt_files` list is now empty.
  Concrete moves:
  - `scripts/backend_queries.py` 536→397: usage_events / session_usage_metrics
    methods (`usage_event_append`, `session_usage_record`,
    `usage_events_cost_rollup_by_task`, `session_usage_summary`) extracted to
    new `scripts/backend_queries_usage.BackendQueriesUsageMixin`;
    `BackendQueriesMixin` inherits from it so the public surface on
    `SQLiteBackend` is unchanged.
  - `scripts/service_verification.py` 464→345: security pattern classifier
    (`is_security_sensitive` + `_SECURITY_PATH_TOKENS` / `_SEC_BASE` /
    `_SECURITY_BASENAMES` / `_SECURITY_EXTENSIONS`) extracted to
    `scripts/security_pattern.py`; cache helpers (`is_cache_allowed`,
    `resolve_gate_signature`, `_build_cache_command`, `has_fresh_verify_run`)
    extracted to `scripts/verify_cache.py`. Both names re-exported from
    `service_verification` so all existing imports keep working.
  - `scripts/gate_runner.py` 476→394: `run_command_gate` +
    `_SCOPED_SKIP_SENTINEL` (including the v14b TAUSIK_VERIFY_FULL injection)
    extracted to `scripts/gate_command_runner.py`; re-exported from
    `gate_runner` so `tests/test_gates.py` and other callers keep working.
  - `bootstrap/bootstrap_generate.py` 433→223: the giant settings hooks
    block extracted to `bootstrap/bootstrap_hooks.build_hooks_dict(_hook_cmd)`.
    `generate_settings_claude` now reads as the lean config builder it was
    always meant to be.
  Smoke test pins backwards compatibility: `tests/test_filesize_split_smoke.py`
  imports every moved symbol from its ORIGINAL module and asserts identity
  with the new location, plus a settings.json hooks-shape contract test
  that mirrors the existing per-hook coverage assertions.

### Added

- **Pytest fast lane (`v14b-pytest-fast-lane`).** Default pytest
  configuration in `pyproject.toml` now skips tests marked
  `@pytest.mark.slow` (`addopts = "-m 'not slow'"`). Heavy tests —
  bootstrap real/dryrun + skills coverage, MCP integration & project
  server, brain MCP handlers + installed-layout, stress (1000 tasks /
  100 sessions), bootstrap venv, RAG FTS5 benchmarks, Tausik CLI
  smoke, skill CLI help, model-profile bootstrap variants — and a
  single 7 s `posttool_usage_hook` lock-contention case carry the
  marker. Empirical impact on the TAUSIK repo: full suite went from
  **731 s (12:11) to 99 s (1:39)** — **7.4× speedup**, 118 tests
  deselected from the fast lane. Three escape hatches when the full
  battery is needed: `pytest --override-ini='addopts='`, `pytest -m ''`
  (or `-m 'slow'` for nightly), and the new
  `TAUSIK_VERIFY_FULL=1` env var that `gate_runner.run_command_gate`
  picks up to inject `--override-ini=addopts=` into the pytest gate
  command. Only the pytest gate is affected — other gates (ruff, mypy,
  filesize) are untouched. Tests cover the env-var injection path,
  the no-op for non-pytest gates, and the default unchanged-cmd case
  (`tests/test_gates.py:TestRunCommandGate`). Docs updated in
  `docs/{en,ru}/cli.md`.

### Fixed

- **CLAUDE.md size cap regression
  (`claude-md-trim-reference-line-fix-test-claude-md-s`).** The Reference
  line was extended in handoff #45 to keep three T2.2 drift tests green; that
  push spilled the static portion to 4113 B over the 4096 B cap enforced by
  `tests/test_claude_md_size.py::test_claude_md_static_under_size_cap`. Trimmed
  the prose without losing the `agent-contract.md` pointer or the anchor
  keywords (`estimation`, `SENAR matrix`, `roles`, `custom_stacks`, `QG-2`).
  All four CLAUDE.md tests now PASS.

- **QG-2 verify-first false-positive on hook/session files
  (`v14b-defect-qg2-security-substring-too-broad`).** `is_security_sensitive`
  in `scripts/service_verification.py` previously matched bare substrings
  ("session", "login", "signup", "scripts/hooks/", ...) which classified
  every TAUSIK harness hook (`scripts/hooks/session_start.py`,
  `posttool_usage.py`, `keyword_detector.py`, ...) and every hook test
  (`tests/test_session_start_hook.py`, `tests/test_session_metrics.py`)
  as security-sensitive. That set `is_cache_allowed=False`, so
  `has_fresh_verify_run` returned `(False, None)` and `_enforce_verify_first`
  blocked `task_done` with "no fresh verify run" even immediately after a
  green `tausik verify`. Hooks are infra, not auth surface. The fix
  narrows `_SECURITY_PATH_TOKENS` to directory-anchored entries only
  (`/auth/`, `/oauth/`, `/payment/`, `/webhook/`, …), drops bare
  substrings, and replaces the loose "session" / "login" basenames with
  explicit ones (`session_token.py`, `login_handler.py`, etc.).
  `_SECURITY_BASENAMES` now also covers `secrets.json`, `credentials.json`,
  `.npmrc`, `id_rsa`, `id_ed25519`. Full contract written into the
  `is_security_sensitive` docstring. New
  `tests/test_security_sensitive.py` (70 cases) pins both true-positive
  and false-positive sets, plus a regression case that records a green
  verify run on a hook file and asserts `has_fresh_verify_run` returns
  `(True, row)` — the exact failure mode that blocked the
  `v14b-rag-first-nudges` close. Audit of `verification_runs` showed only
  one task affected historically (the parent task that surfaced the bug);
  no re-verification needed.

### Added

- **RAG-first nudges (`v14b-rag-first-nudges`).** Skills `start`, `task`,
  `debug` now carry a "Code search hierarchy" section pointing the agent at
  `mcp__codebase-rag__search_code` as the first choice for symbol/pattern
  lookup, with `Grep`/`Read` reserved for known file paths. Skill `explore`
  rewrites step 3 to start every investigation with `search_code` over
  ranked chunks before reading whole files. The SessionStart hook
  (`scripts/hooks/session_start.py`) strengthens the auto-injected RAG
  summary with the explicit MCP tool name and adds a Reminders bullet
  ("Use `search_code` (RAG) before Grep/Read for unfamiliar code"). The
  Stop hook (`scripts/hooks/keyword_detector.py`) gains a second detector:
  when the user's last prompt contains code-discovery intent ("where is X"
  / "find Y" / "how does Z work" / "где определ…") and the agent's reply
  did not mention `search_code`, the hook blocks the stop with a
  rag-first recommendation. Drift guard keeps precedence; the loop-safe
  `stop_hook_active` short-circuit covers both detectors. Tests:
  `tests/test_keyword_detector_hook.py` (+8 cases for the new detector,
  including precedence and suppression-when-already-used),
  `tests/test_session_start_hook.py` (+1 case for the rag-first reminder).
- **Per-task token attribution (`v14b-usage-events-auto-write`).** New
  PostToolUse hook `scripts/hooks/posttool_usage.py` writes one
  `usage_events` row per tool call, attributed to the active task.
  Schema migration v24 adds `usage_events.tool_name` and extends
  `source` CHECK to include `posttool`. Pricing logic moved to a shared
  `scripts/cost_pricing.py` module — single source of truth for both
  the new hook and the existing `session_metrics.py` SessionEnd writer.
  Five graceful-degradation paths covered by tests (malformed stdin,
  no active task, unknown model, locked DB retry, missing
  `.tausik/tausik.db`). Docs: `docs/{en,ru}/cost-telemetry.md`.

## [1.4.0] — 2026-05-02 — Verify-First Contract + 1.4 epic batch

> Public-readiness release driven by a 1.4 audit and a 10-epic master
> plan (research artifacts removed pre-release; see commit history).
> Headline change: heavy verification (pytest, tsc, cargo, phpstan, …)
> is decoupled from `task done`. Closing a task is now a millisecond
> operation; verification is its own explicit, cached step.
> All 10 v14-* epics closed; the full backlog landed —
> `v14-brain-snippets`, `v14-model-prompts`, `v14-verify-integrity`,
> `v14-cost-telemetry`, `v14-framework-lean` shipped in the Composer
> batch (session #42); the remaining `v14-project-hygiene`,
> `v14-test-philosophy`, `v14-doc-automation`, `v14-dead-code-audit`,
> `v14-skill-store` followed in the Phase B follow-up before the
> release commit. See the session-#42 retro
> (`docs/ru/research/tausik-1.4-composer-retro-2026-05-02.md`).

### BREAKING (with opt-out)

- **Verify-First Contract.** Heavy quality gates moved from the `task-done`
  trigger to a new `verify` trigger. `task done` now refuses to close a
  task unless a fresh `tausik verify` green exists in `verification_runs`
  for that task (10 min TTL, configurable via `verify_cache_ttl_seconds`).
  Affected gates: `pytest`, `tsc`, `cargo-check`, `cargo-test`, `go-vet`,
  `go-test`, `phpstan`, `phpunit`, `javac`, `js-test`, `terraform-validate`,
  `helm-lint`, `kubeval`, `hadolint`, `ansible-lint`.
  - **Why:** in VS Code Claude Extension and similar hosts, synchronous
    multi-minute pytest runs inside `task_done` looked like the agent had
    hung. The new contract makes verification visible and interruptible.
  - **Opt-out:** add `{ "task_done": { "auto_verify": true } }` to
    `.tausik/config.json` to restore the v1.3 inline behavior (heavy gates
    fire inside `task_done`). Useful in CI where one long step is fine.
  - **Migration:** users only need to insert `tausik verify --task <slug>`
    before `task done`. Skill `/ship` and CLI docs updated.

### Added — Verify-First infrastructure

- `VALID_GATE_TRIGGERS` extended with `"verify"` (project_config + stack_schema).
- `service_verification.has_fresh_verify_run()` and
  `service_verification._build_cache_command(trigger, files)` — the cache
  bucket is now keyed by trigger so verify and task-done buckets never
  cross-satisfy.
- `service_gates._enforce_verify_first()` — synthesizes a blocking failure
  with explicit remediation when no fresh verify run is found.
- `tests/test_verify_first_contract.py` — 14 tests covering the contract
  end-to-end (block, unblock via cache, auto_verify opt-out, cache bucket
  separation, exempt projects, stack-gate migration sanity).
- Pytest marker `verify_first` and an autouse opt-out fixture in
  `tests/conftest.py` so legacy tests aren't blocked on the new contract.
- **Pipeline envelope timeout** (`verify_pipeline_timeout_seconds`,
  default 60s) — wall-time bound around the whole `run_gates` cycle so a
  hung gate cannot make `task done` look frozen. Set to `0` to disable
  (CI). On exceed: `GateEnvelopeTimeoutError` with explicit remediation
  (raise the limit, set `auto_verify=true`, or narrow `relevant_files`).
- **Recover relevant_files from recent verify-row.** When `task done` runs
  without a CLI/MCP `relevant_files` AND the task row has none, `service_task`
  now reads them from the most recent fresh verify-row (≤ TTL, exit 0) so
  `tausik verify --task X` followed by `tausik task done X` (no args) hits
  the cache. Security-sensitive paths (auth/payment/etc.) bypass the
  fallback — they always require an explicit list.
- **Relaxed cache hit on file-set mismatch.** Strict cache lookup keys on
  `(slug, files_hash, command)` so mtime / gate-signature drift correctly
  invalidates. The single Sharp edge it created — `verify --task X` with
  manual scope (`files=[]`) followed by `task done X relevant_files=[…]`
  used to miss and re-run `run_gates` — is closed: when the strict miss
  has a fresh exit-zero row that named NO files, accept it as "manual
  scope vouched for this slug". Mismatch where the recorded run named
  specific files still misses (mtime/signature invalidation preserved).
  Security-sensitive `relevant_files` bypass relaxed too.

### Added — Epic v14-brain-snippets (Shared Brain artifact pipeline)

- Logical schema `agents/schemas/brain-artifact-card.schema.json` —
  validated payload for patterns / gotchas before Notion write.
- `scripts/brain_artifact_taxonomy.py`, `scripts/brain_artifact_card.py`,
  `scripts/brain_store_format.py` — taxonomy (artifact / pattern / snippet),
  card validator, server-side store-format normalizer.
- `scripts/brain_publish_flow.py` + `scripts/brain_publish_cli.py` +
  `scripts/brain_cli_ops.py` — propose → audit → publish workflow with
  scrub-before-risk and explicit `confirm_high_risk` gate.
- MCP `brain_draft_artifact` (Claude + Cursor servers) for proposing
  artifacts before publish.
- Optional `external_repo_url` field on artifact cards (validated;
  not persisted to Notion props in v1).
- Stack-aware artifact ranking inside `brain_search`.
- EN/RU docs: `brain-artifact-taxonomy.md`, `brain-search-ranking.md`.

### Added — Epic v14-model-prompts (multi-model skill profiles)

- `scripts/skill_profile.py` — frontmatter + `variants/<model>.md`
  resolver with safe fallback on unknown profile.
- `agents/skills/_profile-demo/` — demo skill (`SKILL.md` + `variants/`)
  showing the format. The leading `_` makes bootstrap skip the demo
  in real generation.
- `bootstrap_copy.py` profile-aware skill copy (selects variant body).
- `bootstrap_qwen.py` + `.qwen/` + `QWEN.md` template — Qwen Code agent
  added as a target IDE alongside Claude / Cursor.
- `TAUSIK_MODEL_PROFILE` env → `model_profile` key in `.tausik/config.json`
  (validated on bootstrap; invalid values exit non-zero).
- Optional `task_next.model_hint` config key (off by default) — appends
  a non-blocking model recommendation (Haiku / Sonnet / Opus) on
  `task next` and `hud` based on complexity.
- AGENTS.md table mapping model → tool surface.
- EN/RU docs: `skill-profiles.md` plus updates to `skills.md`.

### Added — Epic v14-verify-integrity (anti-gaming QG-2)

- `doctor` subcommand surfaces a non-blocking warning when
  `auto_verify=true` is paired with an interactive profile (humans
  rarely want full pytest inside `task_done`). Tested in
  `tests/test_doctor_auto_verify_hint.py`.
- `tests/conftest.py` `_verify_first_autouse_compat_shim` documented:
  predicate helper `tests/verify_first_compat_predicate.py`
  declares which test paths bypass `_enforce_verify_first` and why.
- `scripts/verify_recent_lookup.py` — small compat shim for verify cache
  lookups outside `service_verification`.
- EN/RU docs: `verify-glossary.md` (opt-out vs bypass vs test shim —
  single source of truth).

### Added — Epic v14-cost-telemetry (token + dollar accounting)

- `usage_events` table (migration in `backend_schema.py`) — records
  model_id, input/output tokens, optional cost, task_slug, session,
  created_at. Negative tokens / unknown model rejected.
- `llm_pricing_usd_per_million` config key (validated by
  `normalize_llm_pricing_config`) — per-model USD price; missing model
  yields `UNKNOWN`.
- `usage_events_cost_rollup_by_task` + `usage_cost_rollup_by_task` —
  per-task / per-period cost aggregation. Empty windows return `[]`,
  not exceptions.
- `tausik metrics --cost` (CLI + MCP `tausik_metrics`) — tabular
  rollup with friendly empty-state message.

### Added — Epic v14-framework-lean (token-cost reduction)

- `context_tier` config key (`minimal` / `standard` / `full`) +
  `resolve_context_tier()` with strict validation. Bootstrap renders
  short / medium / full rules accordingly. Tested in
  `tests/test_context_tier.py`.
- `tausik status --compact` (CLI flag) and MCP `tausik_status({compact:
  true})` — single-line JSON reply for agents that don't need the
  human-formatted block. Default human output unchanged.
- AGENTS.md trim pass: removed duplication with skills without dropping
  any hard rule.

### Added — Doc automation (epic v14-doc-automation, partial)

- `docs/_generated/constants.json` — single source of truth for
  `tausik_version`, MCP tool counts (project / brain / RAG / total).
- `scripts/gen_doc_constants.py` — generator with `--check` mode
  (exit 1 on drift). Available as `tausik doc constants [--check]`.
- `scripts/mcp_tool_counts.py` — derives `mcp_*_tools` numbers from
  live `agents/{claude,cursor}/mcp/*/tools.py`. Tested in
  `tests/test_gen_doc_constants.py`, `tests/test_mcp_doc_tool_counts.py`.

### Added — Project hygiene & test-philosophy docs (partial)

- EN/RU docs: `task-archive-spec.md` (read-only archive policy for
  done tasks > N days), `memory-merge-guidelines.md` (when to merge
  memory entries vs. add a new one), `testing-principles.md`
  (criteria for adding a test; anti-pattern: copy-paste without new
  behavior), `skill-ecosystem.md` (one-pager for repo → install →
  activate flow).
- `agents/skills/_profile-demo/` showcased in `skills.md` — when to
  use multi-model variants.

### Changed

- `agents/{claude,cursor}/mcp/project/server.py`:
  - `chdir(args.project)` on launch with explicit non-directory check
    (exit 2, stderr message). Parity with `tausik-brain` server.
  - Tool exceptions now print full `traceback.format_exc()` to stderr while
    the agent-facing reply stays minimal (`Error: …`) — no stack-frame
    leakage into model context.
- `service_verification.run_gates_with_cache(..., trigger="task-done")` is
  now parameterizable; CLI `verify` and MCP `_handle_verify` pass
  `trigger="verify"`.
- Stacks `python`, `typescript`, `rust`, `go`, `php`, `javascript`, `java`,
  `terraform`, `helm`, `kubernetes`, `docker`, `ansible` updated:
  heavy `task-done` gates are now on `verify`.
- `bootstrap_templates.py` HARD_CONSTRAINTS, SENAR_RULES, COMMANDS, and
  QUALITY_GATES sections describe the Verify-First workflow so newly
  bootstrapped projects get the right CLAUDE.md / AGENTS.md / .cursorrules.
- `docs/{en,ru}/cli.md` and `docs/{en,ru}/quickstart.md` updated.
- Skills `/ship` and `/task done` insert an explicit `tausik_verify` step
  before closing a task.

### Fixed

- Pre-existing test bug: `tests/test_service_verification.py` lambdas
  mocking `gate_runner.run_gates` did not accept kwargs and silently
  failed against the real `progress_callback=` argument. Lambdas now
  carry `**_kw`. (4 tests unblocked.)
- Test pollution between `test_hud_cli.py`, `test_memory_block.py`,
  `test_memory_compact.py`, `test_qg0_dimensions.py` and any test that
  reads `.tausik/config.json` via `find_tausik_dir()`. The four files
  set `os.environ["TAUSIK_DIR"]` directly without cleanup, so the env
  var leaked into later tests pointing at a deleted tmp_path. Replaced
  with `monkeypatch.setenv` so cleanup is automatic. Surfaced by the
  new `tests/test_task_next_model_hint.py::test_hint_via_config_file`,
  which is the only test that exercises a real `load_config()` path.

### Tests

- Suite expanded **2318 → 2513** (`tests/`); full run green
  (`2506 passed, 7 skipped`).
- New test files: `test_bootstrap_model_profile`,
  `test_brain_artifact_external_repo`, `test_context_tier`,
  `test_doctor_auto_verify_hint`, `test_gen_doc_constants`,
  `test_llm_pricing_config`, `test_mcp_doc_tool_counts`,
  `test_skill_profile`, `test_task_next_model_hint`,
  `test_metrics_session_usage`.

### Versioning

- `__version__` bumped `1.3.7` → `1.4.0`.
- `pyproject.toml` `version` bumped `1.3.7` → `1.4.0`.
- `docs/_generated/constants.json` regenerated.

> All 10 v14-* epics closed in this release. The remaining 5 epics from the
> master plan landed alongside the Composer batch as their own scripts and
> tests, split below for parallel structure with the first five.

### Added — Epic v14-project-hygiene (long-running project hygiene)

- **`tausik hygiene archive`** (CLI, dry-run only in v1) — lists `done`
  tasks older than `task_archive.done_age_days`. Active / blocked /
  planning / review tasks are never included; `--confirm` is reserved
  for future destructive ops and rejected today. Sources:
  `scripts/project_cli_hygiene.py`, parser dispatch in
  `scripts/project_parser_ops.py::add_hygiene`.

### Added — Epic v14-test-philosophy (test discipline)

- **`scripts/audit_pytest_dedupe.py`** — AST-normalized signature
  grouping for test functions that share structure (copy-paste
  detector). Report artifact:
  `docs/ru/research/tausik-1.4-pytest-dedupe-2026-05-02.md`.

### Added — Epic v14-dead-code-audit (dead code & junk inventory)

- **`scripts/audit_orphan_files.py`** — Python files in `scripts/` that
  no other file imports and no doc references. Mirror partner / soft
  doc references included so standalone CLIs aren't false-positive.
- **`scripts/audit_stale_docs.py`** — markdown files under `docs/` with
  no inbound link. EN/RU mirror partners stay paired; research and
  release-notes archives excluded by glob.
- **`scripts/audit_unused_python.py`** — top-level `def` / `class`
  symbols never referenced in the repo. Exempt modules + private
  helpers excluded; documented false-positive policy.

### Added — Epic v14-doc-automation (doc generation & drift checks)

- **`scripts/hooks/check_docs.py`** — pre-commit / CI hook wrapper
  around `gen_doc_constants.py --check`; gracefully skips when no
  `pyproject.toml` is found above cwd.
- **`.github/workflows/tests.yml` step `Doc-constants drift check`** —
  fails the matrix on `docs/_generated/constants.json` drift.
- **EN/RU developer docs:** `dev-doc-checks.md` — how to run all of
  the above locally; documents negative behaviour.

### Added — Epic v14-skill-store (skill CLI UX & trust)

- **Skill CLI consistency** (`tausik skill ...`) — every subcommand has
  a noun-phrase help string and a "see: tausik skill list" hint on
  `name` args. Negative scenarios now surface a friendly
  `Error: ...` + exit 1 instead of a Python traceback;
  `SkillManagerError` is caught alongside `ServiceError` in `main()`.

### Refactored

- `scripts/project_parser.py` 465 → 372 lines: `add_skill` and
  `add_metrics` extracted into `scripts/project_parser_ops.py` to
  satisfy the 400-line filesize gate.

## [1.3.7] — 2026-04-29 — MCP clarity for Cursor/VSCode + docs consistency sweep

This patch hardens agent-facing MCP UX and aligns documentation with actual
multi-IDE validation status.

### Added
- **`tausik_task_done_v2` MCP tool** (Claude + Cursor server surfaces) with
  structured JSON output: stage flags, per-gate results, blocking failures,
  remediation hints, warnings, and cache status.
- **Gate progress events** in `gate_runner` and MCP stderr feedback:
  `[gate X/N] running ...`, `PASS/FAIL/SKIP`, duration per gate.
- **Cursor project MCP generation** in bootstrap:
  `.cursor/mcp.json` is now generated/merged alongside root `.mcp.json`.

### Changed
- `task_done` internals now reuse a shared structured report pipeline, while
  preserving backward-compatible plain-text behavior for legacy callers.
- README EN/RU now explicitly marks **officially tested** IDE combos:
  `VSCode + Claude Extension` and `Cursor`; other hosts are tagged as
  expected/partial.
- Quickstart EN/RU now documents dual MCP config locations:
  `.mcp.json` (Claude ecosystem) and `.cursor/mcp.json` (Cursor project).
- MCP docs EN/RU include `tausik_task_done_v2` and structured-response usage.

### Fixed
- Resolved docs drift in RU index and hooks docs:
  - RU docs index MCP count aligned to 96.
  - `brain_search_proactive.py` trigger description aligned with generated hook
    wiring (`WebSearch|WebFetch`, not generic user-prompt trigger).
- Synced stale dogfooding/test-count values in RU/agent onboarding docs.

### Tests
- Added/updated tests for:
  - `task_done_v2` MCP dispatch/shape.
  - Cursor MCP config generation and user-entry preservation.
  - MCP integration tool list including the new v2 endpoint.
- Target suite passed locally:
  `tests/test_project_mcp.py`,
  `tests/test_mcp_integration.py`,
  `tests/test_bootstrap_generate_mcp.py`.

### Versioning
- `__version__` bumped `1.3.6` → `1.3.7`.
- `pyproject.toml` version bumped `1.3.6` → `1.3.7`.

## [1.3.6] — 2026-04-29 — Dead code cleanup + framework integrity

Targets two CI workflow failures and a wider integrity audit. No behaviour
changes for end users; the framework surface is the same, just tidier.

### Removed
- `scripts/generate_cli_ref.py` — orphan (the CLI reference moved to
  `docs/{en,ru}/cli.md` in v1.3.0; the generator was never re-wired).
- `.github/workflows/docs-update.yml` — wrote to the deleted `references/`
  directory and was the source of the second CI red.
- `scripts/hooks/notify_on_done.py` + `scripts/notifier.py` +
  `tests/test_notifier.py` — the notification feature was implemented but
  never registered in any IDE settings template, so it was dead code.
  Parking-lot entry added to `TODO.md` if the feature needs to come back.

### Fixed
- **CI red — `ruff check scripts/` failure.** Removed 6 unused imports
  in `scripts/project_cli_doctor.py`, `scripts/service_task.py`, and
  `bootstrap/analyzer.py`.
- **Bootstrap drift.** `scripts/project_service.py` and
  `scripts/service_task_team.py` had been edited at the source without
  re-bootstrapping `.claude/`; `tausik doctor` now reports zero warnings.
- **Stale doc paths.** Six documents (`docs/{en,ru}/i18n-strategy.md`,
  `docs/en/environment.md`, `docs/en/troubleshooting.md`,
  `docs/en/skill-spec.md`, `docs/{en,ru}/architecture.md`) referenced the
  deleted root `references/` directory; updated to point at `docs/{en,ru}/cli.md`.
- **Hooks doc.** `docs/{en,ru}/hooks.md` no longer documents the deleted
  `notify_on_done.py` row in the PostToolUse table or the pipeline diagram.
- **Test counts.** Bumped 2270 → 2318 across `CLAUDE.md`, `README.md`,
  and `docs/{en,ru}/architecture.md` after the test_notifier removal.

### Changed
- **Ruff scope expanded in CI.** `ruff check` now runs on
  `scripts/ tests/ bootstrap/` (was `scripts/` only) so future drift in
  tests or bootstrap is caught at PR time.
- **`pyproject.toml`.** Added `[tool.ruff]` config with per-file `E402`
  ignores for the seven test/bootstrap modules that intentionally insert
  into `sys.path` before importing project modules. Project version field
  bumped from the stale `1.0.0` baseline to `1.3.6`.
- **Lint hygiene.** Cleaned 4× F541 (useless `f""` prefixes), 2× B007
  (unused loop control variables `dirpath`, `f`), 1× E741 (ambiguous
  `l` → `row`), 1× E401 (combined imports), and 7× F841 (unused locals
  in tests — including two test bugs where the assertion was missing
  entirely: `test_dotfile_not_ignored_by_default` and
  `test_case_insensitive_ext` in `tests/test_rag_edge.py`).
- **Mypy override.** Removed obsolete `module = "generate_cli_ref"`
  override pointing at the deleted file.

### Versioning
- `__version__` bumped `1.3.5` → `1.3.6`.
- `pyproject.toml` `version` synced from `1.0.0` (stale) to `1.3.6`.

## [1.3.5] — 2026-04-28 — Cursor session cost metrics (auto + CLI)

### Added
- `tausik metrics record-session` CLI subcommand to persist per-session
  token/cost/tool/model usage into project DB.
- New table `session_usage_metrics` (schema `v19`) with upsert by
  `session_id` and query/index support.
- `tausik metrics` output now includes `LLM Usage` summary and last
  recorded session details.

### Changed
- `session end` now attempts a best-effort call to
  `scripts/hooks/session_metrics.py --auto --record` (non-blocking).
- `scripts/hooks/session_metrics.py --auto` now searches both
  `~/.claude/projects` and `~/.cursor/projects` transcript roots.

### Tests
- Added `tests/test_metrics_session_usage.py`.
- Added `tests/test_session_end_metrics_hook.py`.

### Versioning
- `__version__` bumped `1.3.4` -> `1.3.5`.

## [1.3.4] — 2026-04-28 — Security & QG hardening + doc-truth

Closes the v1.3.1 blind-review HIGH/MED security and QG bypasses that
weren't bundled into the v1.3.0 release. Three commits:

### Doc-truth: test count drift (`fcbefb4`)
- README.md / README.ru.md badges + Stats tables, AGENTS.md,
  CONTRIBUTING.md, docs/{en,ru}/architecture.md — `2246` → `2270`
  (count after v1.3.3 added 24 tests). CHANGELOG entries kept
  historical.

### Verify cache cross-check vs git diff (`d8838f1`) — closes 1 HIGH (Sec)
- `scripts/verify_git_diff.py` (new): `changed_files_since(timestamp,
  root, runner)` shells out to `git log --since=<ts> --name-only` +
  `git diff --name-only HEAD`, unions, normalizes paths to forward
  slashes. Returns `None` on any failure (git missing, no `.git`,
  non-zero exit, OSError) so non-git users keep working.
- `is_declared_consistent_with_git_diff(declared, ts)` returns False
  iff declared_set is a strict subset of actually-changed-set
  (under-declaration). Over-declaration is fine.
- `service_verification.run_gates_with_cache`: new `task_created_at`
  param. When provided, gates cache lookup on git-diff consistency in
  addition to the existing security-bypass + files_hash checks. New
  status code `git-mismatch` joins `hit`/`miss`/`bypass`.
- `service_gates._run_quality_gates` and `project_cli_verify.cmd_verify`
  plumb `task["created_at"]` through.
- Closes the bypass: agent could declare `relevant_files=[docs/x.md]`
  while editing `scripts/auth.py` and the cache hashed only the declared
  files — next `task_done` saw a stale-green and skipped the security
  check.
- Refactor for filesize: extracted `qg0_dimensions_score` to
  `scripts/gate_qg0_score.py` (47 lines) so service_gates dropped from
  408 to 381.
- 16 new tests in `tests/test_service_verification.py`.

### Hook hardening batch (`b48d230`) — closes 5 MED (Sec) + 1 audit-clean
- **#1 bash_firewall regex.** WARN_PATTERNS now use word-boundary regex
  with the same shape as `git_push_gate.py` (command-start anchor +
  optional path + optional `git -c` flags). `echo 'git push --force is
  dangerous'` no longer false-positives. `gitfoo push --force` no longer
  matches. `/usr/bin/git push --force` still blocks. 11 new tests.
- **#2 skill_manager pip hardening.** `install_skill_deps` now passes
  `--no-config` to pip (disables every pip.conf scope) and strips
  `PIP_INDEX_URL`, `PIP_EXTRA_INDEX_URL`, `PIP_TRUSTED_HOST`,
  `PIP_FIND_LINKS`, `PIP_INDEX` from subprocess env. Combined with the
  existing `_SAFE_PKG` regex, closes the supply-chain redirect surface
  for third-party skills. 3 new tests.
- **#3 copytree symlinks=False.** 3 call sites — `skill_manager.copy_skill`,
  `service_skills.skill_install`, `bootstrap_copy.copy_dir` — now pass
  `symlinks=False` explicitly. New `tests/test_copy_symlinks_disabled.py`
  with hostile-repo fixture (skips on Windows non-admin where `os.symlink`
  fails); covers all 3 call sites.
- **#4 hooks detect TAUSIK by `.tausik/` dir, not `.db` file.** New
  helper `_common.is_tausik_project(project_dir)`. `task_gate.py` and
  `memory_pretool_block.py` migrated. Closes the
  bootstrap-but-not-init window where hooks silently skipped. 3 new tests.
- **#5 `last_user_prompt_text` bounded tail-read.** New
  `_read_transcript_tail()` seeks the last 50 KB of the JSONL transcript,
  drops the partial first line at the seek boundary. Long sessions no
  longer load the entire file into memory on every PreToolUse. 3 new tests.
- **#6 brain symlinks — AUDIT CLEAN.** `git grep` for
  `copytree|os\.symlink|os\.readlink|os\.lstat|shutil\.` across
  `scripts/brain_*.py` + `agents/claude/mcp/brain/` returned ZERO hits.
  No fix needed; the scan is the deliverable.

### QG hardening batch (this commit) — closes 5 MED (QG)
- **#1 Negative-scenario detection: regex with negation filter.** Old
  code did `kw in ac_text` substring match — "Works without errors"
  satisfied the gate because "error" substring was present. New
  `has_negative_scenario(ac_text)` splits AC into per-criterion lines
  (handles inline `1. ... 2. ...` numbering), redacts negation phrases
  ("no", "without", "never", "нет", "без", "не должно") plus their
  ~60-char span, then looks for surviving NEGATIVE_SCENARIO_KEYWORDS
  matches at word boundaries. 8 new tests.
- **#2 Checklist tier consults `relevant_files`.** New signature
  `_determine_checklist_tier(task, relevant_files=None)`: if
  `is_security_sensitive(relevant_files)` is True, tier promotes to
  `critical` regardless of title. Closes the case where "fix typo"
  (title=trivial) on `scripts/auth.py` got `lightweight` (4 items)
  instead of the critical-tier review. 3 new tests.
- **#3 `files_hash` includes 4 KiB content head.** New per-file tuple is
  `(path, mtime_ns, size, sha256(first_4KiB))`. Closes false cache hits
  on filesystems with coarse mtime resolution (FAT/HFS+/SMB) and on
  deliberate `touch -d` reverts. Hash format version bumped
  `verification_runs.v1` → `v2`. 3 new tests.
- **#4 `task_unblock` checks session_capacity.** Pre-v1.3.4 bypass:
  agent could `task_block` then `task_unblock` to dodge the 180-min
  ACTIVE-time check that fires on `task_start`. New `force=True` flag
  is the audit-logged escape hatch. 4 new tests.
- **#5 `--no-knowledge` refused for complex/defect.** SENAR Rule 8
  upgrades from warning to refusal when `complexity=complex` or
  `defect_of` is set. Complex tasks generate patterns worth recording;
  defect tasks generate root-cause/gotcha entries for future avoidance.
  Simple/medium non-defect tasks unaffected. 5 new tests.

### Tests
- 2332 passing, 1 skipped (vs 2270 in v1.3.3). +62 new across
  the four batches.

### Compatibility
- Verify cache: format version bumped (`verification_runs.v1` → `v2`).
  Old cache rows are silently invalidated by the new files_hash shape —
  they don't match new hashes. No DB migration needed.
- `task_unblock(slug)` still works as before for the common path; new
  `force=True` keyword is opt-in.
- `task_done(no_knowledge=True)` still works for simple/medium
  non-defect tasks. Refused for complex/defect — agent must drop the
  flag and let the warning fire (or capture knowledge first).

### Versioning
- `__version__` bumped 1.3.3 → 1.3.4.

## [1.3.3] — 2026-04-27 — Brain init anti-hallucination guards

Hardening release. `tausik brain init` now refuses to silently create a
duplicate set of 4 BRAIN databases when canonical-titled ones already exist
in the same Notion workspace. Triggered by a real incident where an agent
in a second project ran `brain init`, created a parallel set, and then
rationalized the duplicates as "per-project databases for privacy" — which
is the exact opposite of how Shared Brain is designed.

### Architectural rule (now enforced in code, docs, and the brain skill)

The Shared Brain has **ONE set of 4 Notion databases per workspace, shared
by ALL projects**. Per-project privacy is enforced via the
`Source Project Hash` column on every row, NOT by giving each project its
own copies of the four databases.

### Wizard changes

- **Pre-flight workspace search.** Before creating, the wizard calls
  `POST /v1/search` for canonical-titled BRAIN databases (`Brain · Decisions
  / Patterns / Gotchas / Web Cache`).
- **Refuses on full match.** All 4 found → wizard refuses with a clear
  error pointing at `--join-existing`.
- **Refuses on partial match.** 1-3 of 4 found → also refuses (ambiguous
  state); user must either restore the missing DBs or pass all 4 ids
  explicitly with `--decisions-id / --web-cache-id / --patterns-id /
  --gotchas-id`.
- **`--join-existing`** — new flag. Skips create entirely and writes
  `.tausik/config.json` to point at the existing 4 databases. Auto-discovers
  via search; explicit IDs override discovery and are also verified via
  `databases_query(page_size=1)` before save.
- **`--force-create`** — new escape hatch. Bypasses the duplicate guard for
  the rare case of an intentional brand-new workspace (different Notion
  account/integration). Logs an extra confirmation prompt.
- **Search failure tolerance.** If the workspace search itself fails
  (network, auth), the wizard logs a warning and proceeds with create
  rather than blocking — defensive default.

### Brain skill (`agents/skills/brain/SKILL.md`)

Added a top-of-file ARCHITECTURE block. Rewrote the "Brain disabled?"
section: agents must ASK the user before running any setup command, and
must use `--join-existing` when a workspace BRAIN already exists. Explicit
"NEVER guess" + "do not invent --force-create".

### Docs

`docs/en/shared-brain.md` and `docs/ru/shared-brain.md` — Setup section
restructured into "First project — create" / "Second / third project —
join existing" subsections, plus a new **Common mistakes** block listing
the duplicate-DB pitfall and the per-project-copies "privacy" anti-pattern.

### Tests

- `tests/test_brain_init.py` — 16 new tests covering
  `find_workspace_brain_databases`, `verify_brain_databases`, all four
  wizard branches (refuse-full-match, refuse-partial, force-create, join,
  join-with-explicit-ids, verify-failure), search-failure tolerance, and
  no-regression on the clean-workspace path.
- Existing interactive-wizard tests updated to match new prompt order
  (token first, parent-page-id second).

### Test isolation drive-bys

Two more svc fixtures (`tests/test_edge_cases.py`,
`tests/test_e2e_workflow.py`) needed the v1.3.2 `brain_config.load_brain`
stub — the same isolation gap fixed for `test_service_knowledge_decide.py`
in v1.3.2 was hiding in two more files. Tests passed locally only because
the live brain happened to write to Notion silently. Now stubbed.

`tests/test_skills_maturity.py::test_all_stack_guides_have_valid_stack`
fixed for the v1.3 stacks layout (`stacks/<name>/guide.md`, not
`agents/stacks/<name>.md`).

### Compatibility

Fully backward-compatible. Projects that already have brain configured are
unaffected — the guard only fires on `brain init` itself. Tokens, mirror
paths, database IDs, and existing data are untouched.

### Versioning

`__version__` bumped 1.3.2 → 1.3.3.

## [1.3.2] — 2026-04-28 — Brain token storage flexibility

Quality-of-life patch: the Notion integration token for Shared Brain can now be
stored in three places, in priority order:

1. **`os.environ[NOTION_TAUSIK_TOKEN]`** — highest priority. Best for CI/ops.
2. **`.tausik/.env`** — project-local KEY=VALUE file. Gitignored
   (`.tausik/` is fully ignored). Recommended for individual developers
   because it persists without shell-rc setup and survives reboot.
3. **`brain.notion_integration_token`** in `.tausik/config.json` — emits a
   stderr warning ("stored inline; prefer .tausik/.env"). Allowed for
   read-only setups but not encouraged.

### Why

Before 1.3.2 the token could only live in an environment variable. That
caused friction: users would `$env:NOTION_TAUSIK_TOKEN = "..."` in PowerShell,
the brain would work for that session, then break after reboot or window close.
The MCP server (subprocess of the IDE) didn't see env vars set after IDE start.
Several reports of "brain configured but says token missing".

### How

- New helper `brain_runtime.resolve_brain_token(cfg, project_dir=None)` —
  the cascade.
- New parser `brain_runtime._parse_dotenv(path)` — minimal KEY=VALUE reader
  (ignores blank lines, `#` comments, strips quotes; never raises).
- `brain_runtime._build_notion_client`, `try_brain_write_decision`, and
  `try_brain_write_web_cache` now use `resolve_brain_token` instead of
  reading `os.environ` directly.
- `brain_config.validate_brain` updated: doctor and `brain init` no longer
  report "env var not set" when the token is in `.tausik/.env` or
  config.json.
- 7 new tests in `tests/test_brain_token_resolve.py` cover env-wins,
  dotenv fallback, config-inline + warning, all-empty, dotenv parser
  edge cases (quotes, comments, whitespace), missing-file safety,
  and default `NOTION_TAUSIK_TOKEN` env-name fallback.

### Compatibility

Fully backward compatible. Projects that already set the env var continue
to work unchanged — env wins by priority. No config migration needed.

### Notion token UI path (for users)

To get the token: https://www.notion.so/profile/integrations → New
integration (or click an existing one) → Type: **Internal** → reveal
**Internal Integration Secret** (starts with `ntn_` or `secret_`). Then
share the BRAIN page tree with the integration via Notion → page → ⋯ →
Connections → Connect to.

---

## [1.3.0] — 2026-04-28 — Big release: MCP expansion + session discipline + plugin stacks

Single consolidated entry covering everything since v1.2.0 (40+ commits + an
independent 5-agent blind review hardening pass right before ship + a 4-agent
post-ship doc-truth audit that corrected propagated count errors).

### 📐 Post-ship 4-agent doc-truth audit

After v1.3.0 went out, a follow-up audit with 4 parallel agents (link
integrity / stale facts / README marketing / skills docs vs reality) caught
documentation that had not been kept in lock-step with the code:

**Count corrections (propagated across 12+ files):**

- **MCP tools: 100 → 96.** The "(90 project + 10 brain)" claim was wrong on
  the brain side — `agents/claude/mcp/brain/tools.py` ships **6** tools
  (`brain_search`, `brain_get`, `brain_store_decision`,
  `brain_store_pattern`, `brain_store_gotcha`, `brain_cache_web`), not 10.
  Fixed in README, README.ru, AGENTS, CLAUDE, docs/{en,ru}/{mcp,architecture,
  senar-compliance-matrix}.md.
- **Quality gates: "16 checks" → "25 checks".** `DEFAULT_GATES` resolves to
  5 universal + 20 stack-scoped = 25.
- **Skills marketing copy: "34 skills" → "13 core + 25 vendor (38 total)"**
  — README.md, README.ru.md, docs/en/adding-new-ide.md.
- **Dogfooding stats** in README.md / README.ru.md: 291 → 516 tasks, 22 →
  37 sessions, 918/1095 → 2246 tests, throughput ~13 → ~14 per session.
- **RU README badge mismatch fixed:** `[![2226 tests]` label vs
  `tests-2246%20passed` URL aligned.

**Broken internal links (9 of 12 reported, 3 false positives in
i18n-strategy code examples):**

- `CONTRIBUTING.md:87` →`docs/en/architecture.md` (was
  `references/architecture.md`)
- `CHANGELOG.md` three `references/*` links rewritten to
  `docs/research/anthropic-oss-applicability.md`,
  `docs/research/markitdown-integration.md`,
  `docs/en/brain-db-schema.md`.
- `docs/{en,ru}/shared-brain.md` two refs each → `brain-db-schema.md` as
  sibling.
- `docs/en/brain-db-schema.md`: relative-depth bug fixed
  (`../scripts/...` → `../../scripts/...`).
- `docs/ru/claude-md-guide.md`: `skill-spec.md` → `../en/skill-spec.md`
  (no RU translation).
- `scripts/README.md`: `references/project-cli.md` → `docs/en/cli.md`.

**Skill placement fix:** `docs/{en,ru}/skills.md` had `/docs`, `/excel`,
`/pdf` listed under "Integrations" — they're documentation/extraction
tools, not external-service integrations. Moved to a new "Documentation /
Extraction" subsection. "Integrations" now contains only MCP-backed
external services (jira, bitrix24, sentry, confluence).

**Bootstrap template:** `bootstrap/bootstrap_templates.py:build_skills_section`
rewritten for the v1.3 lean-core split. Generated CLAUDE.md / AGENTS.md /
.cursorrules / QWEN.md now explicitly list the 13 always-deployed core
skills and explain that 25+ official/vendor skills install on demand via
`tausik skill install <name>`.

**User-reported "two PDF links in main README":** investigated by the
link-integrity agent — exhaustive grep across `README.md` and
`README.ru.md` returned zero PDF references. The user may have been
looking at a different surface; no PDFs are broken.



### 🧠 Shared Brain — cross-project knowledge base (Notion-backed)
- 4 Notion DBs (decisions, patterns, gotchas, web_cache) + local SQLite mirror with FTS5 (Cyrillic-aware).
- Notion REST client, stdlib-only, with retry/backoff + 350ms write throttle.
- Pull-sync engine with delta-fetch (`last_edited_time` cursor), atomic single-tx, WAL mode.
- `tausik brain init` wizard creates 4 DBs + atomic config in one shot.
- MCP server `tausik-brain` (7 tools) + skill `/brain` (query/store/show/status/move).
- Auto-route `tausik decide` via rule-based local↔brain classifier.
- PostToolUse `WebFetch` auto-cache hook → next fetch of same URL is blocked by mirror.
- Proactive lookup before WebSearch/WebFetch — instant hit from mirror.
- Privacy: project names hashed (SHA256[:16]) — no plaintext in Notion.
- Stale-lock recovery for SIGKILL'd wizard. NFC normalization for unicode-equivalent names.
- Brain schema migration scaffold (forward-only, single-tx).
- Qwen Code: brain MCP registered via bootstrap.

### 🧩 Plugin stack architecture (single source of truth)
- `stacks/<name>/{stack.json, guide.md}` declarative format (was: 5 hardcoded modules).
- JSON Schema (Draft-07) + actionable validator.
- `StackRegistry` with layered deep-merge: built-in ← `.tausik/stacks/<name>/` user override.
- 25 built-in stacks migrated (incl. 5 IaC: ansible/terraform/helm/k8s/docker).
- 6 consumers refactored to use registry with hardcoded fallback for boot safety.
- CLI: `tausik stack {list,info,export,diff,reset,lint,scaffold}` for full lifecycle.
- 5 MCP tools: `tausik_stack_{list,show,lint,diff,scaffold}` for agent-driven use.
- Bootstrap NEVER writes to `.tausik/stacks/` (test-enforced invariant).

### 🎭 Roles — first-class CRUD with hybrid storage
- New SQLite `roles` table (migration v18) — slug PK + title + description.
- Auto-seed from `DISTINCT tasks.role` on migration (no orphan task references).
- Hybrid storage: metadata in DB, markdown profile in `.tausik/roles/<slug>.md` (user) or `agents/roles/<slug>.md` (built-in).
- Bootstrap NEVER overwrites `.tausik/roles/` — user profiles survive re-bootstrap.
- CLI: `tausik role {list,show,create,update,delete,seed}` with `--extends` profile cloning.
- 6 MCP tools: `tausik_role_{list,show,create,update,delete,seed}` for CRUD.
- Delete refuses if tasks reference role (force=true → cascade NULL the references).

### ⏱️ Session active-time (gap-based) replaces wall clock
- Sessions exceeding 180-min SENAR Rule 9.2 are now measured by ACTIVE minutes, not wall clock.
- Activity counted via `events` table; gaps ≥ idle threshold (default 10 min) excluded as AFK.
- New PostToolUse hook `activity_event.py` writes one row per tool call so the metric works for any agent activity (not just MCP/CLI).
- `tausik status` shows both numbers: "Session: #N (X min active / Y min wall, Z% idle)".
- New CLI `tausik session recompute` retro-analyses prior sessions (real numbers vs claimed wall clock).
- Threshold tunable via `.tausik/config.json` `session_idle_threshold_minutes`.
- session_extend now respects project's configured `session_max_minutes` (was: hardcoded 180).

### 🔬 SENAR verification — scoped + cached
- Pytest gate runs ONLY tests for `relevant_files` (was: full suite always).
- `verification_runs` cache reuses green runs within 10-min TTL on same `files_hash`.
- Cache key includes resolved gate command — config changes invalidate stale entries.
- Security-sensitive files (auth/payment/jwt/oauth/sso/etc + .env/.pem/.key) bypass cache, always re-verify.
- Tier mapping fixed: simple→lightweight, medium→standard, complex→high (was hardcoded `lightweight`).
- v1.3 fix: `relevant_files=None` SKIPS instead of falling back to full suite (burned MCP 10s budget).
- Scoped-skip results NOT cached as verified — prevents silent QG-2 weakening.
- `tausik verify --task <slug>` for ad-hoc verification.

### 🎯 Agent-native planning (tool calls, not hours)
- Tier scale: trivial(≤10) / light(≤25) / moderate(≤60) / substantial(≤150) / deep(≤400+).
- `--call-budget` auto-derives tier; warning at 1.5×budget for re-calibration.
- `task start <slug> --force` bypasses session capacity gate (audit-logged).
- Custom stacks via `.tausik/config.json` (`custom_stacks`) without code changes.

### 🛡️ Memory Discipline — auto-memory protection
- PreToolUse hook blocks Write/Edit to `~/.claude/projects/*/memory/` from TAUSIK projects.
- Bypass via explicit `confirm: cross-project` marker in last user prompt.
- PostToolUse audit catches project-specific content that bypassed via regex (paths, slugs, tausik commands).
- Memory-block guard widened to ALL `~/.claude/**/memory/` (was: only `projects/<slug>/memory/`).

### 📦 Bootstrap deploy fix (CRITICAL — caught in v1.3 dogfooding)
- Built-in skills under `agents/skills/` are NOW source-of-truth — force-included in deploy.
- Was: explicit allowlist via `core_skills`/`extension_skills`/`installed_skills`. Saved config froze old list.
- Result: 9 missing core skills restored (review, brain, commit, debug, interview, markitdown, ship, skill-test, test).
- Smoke-test in `tests/test_bootstrap_skills_coverage.py` guards against future drift (4 cases).

### 🪝 Hooks
- `activity_event.py` (PostToolUse, broad matcher) — feeds active-time metric.
- `brain_post_webfetch.py` (PostToolUse, WebFetch) — auto-cache web responses.
- `brain_search_proactive.py` (PreToolUse, WebSearch|WebFetch) — mirror lookup before fetch.
- `memory_pretool_block.py` + `memory_posttool_audit.py` (Write|Edit|MultiEdit).
- Shared helpers in `_common.py`.
- Strip invisible separators (U+2028/2029/0085/VT/FF) before marker anchor matching.

### 🧪 DX & Framework Polish
- `task_done` accepts inline `--evidence` arg → log+done in one CLI call (was: two).
- `_verify_ac` accepts ✓/verified markers + literal "AC verified" — broader format tolerance.
- Refactored 4 files to stay under 400-line filesize gate: split session/role/stack subparsers + service helpers.
- 3 rounds of post-merge review: 5 HIGH + 11 MED + 4 LOW findings closed.
- Quality reviews + SENAR audit + adversarial critic spawn via `/review`.

### 📚 Docs
- `docs/en/{stacks, customization, upgrade, shared-brain}.md`.
- `docs/ru/shared-brain.md`.
- README EN/RU with v1.3 features.
- `references/anthropic-oss-applicability.md` — patterns survey.
- `references/markitdown-integration.md` — opt-in DOCX/PPTX/XLSX/HTML/EPUB.

### 🛠️ Misc
- `markitdown` opt-in capability (lazy import, zero-deps invariant preserved) + `tausik doc extract`.
- `tausik brain status` snapshot CLI.
- `tausik brain move <id> --to-brain|--to-local` cross-project ownership transfer.
- 5 SENAR Compliance table rows updated with v1.3 semantics.

### ⚙️ Config knobs (hardcode → `.tausik/config.json`)

Documented in `references/configuration.md`. Project-level overrides without forking:

- `verify_cache_ttl_seconds` (default 600) — verify-run reuse window.
- `session_warn_threshold_minutes` (default 150) — stop-hook reminder threshold.
- `session_idle_threshold_minutes` (default 10) — gap above which pause = AFK.
- `session_max_minutes` (default 180) — hard SENAR Rule 9.2 limit.
- `session_capacity_calls` (default 200) — per-session tool-call budget.
- `custom_stacks`, `gates`, `brain.*` — already documented in earlier tiers.

### 🩺 `tausik doctor` — health diagnostic
Single-command sanity check: venv + DB + MCP servers + core skills + bootstrap drift + config knobs + gates registry + active session. Exits 1 on any FAIL so CI can gate on it.

### 🛡️ `/zero-defect` skill (Maestro-inspired)
Session-scoped precision mode: 8 rules (read-before-write, verify-before-claim, no API hallucination, etc) for high-stakes work. Inspired by [Maestro](https://github.com/sharpdeveye/maestro) `/zero-defect`.

### 🔒 Hardening Pass (post-cycle audits)

6 audit cycles, 35+ findings closed:

- **Newline injection** scrubbed across epic/story/task/role/memory write paths via shared `safe_single_line` helper.
- **role_create** writes profile FS-first via temp+rename, then DB INSERT — no orphan files on either failure path.
- **role_delete** uses begin_tx/commit_tx (not raw BEGIN) so audit `event_add` honors transaction; cascade-NULLs `tasks.role` on `force=true`.
- **Migration v18** auto-seeds `roles` from `DISTINCT tasks.role` with normalization (lowercase, strip, space→hyphen) and rewrites `tasks.role` in-place — no orphan rows. `v18_seeded` meta flag set in BEGIN IMMEDIATE tx WITH the seed (atomic, idempotent across concurrent inits).
- **Bootstrap rmtree** now uses `onexc=` on Python 3.12+, `onerror=` legacy fallback, with chmod-and-retry for Windows readonly files.
- **Stack scaffold** atomic write retries on Windows `PermissionError` (4×100ms); cleans up `.tmp` on any failure path.
- **Doctor** ASCII fallback (`OK`/`WARN`/`FAIL`) when stdout encoding lacks UTF-8 (Windows cp1251); CRLF normalization in drift compare; pre-svc DB existence captured to surface "never initialized" cases.
- **Activity hook** uses `PRAGMA journal_mode=WAL` + `synchronous=NORMAL` to reduce per-call fsync overhead.
- **session_warn_threshold** clamped to `max(1, …)`.
- **Quality-gate WARN** when scoped-skip fires with no `relevant_files` (visible to user, not silent).
- **MCP handlers** parity: claude+cursor byte-identical for `_handle_stack_scaffold` (catches `ValueError`/`KeyError`).

### 🔐 Independent 6-agent review pass — 31 findings closed

After cycle-6 SHIP verdict, ran a SEPARATE round of 6 parallel independent reviewers (architecture / public API / security / performance / docs / cross-platform). Closed 31 additional findings across waves:

**Security (Wave 1)**
- `git push` gate now uses regex matching `(?:^|[\s;&|()` + variant`])git push\b` — catches `cd && git push`, `(git push)`, `/usr/bin/git push`, `git -c x=y push`. Old token-split bypass eliminated.
- Memory pretool block resolves symlinks/junctions: `os.path.realpath(parent)` after the literal-path check — symlink-into-`~/.claude/**/memory/` is now blocked.
- `TAUSIK_SKIP_HOOKS` no longer disables security gates blanket. Per-hook scoped: `TAUSIK_SKIP_PUSH_HOOK=1` / `TAUSIK_SKIP_MEMORY_HOOK=1`.
- Vendor skill `requires` validated against PEP 508 simple-spec regex; rejects entries starting with `-`. `pip install --` separator added so positional args can't be re-interpreted as flags.

**Data integrity (Wave 2)**
- `brain_project_registry._normalize_path` adds `unicodedata.normalize('NFC', ...)` — fixes macOS HFS+ NFD double-registration.
- `bootstrap_config.save_tausik_config` writes to `*.tmp` then `os.replace` — atomic, SIGINT-safe.

**Truth (Wave 3)**
- README badges and stat lines updated: 35 → 38 skills, 82 → 100 MCP tools, 13 → 19 hooks, 1095 → 2246 tests.
- CLAUDE.md "Команды" section expanded with full top-level command list.

**Performance (Wave 4)**
- `compute_active_minutes` SQL drops `julianday()` from WHERE clause — events `created_at` index now used. ~50× speedup on 100k-row tables.
- `bootstrap copy_dir` byte-compares before write — no-op re-bootstrap is now near-instant on Windows+AV.

**API parity (Wave 5)**
- `--group` → `--story` rename for `task add` (with `--group` deprecated alias for back-compat).
- 4 new MCP tools: `tausik_doctor`, `tausik_verify`, `tausik_stack_reset`, `tausik_stack_export` — close CLI/MCP parity gap.

**Operations (Wave 6-7)**
- File logging: `RotatingFileHandler` at `.tausik/tausik.log` (5MB × 3 backups) for WARNING+. Errors no longer disappear in MCP context.
- CI matrix expanded to `[ubuntu, windows, macos]` × `[3.11, 3.12, 3.13]` — Windows-only bugs caught.
- CI now runs mypy + bandit (warning-only) alongside ruff.

### 🔬 Independent 5-agent blind review hardening pass (pre-ship)

Before tagging 1.3.0 we ran an independent blind review with five parallel
agents (architecture / security / agent UX / documentation truth / quality
gates). 50 findings: 16 HIGH / 21 MED / 13 LOW. The pre-ship pass closes
all HIGH and the most-impactful MED findings — the rest are tracked for
v1.3.x patch releases.

**QG-2 enforcement holes closed**

- **`tausik_task_update status=done` bypass** — the most serious finding.
  A single MCP call could close any task, skipping QG-2, AC verification,
  scoped pytest, cascade, and `call_actual` recording. Now refused with
  explicit `ServiceError` pointing at the lifecycle method (`task_done` /
  `task_start` / `task_block` / `task_review`). The "QG-2 cannot be
  bypassed (--force removed)" claim is now end-to-end true.
- **All-skipped scoped pytest passing as green** — when `relevant_files`
  was supplied but no `tests/test_<basename>.py` matched (source file
  with deleted or missing test), gates returned `passed=True` and QG-2
  closed silently. Now returns synthetic FAIL with
  `status="no-test-mapped"` and a notes line pointing at the missing
  tests.

**Security pattern gaps closed**

- **Brain plaintext leak via `tags`/`stack`/`domain`/`severity`** — only
  named text fields (name/context/decision/rationale) were scrubbed; tags
  arrays passed through verbatim, so `tags=["my-app", "example.com"]`
  would leak the project name into Notion despite the SHA256-hash privacy
  claim. Now ALL string-valued props per category join the scrub haystack.
- **`memory_pretool_block` Linux/macOS bypass via case** — the
  `"memory" in segments` check was case-folded only on Windows.
  `~/.claude/projects/foo/MEMORY/x.md` (uppercase) slipped through on
  every other platform. Now lowercase unconditionally.
- **Security-sensitive token list extended** — `_SECURITY_PATH_TOKENS` and
  `_SECURITY_BASENAMES` now cover `webhook`, `csrf`, `xsrf`, `mfa`, `2fa`,
  `totp`, `api_key`, `apikey`, `permissions`, `acl`, `iam`, `rbac`, `jwt`,
  `oauth`, `session`, `signup`, `login` as bare tokens (match files at
  any depth, not just inside same-named directories).

**Agent UX — RAG discoverability fully closed**

User report: *"Claude grepping over the codebase instead of using our RAG"*.
Root cause was structural — the framework wires `codebase-rag` MCP into
`.mcp.json` but never tells the agent it exists. Closed across four layers:

- **Tool routing rubric in templates** — `bootstrap_templates.py` adds a
  TOOL_ROUTING block with a Need / Primary / Fallback table directing
  agents to `mcp__codebase-rag__search_code` first, `Grep` only as
  fallback. Propagates to all four IDE configs (CLAUDE.md / AGENTS.md /
  .cursorrules / QWEN.md).
- **Skill word swaps** — `agents/skills/zero-defect/SKILL.md` rule 3 and
  `agents/skills/debug/SKILL.md` Phase 0 step 5 previously said "grep
  the codebase" — now point at `search_code` first, with Grep as fallback.
- **`session_start.py` injects RAG status** — agent sees
  `RAG: N chunks indexed` / `RAG: empty — full reindex spawned in
  background` / `RAG: not initialised — reindex spawned` at every new
  session.
- **Auto-incremental reindex** — every SessionStart spawns
  `index_incremental` in a detached background process (returns in
  ~3 ms, never blocks the agent); pre-commit hook runs incremental with
  5-second timeout so committed changes land in the index before the
  next session. First run on a fresh project triggers `index_full`
  automatically. The agent no longer needs to know about `reindex`
  at all.

**Architecture — drift hazard removed**

- **`_FALLBACK_STACK_GATES` (190 LOC) dropped** from `default_gates.py`.
  This was a hardcoded copy of every stack-scoped gate that silently
  activated when `stack_registry` import failed — any change to
  `stacks/<name>/stack.json` would not appear if the registry hiccupped.
  Now: failure logs WARNING and returns empty dict; universal gates
  (filesize, ruff, mypy, bandit, tdd_order) remain hardcoded since
  they're not stack-scoped. File shrinks 290→101 LOC.

**Documentation truth — counts reconciled**

- **MCP tool count** corrected from "106 (96 project + 10 brain)" to the
  actual **96 (90 project + 6 brain)**. The "96" was an aspirational
  number that matched no reality. Updated in 12+ files.
- **Test count** corrected from "2232" / "2226" / "2235" (mixed across
  files) to the empirical **2246** (`pytest --collect-only`).
- **`docs/en/doctor.md`** intro fixed to "eight checks" and the critical
  skills list synced to the actual `project_cli_doctor.py` set:
  `{start, end, task, plan, review, brain, ship, checkpoint}`.

**Filesize gate compliance**

Four modules compacted to stay under the 400-line limit while adding new
guards: `service_task.py` 419→400, `service_verification.py` 413→358,
`brain_mcp_write.py` 437→375, `default_gates.py` 290→101.

**Tests added**

- `tests/test_v131_blind_review.py` — 11 regression tests covering each
  closed finding.
- `tests/test_hud_cli.py` updated to use `be.task_update` for direct
  status manipulation (the QG-2 path the test exercises is meant to
  bypass — now explicit via the backend layer).

**Tracked for v1.3.x patch releases (still open from review):** verify-
cache cross-check against git diff, CLI-into-backend layer cleanup,
6-finding hook hardening batch, 5-finding QG-2 hardening batch, 13 LOW
polish items.

### 📊 Stats
- **2246 tests passing** (1183 → 2246 over the cycle, +11 new from blind-review hardening).
- **96 MCP tools** (90 project + 10 brain), up from 80 in v1.2.0.
- **13 core skills + 25+ official/vendor on demand** — v1.3 lean-core split: workflow primitives auto-deploy, niche/opt-in skills (`/zero-defect`, `/markitdown`, `/skill-test`, `/audit`, `/docs`, ...) install via `tausik skill install <name>`. Up from 29 unconditionally-deployed skills in v1.2.
- **19 hooks** (was 13 — added `activity_event`, `memory_pretool_block`, `memory_posttool_audit`, `brain_post_webfetch`, `brain_search_proactive`, `task_call_counter`).
- **25 stacks** (was 20 — added 5 IaC: ansible, terraform, helm, kubernetes, docker).
- Schema version: 17 → 18 (added `roles`, `session_activity`, `verification_runs` tables).
- 11 new modules (4 service helpers, 3 parser splits, 2 hooks, 1 CLI handler, 1 doctor).

### Compatibility
- No breaking changes. Existing `.tausik/config.json` merges cleanly.
- Re-bootstrap recommended to pull deployed scripts/MCP servers/skills up to date.
- Migration v18 auto-seeds `roles` table from `DISTINCT tasks.role` — no manual setup needed.
- After upgrade the first session sees `RAG: not initialised — full reindex spawned in background` and auto-builds the index.

---

## [1.3.0-detail-stacks] — historical detail (folded into 1.3.0 above)

> Per-story detail of plugin stack architecture work. Shipped as part of v1.3.0 — listed here for archive only.

### Added — Stack plugin foundation (Story 1, plugin-foundation)

- **`stacks/_schema.json`** — JSON Schema (Draft-07) for stack declarations. Fields: `name` (required), `version`, `extends` (`builtin:NAME`), `detect` (list of `{file,type,keyword}` with `type ∈ exact|glob|dir-marker`), `extensions`, `filenames`, `path_hints`, `gates` (with `null` to disable), `guide_path`, `extensions_extra` (additive merge).
- **`scripts/stack_schema.py`** — `validate_decl(decl, source) -> list[str]` returns actionable errors per offending field; never silently skips. 12 edge-cases covered via smoke harness.
- **`scripts/stack_registry.py`** — `StackRegistry` class with `load_builtin`/`load_user`/`reload`, layered deep-merge (extensions_extra additive, gates per-key override + null disable), and accessors `signatures_for`/`extensions_for`/`filenames_for`/`path_hints_for`/`gates_for`/`guide_path_for`. Source tracking: `source_for(name)` returns `'builtin'|'user'|'overridden'|None`; `is_user_overridden(name)` for user-override detection.
- **`tests/test_stack_registry.py`** — 27 tests across `TestLoadBuiltin`, `TestUserOverrides`, `TestReload`, `TestAccessors`, `TestSourceTracking`.

### Added — 25 built-in stacks migrated to plugin layout (Story 2, migrate-builtins)

Each stack is now `stacks/<name>/{stack.json, guide.md}`. Source of truth shifted from 5 hardcoded modules to a single declarative file.

- **Python family** ([stacks/python/](stacks/python/), fastapi, django, flask) — pytest gate owns stacks=[python,fastapi,django,flask].
- **Frontend** (react, next, vue, nuxt, svelte, typescript, javascript) — typescript owns `tsc`; javascript owns `eslint`+`js-test`. Both gates list all 6 frontend frameworks in `stacks` field.
- **Native** (go, rust, java, kotlin, swift, flutter) — go owns `go-vet`+`golangci-lint`+`go-test`; rust owns `cargo-check`+`clippy`+`cargo-test`; java owns `javac`; kotlin owns `ktlint`.
- **PHP family** (php, laravel, blade) — php owns `phpstan`+`phpcs`+`phpunit`; blade extension `.blade.php` is union'd with `.php` stacks via compound-extension logic in dispatch.
- **IaC** (ansible, terraform, helm, kubernetes, docker) — each stack owns its lint gate (ansible-lint / terraform-validate / helm-lint / kubeval / hadolint). All three detect forms exercised: `exact` (Dockerfile, Chart.yaml), `glob` (`*.tf`), `dir-marker` (playbooks/, roles/, k8s/, manifests/, .kube/).
- **`agents/stacks/*.md`** removed; legacy fallback in bootstrap still finds these for partial-migration repos.

### Changed — 6 consumers refactored to use the registry (Story 3, refactor-consumers)

Hardcoded data moved to defensive registry lookups with hardcoded fallbacks for boot safety.

- **[scripts/project_types.py](scripts/project_types.py)** — `DEFAULT_STACKS` now computed from `default_registry().all_stacks()`; `_FALLBACK_STACKS` retains the pre-plugin hardcoded set. `VALID_STACKS` remains an alias for back-compat.
- **[bootstrap/bootstrap_config.py](bootstrap/bootstrap_config.py)** — `STACK_SIGNATURES` built via `_load_stack_signatures()`. Each registry `{file, type, keyword}` entry is rendered to the `(filename, keyword)` tuple form `_signature_match()` understands; `dir-marker` types get the trailing `/` they need.
- **[scripts/gate_stack_dispatch.py](scripts/gate_stack_dispatch.py)** — `_EXT_TO_STACKS`, `_FILENAME_TO_STACKS`, `_PATH_HINTS` invert per-stack registry data via `_build_dispatch_tables()`. Compound `.blade.php` keeps its `.blade.php ∪ .php` semantics.
- **[scripts/default_gates.py](scripts/default_gates.py)** — split into `UNIVERSAL_GATES` (5 hardcoded: filesize, tdd_order, ruff, mypy, bandit) ∪ `_build_stack_scoped_gates()` (20 from registry). Gate ownership lives in each `stacks/<name>/stack.json`; first-stack-wins for duplicate names (alphabetical iteration). `DEFAULT_GATES` is the merged total — consumers untouched.
- **[scripts/project_config.py](scripts/project_config.py)** — `STACK_GATE_MAP` is registry-derived transitively via DEFAULT_GATES; no code change needed.
- **[agents/{claude,cursor}/mcp/project/tools.py](agents/claude/mcp/project/tools.py)** — 4 inline JSON-Schema stack enums replaced by `_STACKS_ENUM` constant under fenced `# === BEGIN/END STACKS_ENUM ===` markers. Bootstrap regenerates the constant from the registry via `bootstrap_stacks.regenerate_mcp_stack_enums()`. Also adds the 5 IaC stacks (ansible, terraform, helm, kubernetes, docker) which were missing from the legacy hardcoded list.

### Added — User customization layer (Story 4, user-customization)

- **`.tausik/stacks/<name>/`** is a first-class layered registry. `extends: "builtin:NAME"` deep-merges over a built-in entry; missing `extends` with a known name is full replace; new names are standalone stacks. `null` gate value disables an inherited gate. `extensions_extra` is additive.
- **`bootstrap/bootstrap_stacks.py`** — extracted `copy_stacks` and added `regenerate_mcp_stack_enums()`. Bootstrap NEVER writes inside `.tausik/`; **`tests/test_bootstrap_non_destructive.py`** asserts this with 5 cases (override-untouched, override-of-builtin-name-untouched, target-isolation, no-`.tausik`-paths-written, idempotent across runs).
- **CLI: `tausik stack {export,diff,reset,lint}`** ([scripts/project_cli_stack.py](scripts/project_cli_stack.py)) — `export` prints the resolved decl; `diff` shows unified diff between built-in and user override; `reset` removes `.tausik/stacks/<name>/` (with `--yes`); `lint` validates every user override against the schema. `info` and `list` retain previous behaviour.
- **Bootstrap printout** — surfaces `.tausik/stacks/` overrides on every run; first-time users see a guidance line directing customization to the safe path.

### Added — Documentation (Story 5, documentation-overhaul)

- **[docs/en/stacks.md](docs/en/stacks.md)** — plugin layout, schema reference, adding new stacks, registry consumer table.
- **[docs/en/customization.md](docs/en/customization.md)** — override rules, merge semantics, validation tools, do/don't list.
- **[docs/en/upgrade.md](docs/en/upgrade.md)** — bootstrap-owned vs user-owned tree, upgrade workflow, breakage scenarios + recovery.
- CLAUDE.md QG-2 description amended for scoped-skip behaviour and `.tausik/stacks/` invariant.

### Fixed — pytest gate scoped-skip (defect of stack-schema-design)

- **Scoped pytest gate must skip, not fall back to full suite** ([scripts/gate_runner.py](scripts/gate_runner.py)) — Previously, when `relevant_files` was non-empty but `resolve_test_files_for_relevant()` returned no matches (e.g. a brand-new module without `tests/test_<basename>.py` yet), the gate substituted `tests/` and ran the **entire** 900+ test suite as a "regression-safe fallback". This silently turned every `task_done` on a new module into a 60s+ wait and defeated the scoping promise in CLAUDE.md ("гонит только `tests/test_<basename>.py` для каждого relevant_files"). Fix: introduced `_SCOPED_SKIP_SENTINEL` returned by `run_command_gate` when scoped resolution fails; `run_gates` translates it to a `skipped=True` result with message `"No test file maps to relevant_files via tests/test_<basename>.py heuristic; gate skipped (scoped run)."`. Empty `relevant_files` (no scoping data at all) still falls back to the full suite — that path is regression-safe and unchanged. (`pytest-gate-must-skip-when-scoped-relevant-files-h`)

### Test Coverage — pytest gate scoped-skip

- **3 new + 1 rewritten** in [tests/test_gates.py](tests/test_gates.py) class `TestPytestGateScopeSubstitution`: `test_scoped_run_with_no_test_mapping_skips` asserts the sentinel is returned and `subprocess.run` is **not** invoked; `test_unscoped_call_falls_back_to_full_suite` covers the empty-relevant_files path; `test_run_gates_translates_scoped_skip_into_skipped_result` verifies end-to-end conversion to `skipped=True` result entries.

### Added — Backlog finish (4 final planning tasks)

Last 4 planning tasks shipped — backlog drained to **388/388 done** (100%):

- **Brain status CLI + skill** ([scripts/brain_status.py](scripts/brain_status.py), [agents/skills/brain/SKILL.md](agents/skills/brain/SKILL.md)) — `tausik brain status [--json]` снапшот состояния brain: enabled, mirror path/size/last-modified, per-category row counts + last_pull_at + last_error from `sync_state`, registered projects (name/canonical/hash), last web_cache write. `collect_status()` graceful: missing mirror / unreadable config / empty registry → consistent dict с `error` field, без crash. Skill SKILL.md документирует. (`brain-skill-status`)
- **Brain move CLI + skill** ([scripts/brain_move.py](scripts/brain_move.py)) — `tausik brain move <id> --to-brain --kind <decision|pattern|gotcha>` или `--to-local --category <decisions|patterns|gotchas>`. Cross-project ownership check (source_project_hash должен совпадать с current project's hash; `--force` override). Web_cache → refused (no local counterpart). На to-local после успеха: archive Notion page (`pages.update(archived=true)`) + delete from mirror, unless `--keep-source`. Story `brain-tausik-integration` + epic `shared-brain` auto-closed. (`brain-skill-move`)
- **Anthropic OSS research** ([docs/research/anthropic-oss-applicability.md](docs/research/anthropic-oss-applicability.md)) — Surveyed 7 наиболее релевантных Anthropic OSS репозиториев (knowledge-work-plugins, anthropic-cli, agent-sdk-workshop, original_performance_takehome, skills, claude-code-action, financial-services-plugins). Identified 9 applicable patterns (5 simple, 3 medium, 1 complex). Top 3 recommended next tasks: `tausik-skill-manifest` (skill.yaml registry), `tausik-metrics-tiers` (bronze/silver/gold/platinum), `tausik-brain-swappable-backend` (decouple from Notion). (`research-anthropic-repos`)
- **markitdown opt-in integration** ([scripts/doc_extract.py](scripts/doc_extract.py), [skills-official/markitdown/SKILL.md](skills-official/markitdown/SKILL.md), [docs/research/markitdown-integration.md](docs/research/markitdown-integration.md)) — Discovery: TAUSIK не имел "ручных парсеров документов" — pdf/excel skills делегируют Claude Code `Read` tool. markitdown добавлен как **opt-in** capability (convention #19 zero-deps сохранён): lazy import + graceful `None` если не установлен. CLI `tausik doc extract <file>` + Python API `extract_to_markdown(path)`. Когда использовать: DOCX/PPTX/XLSX/HTML/EPUB. PDF redirect → `/pdf` skill. Future hook: `brain_post_webfetch` мог бы использовать для HTML conversion (noted, not implemented). (`markitdown-integration`)

### Test Coverage — Backlog finish

- **+39 tests** — `test_brain_status.py` (9 tests: disabled, config_load_error, missing_mirror, enabled_empty/with_data, registered_projects, registry_missing, format_status×2), `test_brain_move.py` (19 tests: TestMoveToBrain×10 включая happy paths + scrub_blocked + notion_error + token_missing + brain_disabled + bad_input + not_found + keep_source; TestMoveToLocal×8 включая cross-project ownership × force, web_cache refused, mirror archive), `test_doc_extract.py` (11 tests + 1 skipif integration: is_available, happy path, format_hint, falls_back_to_markdown_attr, missing markitdown/path/empty/exception/unexpected shape).

### Fixed — Review findings MED/LOW (story review-findings-mlow-fix, 11 issues)

Follow-up to the 5 HIGH fixes — 11 MEDIUM/LOW findings from the same multi-agent review:

- **A7 MED** ([scripts/gate_runner.py](scripts/gate_runner.py) `resolve_test_files_for_relevant`) — Resolver теперь использует `os.walk(tests/)` вместо `os.listdir`. Tests в nested dirs (`tests/integration/`, `tests/unit/scoped/`) корректно матчатся вместо silent fallback на full suite. Single-pass index by basename, дедуп между путями. (`review-mlow-resolver-recursive`)
- **B6+B7 MED** ([scripts/brain_schema.py](scripts/brain_schema.py) `_migrate`) — Добавлен `PRAGMA foreign_keys=OFF/ON` envelope (insurance для будущих FK-touching migrations) + `PRAGMA foreign_key_check` после COMMIT (raise on violations). Docstring документирует irreversibility контракт ("failed batch only rolls back current; previously committed migrations stay applied"). (`review-mlow-brain-safety`)
- **B2 MED** ([scripts/brain_project_registry.py](scripts/brain_project_registry.py) `_acquire_lock`) — Docstring документирует "single reclaim per call (reclaimed flag)" контракт + acknowledge небольшой TOCTOU window между `_is_stale_lock` и `os.unlink`. (`review-mlow-brain-safety`)
- **A5 LOW** ([scripts/service_verification.py](scripts/service_verification.py) `run_gates_with_cache`) — `append_notes_fn` теперь типизирован `Callable[[str, str], None] | None` (был `Any`). (`review-mlow-polish-batch`)
- **A6 LOW** ([scripts/project_cli_verify.py](scripts/project_cli_verify.py) `cmd_verify`) — На cache HIT пишется `events` row `action='verify_cache_hit'` для telemetry. Best-effort try/except — никогда не блокирует verify. (`review-mlow-polish-batch`)
- **B4 LOW** ([scripts/brain_init.py](scripts/brain_init.py) `create_brain_databases`) — Per-category try/except. Новый `PartialCreateError(NotionError)` с `created_ids` attribute — partial-create surface'ит реально-созданные ids в orphan-cleanup guidance вместо `<missing>`. (`review-mlow-polish-batch`)
- **B5 LOW** ([scripts/brain_init.py](scripts/brain_init.py) `CliIO.prompt`) — EOF/KeyboardInterrupt branches: `KeyboardInterrupt` → "Aborted by user (Ctrl+C)", `EOFError` → "Aborted: no input available (stdin closed/piped)". Раньше — общее "Aborted by user" вне зависимости от типа. (`review-mlow-polish-batch`)
- **C-L3 LOW** ([tests/test_brain_notion_client.py](tests/test_brain_notion_client.py) `test_token_not_in_retry_log`) — Добавлен `assert len(caplog.records) >= 1` чтобы поймать silent-pass на пустом caplog (дрейф logger config). (`review-mlow-polish-batch`)
- **A2 docstring** ([scripts/service_verification.py](scripts/service_verification.py) `run_gates_with_cache`) — Concurrency note: "WAL safe but duplicate rows accepted; BEGIN IMMEDIATE worse" — accepted limitation. (`review-mlow-polish-batch`)
- **A3 docstring** ([scripts/service_verification.py](scripts/service_verification.py) `compute_files_hash`) — mtime resolution caveat: NTFS 100ns / ext4 1μs / HFS+ 1s / FAT 2s — false cache hits possible на быстрых правках на FAT/HFS+, recommendation для таких FS. (`review-mlow-polish-batch`)

### Test Coverage — Review fixes

- **+8 hardening tests** — `test_gates.py` (+4 TestResolveTestFilesForRelevant: glob_subdirectory_test_files, glob_subdirectory_with_suffix_variants, dedup_when_test_appears_in_multiple_dirs, missing_tests_dir_returns_empty), `test_brain_init.py` (+3 partial create + EOF distinct messages), `test_brain_notion_client.py` (+1 caplog non-empty assertion).

### Fixed — Review findings (story review-findings-fix, 5 HIGH issues)

Multi-agent review caught 5 HIGH-severity findings post-merge of the SENAR verify redesign + hooks widening; addressed in this batch:

- **C1** ([scripts/hooks/memory_pretool_block.py](scripts/hooks/memory_pretool_block.py)) — Memory guard regression: `~/.claude/projects/abc/memory` (directory-form path, no trailing file) больше НЕ блокировался. `os.path.normpath` срезает trailing slash, потом `[:-1]` slice исключает `'memory'` из проверки. Старый guard `rest[1] == 'memory'` это ловил. Fix: `'memory' in segments` без `[:-1]` — basename `memory.md` всё ещё False (segment exact compare), но bare `memory` ловится. (`review-fix-c1-memory-guard-dir`)
- **A9** ([scripts/service_gates.py](scripts/service_gates.py) `_run_quality_gates`) — Tier mapping регрессия: scope hardcoded в `'lightweight'` для ВСЕХ задач. Нарушал SENAR Rule 5 — auditor querying `verification_runs WHERE scope='critical'` получал 0 строк. Fix: scope резолвится через `_determine_checklist_tier(task)` (simple→lightweight, medium→standard, complex→high), `is_security_sensitive(relevant_files)` override → `'critical'`. (`review-fix-a9-tier-mapping`)
- **A4** ([scripts/service_verification.py](scripts/service_verification.py)) — Security bypass дыры: `auth.py`/`payment.py`/`billing.py` в корне НЕ матчатся (требовало `/auth/` со слэшами). Также не покрыты oauth/sso/saml/crypto/secrets/keys/admin/rbac/webhook/jwt/session/2fa/mfa/signup/login/password. `.env`/`.pem`/`.key`/`.p12`/`.pfx`/`.crt`/`.asc`/`.gpg` extensions тоже игнорировались. Fix: `_SECURITY_PATH_TOKENS` расширен +16 tokens; новые `_SECURITY_BASENAMES` frozenset для root-level `*.py/.ts/.go`; новый `_SECURITY_EXTENSIONS` frozenset; `is_security_sensitive` объединяет 3 проверки. (`review-fix-a4-security-bypass-tokens`)
- **A1** ([scripts/service_verification.py](scripts/service_verification.py), [scripts/project_cli_verify.py](scripts/project_cli_verify.py)) — Cache key не включал резолвенный gate command. Изменение `project_config.DEFAULT_GATES['pytest']['command']` оставляло старые зелёные runs валидными → стейл-кэш с НОВОЙ командой. Fix: новый `resolve_gate_signature(trigger)` — sha256 over sorted gate name+command+severity tuples, 16-char hex; `cache_command` теперь `f'trigger=task-done|sig={sig}|files=...'`. На load_config failure → fallback `'unavailable'` (не блокирует verification). (`review-fix-a1-cache-key-includes-cmd`)
- **H2** ([tests/test_service_verification.py](tests/test_service_verification.py)) — Integration test gap: `run_gates_with_cache` (главный orchestrator) тестировался только через примитивы. Регрессия в `cache_command` formatting прошла бы незаметно. Fix: новая `TestRunGatesWithCacheIntegration` с 6 end-to-end сценариями (miss-then-hit, security bypass, mtime invalidation, red run, append_notes на hit/miss). (`review-fix-h2-cache-integration-test`)

### Added — SENAR verify redesign (epic senar-verify-redesign)

- **Scoped per-task pytest gate** ([scripts/gate_runner.py](scripts/gate_runner.py), [scripts/project_config.py](scripts/project_config.py)) — новый `{test_files_for_files}` substitution + `resolve_test_files_for_relevant(relevant_files)` (basename heuristic + glob `tests/test_<stem>_*.py` варианты + test-file passthrough). Default pytest gate command изменён на `pytest -x -q {test_files_for_files}`. Без `relevant_files` substitution выдаёт `tests/` — fallback на полный suite (regression-safe). Раньше: full pytest на каждом `task done` (~3 мин), что нарушало SENAR Rule 5 tiering и делало Rule 9.5 audit redundant. Теперь: scoped по relevant_files задачи (`senar-verify-tiered`, Phase 1) — Pytest gate теперь scoped, не full suite
- **Verification cache (verification_runs table + lookup)** ([scripts/service_verification.py](scripts/service_verification.py), schema v16) — `compute_files_hash` (SHA256 over canonical path + mtime_ns + size, sorted), `record_run`, `lookup_recent_for_task` (misses on red/files_hash mismatch/command mismatch/stale ≥10 мин), `is_security_sensitive` (hooks/, /auth/, /payment/, /payments/, /billing/ → cache disabled). `service_gates._run_quality_gates` теперь делает lookup до запуска gates — cache hit пропускает их + лог в notes "Gates: cache hit (verify run #X)". Security-sensitive файлы всегда re-verify, не доверяем cache (`senar-verify-tiered`, Phase 2) — Cache reuse: повторный task done на тех же файлах в окне 10 мин — мгновенно
- **`tausik verify` CLI** ([scripts/project_parser.py](scripts/project_parser.py), [scripts/project_cli_extra.py](scripts/project_cli_extra.py)) — `tausik verify [--task slug] [--scope {lightweight,standard,high,critical,manual}]` запускает gates scoped к relevant_files задачи (или unscoped) и записывает результат в `verification_runs`. Полезно для ad-hoc проверки в середине работы (`senar-verify-tiered`, Phase 2) — Ad-hoc verify CLI с записью в кэш
- **CLAUDE.md QG-2/Rule 5 переписаны** — раздел "QG-2 Implementation Gate" (`Ограничения`) явно описывает scoped pytest + cache window + security bypass; раздел "Rule 5 Verification Checklist" в SENAR Compliance таблице обновлён с упоминанием scope-by-relevant_files; Архитектура секция добавляет `service_verification.py` к Gates слою (`senar-verify-tiered`, Phase 3) — Документация QG-2 отражает новый scoped + cache flow

### Test Coverage — SENAR verify

- **+30 unit tests** в `test_service_verification.py` — `compute_files_hash` (empty, none, mtime change, order-independent, missing sentinel, file appearance, skip non-string), `is_security_sensitive` (5 positive paths, 4 negative, empty/none, any-match), `record_run` + `lookup_recent_for_task` (hit, no-runs, files_hash mismatch, command mismatch, red run, stale, takes most recent, empty slug), `is_cache_allowed` (safe/security/empty)
- **+13 unit tests** в `test_gates.py` — `TestResolveTestFilesForRelevant` (empty, basename match, glob suffixes, no match, test-file passthrough, dedup, nonexistent paths, non-string entries, Windows backslash) + `TestPytestGateScopeSubstitution` (substitution uses mapped tests, falls back to full suite, default uses new substitution token)

## [1.3.0-detail-brain] — historical detail (folded into 1.3.0 above)

> Per-story detail of Shared Brain work. Shipped as part of v1.3.0 — listed here for archive only.

Cross-project knowledge layer backed by Notion, complementing the per-project `.tausik/tausik.db`. Only knowledge flagged as *generalizable* reaches the brain; project-specific traces stay local. Read-path fully implemented and offline-tested end-to-end; write-path and MCP tooling are the next story. 6 tasks done from epic `shared-brain` / 22 total. Кросс-проектный слой знаний на базе Notion.

### Added / Добавлено

- **Design doc** ([docs/en/brain-db-schema.md](docs/en/brain-db-schema.md)) — full spec of 4 Notion databases (`decisions`, `web_cache`, `patterns`, `gotchas`): property types + obligation, JSON `pages.create` payload for each, delta-pull mechanics (`last_edited_time` high-water mark), rate-limit handling, 7 trade-offs discussed, 8 negative-scenario fallbacks, privacy model (`SHA256(project_name_canonical)[:16]`) — Design-doc, без которого остальные задачи бы плавали
- **Local SQLite mirror** ([scripts/brain_schema.py](scripts/brain_schema.py)) — 4 tables mirroring Notion properties 1:1, FTS5 virtual tables with `unicode61 remove_diacritics 2` tokenizer (Cyrillic works), AI/AD/AU triggers per table, CHECK constraints for `generalizable` / `confidence` / `severity` / `sync_state.category`, 13 indexes covering delta-pull and dedup hot paths — Локальное FTS5-зеркало с поддержкой кириллицы
- **Brain config section** ([scripts/brain_config.py](scripts/brain_config.py)) — `DEFAULT_BRAIN` with safe defaults (enabled=false, mirror path, token env name, empty db-ids), `load_brain` / `is_brain_enabled` / `validate_brain` (returns error list, strict only when enabled=true) / `get_brain_mirror_path` (expands `~` and `$ENV`) / `compute_project_hash` (canonicalize then SHA256[:16]). Token is never stored in config — only the env-var name — Секция конфига с приватностью
- **Notion REST client** ([scripts/brain_notion_client.py](scripts/brain_notion_client.py)) — stdlib-only (urllib + http), zero external deps. Public API: `pages_create` / `pages_retrieve` / `pages_update` / `databases_query` / `iter_database_query` (auto-pagination iterator) / `search`. Write-side throttle 350 ms, 429/5xx retry with `Retry-After` and exponential backoff (2^n ± 20% jitter, cap 30 s), auth/not-found bypass retry, injected `urlopen`/`clock`/`sleep` for deterministic tests — REST-клиент без внешних зависимостей
- **Pull-sync engine** ([scripts/brain_sync.py](scripts/brain_sync.py)) — `open_brain_db` (creates parent dir, applies schema), per-category mapper (Notion `title`/`rich_text`/`multi_select`/`select`/`date`/`checkbox`/`url`/`number` → SQLite columns), `upsert_page` (INSERT OR REPLACE by `notion_page_id`), `sync_category` (delta filter by `last_pull_at`, ascending sort, advances high-water mark, records `last_error` on failure and re-raises), `sync_all` (continues after a single-category failure) — Делта-синк Notion → local
- **Local FTS5 search** ([scripts/brain_search.py](scripts/brain_search.py)) — `sanitize_fts_query` (neutralizes FTS5 operators via phrase-quoting; escapes inner `"` as `""`), `search_local` (bm25 ranking, global sort across 4 categories, `limit`/`offset`, category filter), `get_by_id` (exact lookup), SQL `snippet()` with `[...]` markers — Быстрый поиск по локальному зеркалу
- **Docs** — EN [docs/en/shared-brain.md](docs/en/shared-brain.md) and RU [docs/ru/shared-brain.md](docs/ru/shared-brain.md): philosophy (generalizable only), ASCII architecture diagram, manual setup steps (parent page → 4 databases → integration → token env → config → smoke-test), privacy contract, 7-row edge-cases table covering revoked token / rate-limit / offline / oversized content / scrubbing miss / schema drift / hash collision. README EN/RU have a short "Shared Brain" section linking to docs — Документация EN/RU + секции в README
- **PostToolUse WebFetch auto-cache hook** ([scripts/hooks/brain_post_webfetch.py](scripts/hooks/brain_post_webfetch.py)) — парный к PreToolUse `brain_search_proactive`: каждый успешный `WebFetch` автоматически уходит в `brain_web_cache` через `brain_mcp_write.store_record`, так что следующий fetch того же URL блокируется читающим хуком. Non-blocking (exit 0); пропускает приватные URL (`brain.private_url_patterns`), HTTP ≥ 400, пустые ответы, уже-свежие URL в зеркале, использует `response.url` вместо `input.url` после редиректа, обрезает content по 200 KB и stdin по 1 MiB. Scrubbing-блоки (private_urls / project_names_blocklist) тихо скипятся — это ожидаемое поведение, а не баг. Диагностика через `TAUSIK_BRAIN_HOOK_DEBUG=1`. `WebSearch` намеренно не кэшируется: в ответе несколько URL в одном блобе, нет канонического ключа; поисковые запросы обслуживаются FTS5 по контенту, записанному через `WebFetch` — PostToolUse хук для auto-cache web результатов
- **Brain runtime write helper** ([scripts/brain_runtime.py](scripts/brain_runtime.py)) — `try_brain_write_web_cache(url, content, cfg, *, query, title)` повторяет контракт `try_brain_write_decision`: `(True, page_id)` на `ok`/`ok_not_mirrored`, `(False, reason)` на token missing / scrub block / notion error / exception. Используется хуком и будущими callers (brain-skill-ui). Также выделен shared `_format_scrub_detectors` — surface только detector names, никогда raw `match` — Раннтайм-хелпер записи web_cache
- **Shared brain-hook utilities** ([scripts/brain_hook_utils.py](scripts/brain_hook_utils.py)) — `parse_iso_to_epoch`, `lookup_exact_url`, `is_fresh` вынесены из `brain_search_proactive.py`, чтобы пара Pre+Post хуков WebFetch делила одну реализацию mirror-lookup и TTL-семантики. `lookup_exact_url` корректно разбирает смешанные ISO-форматы (`Z` vs `.000Z`) — сортирует по parsed epoch, а не лексикографически по TEXT — Общие хелперы для brain-хуков
- **Hook registration** — `bootstrap_generate.py` регистрирует `brain_post_webfetch.py` на PostToolUse с matcher=`WebFetch`, timeout=10s. PreToolUse matcher `WebSearch|WebFetch` остался за `brain_search_proactive.py` — Регистрация в bootstrap
- **`/brain` skill** ([agents/skills/brain/SKILL.md](agents/skills/brain/SKILL.md)) — conversational UI над brain MCP tools: `/brain query <text>` → `brain_search`, `/brain store <type> <text>` → `tausik decide` или `brain_store_*`, `/brain show <id> <category>` → `brain_get`. Документирует bypass-маркеры (`refresh: web_cache`, `confirm: cross-project`), поведение при disabled brain, правила scrubbing. Не изобретает tool names — каждая подкоманда мапится на существующий MCP tool или CLI. `move` и `status` подкоманды вынесены в follow-up tasks `brain-skill-move` + `brain-skill-status` (нужны новые backend'ы) — `/brain` skill для query/store/show
- **`brain_runtime.open_brain_deps()`** ([scripts/brain_runtime.py](scripts/brain_runtime.py)) — shared `(conn, client, cfg)` primitive с None-семантикой: `(None, None, cfg)` если brain disabled, `(conn, None, cfg)` если token env unset, `(conn, client, cfg)` happy path. Fold: `_open_deps` + `_build_client` удалены из `agents/claude/mcp/brain/handlers.py` и `agents/cursor/mcp/brain/handlers.py` — оба импортируют из brain_runtime. Устраняет дубликат ~20 строк × 2 файла. Также добавлен `_FAST_FALLBACK_TIMEOUT = 5.0` как shared константа — Общий helper setup'а brain-зависимостей

### Fixed / Исправлено — Storage hardening batch

Пакет из 6 MED-исправлений в `brain_sync` + `brain_config` + `brain_runtime`, найденных при review2:

- **WAL mode** ([scripts/brain_sync.py](scripts/brain_sync.py) `open_brain_db`) — `PRAGMA journal_mode=WAL` сразу после connect, перед `apply_schema`. Устраняет SQLITE_BUSY между concurrent sync'ом и MCP read'ом на одном mirror'е. WAL — best-effort: `:memory:` / read-only FS / сетевые диски silently откатываются к default rollback journal, не raise (`brain-schema-wal-mode`) — WAL для параллельного чтения и записи
- **ISO timestamp compare** ([scripts/brain_sync.py](scripts/brain_sync.py) `sync_category`) — max_edited вычисляется через `_iso_epoch` (parsed UTC seconds), не лексикографически. Исправлен баг: `"...10:00:00Z"` > `"...10:00:00.000Z"` в ASCII-сравнении, но это ТОТ ЖЕ момент. Без фикса cursor мог регрессировать, если в батче смешаны форматы. Использует `brain_hook_utils.parse_iso_to_epoch` (shared с brain-search-proactive) (`brain-sync-iso-timestamp-compare`) — Корректный temporal compare смешанных ISO-форматов
- **Single-transaction atomicity** ([scripts/brain_sync.py](scripts/brain_sync.py) `sync_category`) — success path: один `conn.commit()` после всех upsert'ов и cursor-update'а. Error path: `conn.rollback()` снимает partial upsert'ы, затем отдельная best-effort tx пишет `last_error` в `sync_state`. Раньше было 2 commit'а в except-ветке — partial state при падении между ними (`brain-sync-transaction-atomicity`) — Атомарная single-tx sync-операция
- **Strict `after` cursor filter** ([scripts/brain_sync.py](scripts/brain_sync.py) `_make_filter`) — `{"last_edited_time": {"after": cursor}}` вместо `on_or_after`. Boundary-страница (edited == cursor) больше не re-fetches на каждом sync'е (`brain-sync-cursor-advance`) — Исключение boundary re-fetch
- **NFC normalization** ([scripts/brain_config.py](scripts/brain_config.py) `compute_project_hash`) — `unicodedata.normalize("NFC", name)` перед canonicalize/hash. Фикс: precomposed é (U+00E9) и decomposed e+U+0301 давали разные project_hash → двойная регистрация одного проекта (`brain-config-unicode-nfc`) — Единый hash для NFC и NFD имён
- **Mirror-path contract** ([scripts/brain_runtime.py](scripts/brain_runtime.py) `try_brain_write_*`) — оба wrapper'а теперь зовут `get_brain_mirror_path()` без аргумента. Раньше передавали уже-merged brain dict → `load_brain(merged).get("brain", {})` = `{}` → user's `local_mirror_path` silently отбрасывался, использовался DEFAULT. Regression-тесты с patched `load_config` + captured `open_brain_db` arg (`brain-config-mirror-path-contract`) — Пользовательский mirror path больше не теряется

### Changed / Изменено

- **brain_sync split** — Notion property readers + per-category mappers (`_concat_text`, `_read_prop`, `_prop_*`, `map_decision` / `map_web_cache` / `map_pattern` / `map_gotcha` + `MAPPERS_BY_CATEGORY`) вынесены в новый [scripts/brain_notion_props.py](scripts/brain_notion_props.py) (~142 lines). `brain_sync.py` сократился до 328 lines — под 400-line filesize gate. `map_page_to_row` остался в brain_sync как dispatcher — Выделение Notion parsers в отдельный модуль

### Fixed / Исправлено — review3 pass

4 findings from the third defensive review pass on commits af0a156 / 4a24c1a / 2e56a64:

- **[M1] `get_brain_mirror_path` shape detection** ([scripts/brain_config.py](scripts/brain_config.py)) — функция теперь принимает три формы: `None` (consults load_config), top-level `{"brain": {...}}`, и already-merged brain dict `{"enabled": ..., "local_mirror_path": ...}`. Детектит merged по отсутствию ключа `"brain"` + наличию любого из merged-shape маркеров (`enabled` / `local_mirror_path` / `database_ids`). Устраняет footgun: предыдущий фикс в `brain_runtime.try_brain_write_*` обходил баг через `get_brain_mirror_path()` без аргумента, но сама функция оставалась миной для будущих callers. Regression-тесты для обеих shapes — Контракт функции поддерживает обе shape
- **[M1 docs] docs/en|ru/shared-brain.md** — smoke-test snippet упрощён: `load_brain()` + `validate_brain()` + `get_brain_mirror_path()` все без аргументов, плюс параграф про три поддерживаемые формы входа — Документация смоук-теста без ambiguous cfg
- **[M2] Hoisted import** ([scripts/brain_sync.py](scripts/brain_sync.py)) — `from brain_hook_utils import parse_iso_to_epoch` на module scope. Раньше импорт был внутри `_iso_epoch` (вызывается per-page в sync loop) — per-call attribute lookup на холодном sync'е тысяч страниц — Импорт вынесен из hot loop
- **[L1] auto-BEGIN invariant comment** ([scripts/brain_sync.py](scripts/brain_sync.py) `sync_category`) — inline-комментарий фиксирует инвариант: `conn.rollback()` в except-ветке полагается на implicit BEGIN от первого `upsert_page`. Если рефакторинг добавит DML раньше в `_get_sync_state`, rollback boundary изменится — Комментарий защищает rollback-инвариант
- **[L2] Dead test удалён** ([tests/test_brain_storage_hardening.py](tests/test_brain_storage_hardening.py)) — `test_memory_db_falls_back_silently` не вызывал `open_brain_db`, тестировал поведение sqlite3 напрямую. `test_wal_failure_does_not_raise` покрывает настоящий контракт — Лишний тест сняли

### Added — MCP write/read hardening batch

- **Token-missing warning in MCP read handlers** ([agents/{claude,cursor}/mcp/brain/handlers.py](agents/claude/mcp/brain/handlers.py)) — `handle_brain_search` и `handle_brain_get` теперь явно сигналят пользователю когда `cfg.enabled=true` но `client=None` (token env unset): инжектят warning с именем env-переменной из `cfg.notion_integration_token_env` в первый слот `result.warnings`. Раньше handler молча пропускал Notion fallback — пользователь не отличал offline от no-token. Generic fallback текст когда `notion_integration_token_env` отсутствует/пуст. Disabled brain не получает warning (status quo) (`brain-mcp-token-missing-warning`) — Явный warning о ненастроенном токене вместо тихого пропуска

### Fixed — MCP write/read hardening batch

- **Dead category-fallback removed** ([scripts/brain_mcp_write.py](scripts/brain_mcp_write.py) `format_store_result`) — `cat = result.get("error_category") or result.get("category") or "unknown"` упрощено до `result.get("error_category") or "unknown"`. `store_record` пишет только `error_category` — мёртвая ветка скрывала бы будущие typos (`brain-mcp-write-dead-code-cleanup`) — Убрана defensive ветка, скрывавшая typos

### Changed — Hooks widening batch

- **Memory-block guard расширен на .claude/\*\*/memory/** ([scripts/hooks/memory_pretool_block.py](scripts/hooks/memory_pretool_block.py)) — `_is_in_claude_memory` теперь матчит любой `memory` сегмент под `~/.claude/`, а не только `projects/<slug>/memory/`. Silently-unguarded paths (`~/.claude/memory/`, `~/.claude/agents/<name>/memory/`, `~/.claude/plugins/.../memory/`) теперь блокируются. `memory_posttool_audit` расширяется автоматически (импортирует `is_in_claude_memory`). BLOCKED stderr обновлён. Файл с именем `memory.md` (не под директорией `memory/`) не блокируется. Substring `somememory/` / `memoryold/` тоже не ложноблокируются (`hooks-pretool-block-path-patterns`) — Гвард памяти теперь ловит все поддиректории memory под .claude/
- **Slug regex расширен с {2,} до {1,}** ([scripts/hooks/memory_markers.py](scripts/hooks/memory_markers.py)) — `_SLUG_RE` ловит 2-сегментные slug'и (`my-app`, `brain-init`, `acme-portal`), но `detect_markers` применяет precision guard: 2-seg slug попадает в результат только при корреляции с higher-precision детектором (`abs_path` / `src_file` / `tausik_cmd`) или 3+ seg slug'ом в том же тексте. Standalone 2-seg slug → empty (консервативно, английские kebab-compounds типа `kebab-case` / `ts-node` / `switch-case` / `double-quoted` / `single-quoted` не флагуются) (`hooks-markers-slug-regex-widen`) — Ловим короткие project slug'и при корреляции, не шумим на English kebab

### Added — Misc hardening batch (Batch 4)

- **Qwen Code brain MCP registration** ([bootstrap/bootstrap_qwen.py](bootstrap/bootstrap_qwen.py)) — `generate_settings_qwen` теперь регистрирует `tausik-brain` MCP server параллельно `tausik-project`/`codebase-rag` (тот же pattern что в `bootstrap_generate.py:241-246`). Раньше Qwen users молча оставались без brain. Silent skip когда `target_dir/mcp/brain/server.py` отсутствует — не ломает чистые qwen-only проекты (`bootstrap-qwen-brain-mcp`) — Qwen users теперь получают brain MCP при bootstrap
- **Brain schema migration path** ([scripts/brain_schema.py](scripts/brain_schema.py)) — `apply_schema` теперь читает `brain_meta.schema_version` после CREATE TABLE; если db_version > SCHEMA_VERSION → `RuntimeError("Brain DB schema vN newer than code v1; update tausik-lib")` (newer-code guard); если db_version < SCHEMA_VERSION → запускает новый `_migrate(conn, from_version)` helper. `BRAIN_MIGRATIONS = {}` placeholder dict с docstring контракта (sorted-by-key, single-tx, irreversible, bump после успешного COMMIT). Раньше `SCHEMA_VERSION=1` записывался но никогда не читался — нет ALTER strategy для будущих v2/v3 (`brain-schema-migration-path`) — Foundation для будущих brain schema bump'ов

### Added — Init/registry hardening batch

- **Orphan database cleanup guidance** ([scripts/brain_init.py](scripts/brain_init.py) `run_wizard`) — пост-create секция (register_project + all_project_names + config_ops.save) обёрнута в try/except. На любую ошибку после успешного `create_brain_databases` новый helper `_print_orphan_cleanup_guidance` печатает все 4 `category: db_id (title)` с инструкцией Archive via Notion UI, затем raise `WizardError("Post-create step failed ...")`. Раньше пользователь получал orphan Notion databases и не знал какие именно архивировать. Покрытие: registry RegistryLockError, config_ops.save OSError, happy path не регрессирует (`brain-init-orphan-cleanup`) — Видимая cleanup-инструкция вместо тихих orphan-ов
- **CliIO EOF/KeyboardInterrupt → WizardError** ([scripts/brain_init.py](scripts/brain_init.py)) — default `CliIO` поднята на module-level (раньше локальный `_CliIO` в `cmd_brain`); `prompt()` оборачивает `input()` в `try/except (EOFError, KeyboardInterrupt)` → raise `WizardError("Aborted by user.")` вместо raw traceback. project_cli_ops.cmd_brain использует `brain_init.CliIO`. Покрывает: piped stdin (EOFError) и Ctrl+C (KeyboardInterrupt) во время interactive wizard prompt'ов (`brain-init-input-error-handling`) — Чистый abort вместо traceback при piped stdin / Ctrl+C
- **Stale-lock recovery** ([scripts/brain_project_registry.py](scripts/brain_project_registry.py) `_acquire_lock`) — SIGKILL'нутый wizard оставлял `.lock` файл навсегда: новые `init`/`register_project` зависали до timeout. Новые `_pid_alive(pid)` (OS-агностичный через `os.kill(pid,0)`, корректно обрабатывает ProcessLookupError/PermissionError/Windows ERROR_INVALID_PARAMETER) + `_is_stale_lock(lock_path)` (stale если pid мёртв ИЛИ mtime > `_STALE_LOCK_AGE_S=30s`). На FileExistsError проверяем stale → unlink + log warning + retry (ровно 1 раз через `reclaimed` flag). Регрессия: live + fresh lock всё ещё блокирует. Boundary cases: malformed lock content fall-back на mtime, read OSError → not stale (conservative) (`brain-registry-stale-lock-recovery`) — Wizard recovery от orphan locks без manual cleanup

### Test Coverage / Тесты

- **+102 new tests** — `test_brain_schema.py` (17), `test_brain_config.py` (20), `test_brain_notion_client.py` (26), `test_brain_sync.py` (15), `test_brain_search.py` (24). Entire brain-suite green in 2 s; no network I/O (client tests inject `_Recorder`/`_ClockSleep`). Pre-existing 918 tests unaffected.
- **+19 hardening tests** — `test_brain_mcp_handlers.py` (+6 token-missing warning + boundary), `test_brain_mcp_write.py` (+3 NotionAuthError/RateLimitError(retry_after=42)/RateLimitError(retry_after=None default) + 2 ok_not_mirrored on upsert/map_page_to_row failure + 1 typo `category` → unknown), `test_brain_notion_client.py` (+7 secret-leak defense: `_LEAK_TOKEN` not in `repr(client)`, `NotionAuthError`/`NotionNotFoundError`/`NotionRateLimitError`/`NotionServerError`/`NotionNetworkError` strings + `caplog` retry log) (`brain-mcp-write-error-class-tests`, `brain-mcp-write-ok-not-mirrored-test`, `brain-notion-client-secret-leak-test`)
- **+9 hooks widening tests** — `test_memory_pretool_block_hook.py` (+3 new block paths: bare_claude_memory, agents_memory, deeply_nested_memory + 3 negatives: memory.md file, somememory/, memoryold/), `test_memory_markers.py` (+6 TestTwoSegmentSlugs: standalone 2-seg dropped, corroborated with abs_path/src_file/tausik_cmd/3seg-slug kept, 3-seg alone regression) (`hooks-pretool-block-path-patterns`, `hooks-markers-slug-regex-widen`)
- **+10 init/registry tests** — `test_brain_init.py` (+3: registry_failure_prints_orphan_guidance, config_save_failure_prints_orphan_guidance, happy_path_prints_no_orphan_guidance), `test_brain_project_registry.py` (+7: dead_pid_reclaimed, expired_mtime_reclaimed, live_fresh_not_reclaimed regression, malformed_reclaimed_after_ttl, malformed_fresh_blocks boundary, is_stale_lock_missing_returns_false, pid_alive_rejects_nonpositive) (`brain-init-orphan-cleanup`, `brain-registry-stale-lock-recovery`)
- **+3 CliIO tests** — `test_brain_init.py` (TestCliIOPrompt: returns_input_normally, eof_raises_wizard_error, keyboard_interrupt_raises_wizard_error) (`brain-init-input-error-handling`)
- **+3 qwen MCP tests** — `test_bootstrap_qwen.py` (qwen_registers_brain_when_server_present, qwen_skips_brain_when_server_missing, qwen_preserves_user_added_servers) (`bootstrap-qwen-brain-mcp`)
- **+5 brain schema migration tests** — `test_brain_schema.py` (BRAIN_MIGRATIONS dict exists, apply_schema idempotent when migrations empty, raises_when_db_newer guard, migrate_applies_pending_versions, migrate_skips_already_applied, migrate_rolls_back_on_failure) (`brain-schema-migration-path`)

### Knowledge Captured / Накоплено знаний

- **Decision #30** — 4 Notion databases, not one flat table (UX outweighs sync overhead)
- **Decision #31** — `SHA256(canonical)[:16]` privacy hash (64 bits, no plaintext project names)
- **Decision #32** — separate `Content Hash` column for `web_cache` dedup (URL changes over time)
- **Decision #33** — inject `urlopen` / `clock` / `sleep` via constructor instead of global monkeypatch
- **Gotcha #34** — FTS5 MATCH treats `-` as column-qualifier; wrap queries in `"..."` or avoid hyphens in markers
- **Convention #35** — `brain-*` modules are separate files (`brain_config.py`, `brain_schema.py`, ...), never folded into `project_config.py` — the 400-line file limit is real

## [1.3.0-pre] — 2026-04-23 — Memory Discipline (folded into 1.3.0 release above)

### Memory-Discipline Epic — auto-memory protection

Protects Claude's cross-project auto-memory (`~/.claude/projects/*/memory/`) from accidental project-specific writes. Project knowledge belongs in TAUSIK's per-project SQLite store (`tausik memory add`); the user's home memory is for cross-project preferences only. 8 tasks shipped across 3 stories. Защита Claude auto-memory от случайного проектного контекста.

### Added / Добавлено

- **PreToolUse memory block** (`scripts/hooks/memory_pretool_block.py`) — blocks Write/Edit/MultiEdit to `~/.claude/projects/*/memory/` from any TAUSIK project with a guidance message. Bypass via the `confirm: cross-project` marker in the user's latest prompt — hook parses the Claude Code transcript JSONL, honors both flat-string and list-of-content-blocks message shapes, and skips tool_result turns when finding the real user message — Блокирует записи в auto-memory с escape-маркером для кросс-проектных случаев
- **PostToolUse memory audit** (`scripts/hooks/memory_posttool_audit.py`) — safety-net that runs after every auto-memory write, scans the file with a regex marker set (absolute paths, kebab slugs ≥3 parts, `.tausik/tausik` commands, `scripts/*.py` file refs), emits a stderr warning listing up to 5 matches. Warning-only (exit 0) — catches content that bypassed the marker by accident — Аудит после записи с детектом проектных markers
- **Memory marker regex module** (`scripts/hooks/memory_markers.py`) — stdlib-only `detect_markers(text) -> list[Match]` with 4 precision-tuned pattern kinds (`abs_path`, `slug`, `tausik_cmd`, `src_file`); tuned against 14 cross-project preference strings ("user prefers Russian", "likes pytest", "uses VS Code", kebab-case lookalikes) to keep false positives at zero. Shared with upcoming brain-scrubbing pipeline — Отдельный модуль regex для переиспользования
- **Memory Policy rule in context injection** — `build_memory_block()` now begins with a ⚠ warning line explaining the TAUSIK-vs-auto-memory split, visible to the agent on every session start and `/checkpoint`. `session_start.py` Reminders gain a matching bullet so fresh projects (empty DB) still see the rule — Правило политики памяти в инжекте сессии
- **Hook registration** — `bootstrap_generate.py` + `bootstrap_qwen.py` wire both new hooks into PreToolUse / PostToolUse under matcher `Write|Edit|MultiEdit` for Claude Code and Qwen Code alike — Регистрация в bootstrap для обоих IDE

### Changed / Изменено

- **Hook count:** 11 → 13 (added `memory_pretool_block`, `memory_posttool_audit`) — 13 hook-ов в сумме
- **`is_in_claude_memory`** public alias added to `memory_pretool_block.py` so other hooks can import a stable name instead of the underscore-prefixed internal — Стабильный public API между hook-ами

### Fixed / Исправлено

- **Windows stderr encoding** — hook block messages used unicode arrows (`→`) that rendered as literal `→` on cp1251 consoles; replaced with ASCII `->` in user-facing warning text — Windows consoles больше не портят сообщения hook-ов

### Test Coverage / Тесты

- **+78 new tests** — 1105 → 1183 passing. `test_memory_pretool_block_hook.py` (30 cases: block/allow/bypass/tool_result/settings), `test_memory_markers.py` (29 cases: positive × kind, negatives × 14 preferences, dedup, edge, perf budget), `test_memory_posttool_audit_hook.py` (21+ cases: detection, silence on clean writes, non-audited paths, graceful, truncation `...and N more`, binary content, tool_input variants, settings registration)

## [1.2.0] — 2026-04-17

### Claude-Hardening Epic — anti-drift infrastructure

Inspired by [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) (staged pipelines, Ralph mode, keyword-detector), [prompt-master](https://github.com/nidhinjs/prompt-master) (load-bearing text, Memory Block, 9 dimensions of intent), and the leaked Claude Code architecture analysis on Habr (KAIROS always-on assistant, Dream System memory consolidation). Addresses the real-world problem that agents "drift" — ignore the framework, skip task creation, forget conventions between sessions. 18 tasks shipped across 4 stories (P0/P1/P2/P3).

### Added / Добавлено

- **Load-bearing CLAUDE.md / AGENTS.md / .cursorrules / QWEN.md templates** — generated IDE instructions went from ~30 lines to ~104 lines each, with 13 hard constraints, workflow graph, memory types table, SENAR rules reference, DYNAMIC block. All four IDE files share a single source of truth in `bootstrap/bootstrap_templates.py` (no more drift between IDEs) — Единый источник CLAUDE/AGENTS/cursorrules/QWEN
- **SessionStart hook** (`scripts/hooks/session_start.py`) — auto-injects TAUSIK state (status, active tasks, blocked tasks, Memory Block) into every new Claude Code / Qwen Code session; no manual `/start` needed — SessionStart хук с автоинъекцией состояния
- **UserPromptSubmit hook** (`scripts/hooks/user_prompt_submit.py`) — detects coding-intent keywords in user prompts (EN+RU) and nudges the agent to check for an active task before writing code — Детектор coding-intent с напоминанием
- **Stop hooks** — `scripts/hooks/keyword_detector.py` (drift-announcement detection in agent's last message — blocks stop if "I'll implement" without active task) and `scripts/hooks/session_cleanup_check.py` (warns about open exploration, review-tasks, session timeout) — Два Stop hook'а: keyword detector и session hygiene
- **PostToolUse verify-fix-loop hook** (`scripts/hooks/task_done_verify.py`) — after every successful `task_done`, 5 rule-based heuristics audit the AC evidence (file paths, ✓ markers, test counts, file refs, lint status); 2+ failures trigger a `/review` recommendation — Rule-based Ralph-mode-lite
- **Memory Block re-injection** — new `memory_block()` method + `tausik memory block` CLI + `tausik_memory_block` MCP tool returning compact markdown (recent decisions + conventions + dead ends, ≤50 lines) consumed by `/start`, `/checkpoint`, SessionStart hook — Повторная инъекция проектной памяти для anti-drift
- **`tausik memory compact`** CLI + `tausik_memory_compact` MCP — Dream-System-inspired aggregation of recent `task_logs` into phases / top opening words / top files mentioned — Консолидация логов в паттерны
- **QG-0 9-dimension intent completeness** — `qg0_dimensions_score()` in `service_gates.py` scores every task against {goal, acceptance_criteria, scope, scope_exclude, role, stack, complexity, story_link, evidence_plan}; <5 dims triggers a "CONTEXT" warning (prompt-master principle) — QG-0 расширен до 9 измерений
- **Adversarial critic in `/review`** — new sixth parallel review agent `agents/skills/review/agents/critic.md` hunting for exactly 3 weaknesses the other 5 agents miss (hidden failure modes, silent contract drift, assumption gaps); opt-in "deep mode" runs two critic passes — Adversarial критик в /review
- **`/interview` skill** — Socratic Q&A before complex tasks (max 3 clarifying questions, prompt-master principle) — Сократический Q&A скилл
- **`tausik hud`** CLI — one-screen live dashboard (session + active task + recent logs + gates) inspired by oh-my-claudecode HUD — Live HUD
- **`tausik suggest-model`** CLI + `scripts/model_routing.py` — model recommendation by complexity tier (simple→Haiku 4.5, medium→Sonnet 4.6, complex→Opus 4.7) for manual application via `/fast` — Cost-aware model routing
- **Webhook notifications** (`scripts/notifier.py` + `scripts/hooks/notify_on_done.py`) — Slack / Discord / Telegram webhooks fired on `task_done`; configured via `TAUSIK_SLACK_WEBHOOK` / `TAUSIK_DISCORD_WEBHOOK` / `TAUSIK_TELEGRAM_WEBHOOK` env vars — Webhook-уведомления в 3 канала
- **`CLAUDE_PLUGIN_DATA` env support** — `scripts/plugin_data.py` respects Claude Code's plugin-data convention for skill persistent state; falls back to `.tausik/plugin_data/` — Поддержка CLAUDE_PLUGIN_DATA
- **Mandatory Gotchas section lint** — `tests/test_skills_have_gotchas.py` enforces every SKILL.md has a "## Gotchas" section with real content (Habr recommendation) — Обязательная секция Gotchas
- **No-boilerplate lint** — `tests/test_skills_no_boilerplate.py` blocks re-introduction of "Always respond in user's language" in SKILLs (already covered by CLAUDE.md) — Лин для boilerplate

### Changed / Изменено

- **Bootstrap no longer copies `lib/AGENTS.md`** (which was dogfooding-specific, referenced `scripts/`/`agents/` structure); `generate_agents_md()` now produces a universal AGENTS.md with shared hard constraints — AGENTS.md теперь генерируется, не копируется из lib
- **Skills cleanup** — 12 SKILL.md files had "Always respond in the user's language" boilerplate removed (duplicate of CLAUDE.md Response Language section) — Чистка boilerplate в 12 skill-файлах
- **Shared hook helpers** — `scripts/hooks/_common.py` extracts `tausik_path()`, `has_active_task()`, `is_task_done_invocation()`, `extract_task_done_slug_from_bash()` previously duplicated across 5 hooks (convention #2: Mixin composition) — Рефакторинг общих helper-ов hooks
- **`bootstrap/bootstrap_venv.py`** gets `install_cli_wrapper()` helper (extracted from bootstrap.py to stay under 400-line gate) — CLI wrapper install вынесен
- **Skills count:** 34 → 35 (added `/interview`) — 35 скиллов
- **MCP tools:** 80 → 82 (added `tausik_memory_block`, `tausik_memory_compact`) — 82 MCP инструмента

### Fixed / Исправлено

- **H1 — Bash `"task done"` false-positive** — PostToolUse hooks (`notify_on_done`, `task_done_verify`) used substring match that triggered on `echo "task done today"`, `git log --grep="task done"`, etc. Replaced with a proper regex anchored to the actual `tausik[.cmd] task done <slug>` CLI shape in `_common.py`
- **H2 — `_check_ac_checkmarks` matched too loosely** — `"complete"` substring fired on `incomplete`/`completion`/`completeness`, and the heuristic ran on the full `task show` output (title + goal) rather than notes. Fixed with word-boundary regex `[✓✔]|\b(passed|verified|ok|complete[d]?)\b` plus `_extract_notes_section()`

### Test Coverage / Тесты

- **+177 new tests** — 918 → 1095 passing. Every new module (hooks, templates, routing, aggregates) ships with its own test file.

## [1.1.0] — 2026-04-12

### DX & Adoption Improvements

Inspired by ideas from [Molyanov AI Dev Framework](https://github.com/pavel-molyanov/molyanov-ai-dev) — two-phase planning, TDD enforcement, skill auto-testing. Community request for Qwen Code support ([#1](https://github.com/Kibertum/tausik-core/issues/1)).

### Added / Добавлено

- **Qwen Code (GigaCode) support** — full IDE integration: `.qwen/` directory, `QWEN.md` rules file, MCP config + SENAR hooks in `.qwen/settings.json`, 80 MCP tools + 4 enforcement hooks (task gate, bash firewall, push gate, auto-format) ([#1](https://github.com/Kibertum/tausik-core/issues/1)) — Полная поддержка Qwen Code CLI с хуками
- **TDD enforcement gate** — optional `tdd_order` quality gate verifies test files are modified alongside source code; disabled by default, enable via config — Опциональный gate для TDD-контроля
- **Two-phase planning** — `/plan` now starts with an interview phase (3+ clarifying questions) before decomposition; skip with `--skip-interview` — Двухфазное планирование с интервью
- **Auto-docs update on /ship** — after commit, `/ship` checks for structural changes and suggests updating `references/` documentation — Автообновление документации при /ship
- **`/skill-test` skill** — auto-generates 3-5 test scenarios for any skill and validates them through subagents — Автотестирование скиллов
- **IDE-aware skill catalog** — `skill-catalog.md` now uses correct IDE directory paths instead of hardcoded `.claude/` — Параметризованный каталог скиллов

### Changed / Изменено

- **`--smart` is now default** — stack detection and skill auto-enable run automatically; use `--no-detect` to skip — `--smart` теперь по умолчанию
- **`--init` no longer requires a name** — project name auto-derived from directory; `--init my-name` still works — `--init` без обязательного имени
- `bootstrap.py --ide` now accepts `qwen` and includes it in `all` — Qwen добавлен в выбор IDE
- Supported IDEs: Claude Code, Cursor, **Qwen Code**, Windsurf, Codex — 5 IDE
- Skills count: 33 → 34 (added `/skill-test`) — 34 скилла
- Filesize gate exempts `agents/qwen/mcp/` directory — Исключение для qwen mcp
## [1.1.1] — 2026-04-14

### Fixed

- **MCP tags coercion** — `tausik_dead_end` and `tausik_memory_add` now accept `tags` as both JSON array and string. MCP clients (Claude Code) may serialize array params as JSON strings; added `_coerce_tags()` helper to handle both formats gracefully.

## [1.0.0] — 2026-04-05

### Public Release / Публичный релиз

First public release of TAUSIK. Cross-IDE AI agent framework implementing [SENAR v1.3 Core](https://senar.tech).
Первый публичный релиз TAUSIK. Кросс-IDE фреймворк для AI-агентов, реализующий [SENAR v1.3 Core](https://senar.tech).

### Highlights / Основное

- **Cross-IDE support** — Claude Code, Cursor, Windsurf, Codex with unified skill/role/stack system — Поддержка Claude Code, Cursor, Windsurf, Codex с единой системой скиллов/ролей/стеков
- **31 skills** — from `/start` to `/ship`, covering the full development lifecycle — 31 скилл, покрывающих полный цикл разработки
- **SENAR v1.3 Core compliance (100%)** — Quality gates, metrics, dead ends, explorations, verification checklists — Полное соответствие SENAR v1.3 Core
- **Graph memory** — Project knowledge base with edges, soft-invalidation, FTS5 search — Графовая память проекта с рёбрами, soft-invalidation, FTS5 поиском
- **Autonomous batch mode** — `/run plan.md` executes multi-task plans with subagents — Автономный batch-режим для выполнения планов

### Added / Добавлено

- **Quality Gates** — QG-0 (context gate: goal + AC + negative scenario) and QG-2 (implementation gate: evidence + tests + ac-verified) — Quality gates с жёстким enforcement
- **Claude Code Hooks** — task gate, bash firewall, git push gate, auto-format — Хуки для контроля в реальном времени
- **SENAR Metrics** — Throughput, Lead Time, FPSR, DER, Dead End Rate, Cost per Task — Автоматические метрики
- **Multi-language gates** — pytest, ruff, go-vet, clippy, phpstan, eslint, tsc, and more — Gates для 10+ языков
- **5-agent review pipeline** — quality, implementation, testing, simplification, documentation agents with iterative cycle — 5 параллельных review-агентов с итеративным циклом
- **Dead ends & explorations** — `dead-end` for documenting failures, `explore` for time-bounded research — Документирование тупиков и исследования
- **Graph memory** — Polymorphic edges between memory/decision nodes, 4 relation types, recursive CTE traversal — Полиморфные рёбра, 4 типа связей, обход графа через CTE
- **Structured task logs** — `task_logs` table with phase tracking and FTS5 index — Структурированные логи задач
- **Vendor skills** — `skills.example.json` + `skill activate/deactivate` for third-party extensions — Поддержка сторонних скиллов
- **Bootstrap** — `bootstrap.py --smart --init` for one-command setup with stack detection — Настройка одной командой с детекцией стека
- **Apache 2.0 license** — Open source license — Лицензия Apache 2.0
- **Bilingual docs** — Full documentation in English and Russian — Полная документация на EN и RU
- **CONTRIBUTING.md** — Contributor guide — Гайд для контрибьюторов
- **837 tests** — Comprehensive test suite — Полный набор тестов
