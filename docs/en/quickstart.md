**English** | [Русский](/ru/docs/quickstart)

# Quick Start

**NUTAUSIK** — **N**ode **U**nified **T**ask **A**gent **U**nified **S**upervision, **I**nspection & **K**nowledge.

Step-by-step guide: from zero to your first task with an AI agent. Takes 5-10 minutes.

---

## Step 0. What You'll Need

1. **Node.js 22+** — download from [nodejs.org](https://nodejs.org/). Verify: `node --version`
2. **Git** — download from [git-scm.com](https://git-scm.com/). Verify: `git --version`
3. **An AI IDE** — Claude Code, Cursor, Qwen Code, or any MCP-compatible agent

## Step 1. Install Nutausik

```bash
npx @nocowboy/nutausik init --name my-project
```

This creates:
- `.nutausik/` — database (`nutausik.db`, SQLite WAL), config (`config.json`), ed25519 keypair
- Task tracking, session management, quality gates — all ready

Add `.nutausik/` to `.gitignore`:

```bash
echo ".nutausik/" >> .gitignore
```

## Step 2. Verify Installation

```bash
npx nutausik status
```

Output:
```
Project: my-project
Tasks: 0 total (0 planning, 0 active, 0 done)
Session: none
Epics: 0  Stories: 0
```

## Step 3. Start a Session

```bash
npx nutausik session start
```

## Step 4. Create Your First Task

```bash
npx nutausik task add landing-page "Create landing page" \
  --goal "Build a responsive landing page with hero section" \
  --acceptance "Title visible, CTA button works, mobile-friendly"

npx nutausik task start landing-page
```

The task is now active. The QG-0 gate verified you provided both a goal and acceptance criteria before allowing work.

## Step 5. Verify and Complete

```bash
npx nutausik verify --task landing-page
npx nutausik task done landing-page --ac-verified
```

The QG-2 gate checks that verification evidence exists before closing the task.

## Full Work Cycle

```
npx nutausik session start
npx nutausik task add <slug> "<title>" --goal "..." --acceptance "..."
npx nutausik task start <slug>
  ... work on the task ...
npx nutausik verify --task <slug>
npx nutausik task done <slug> --ac-verified
npx nutausik session end
```

## MCP Integration (for AI agents)

Add to your `.mcp.json` or MCP config:

```json
{
  "mcpServers": {
    "nutausik": {
      "command": "npx",
      "args": ["-y", "@nocowboy/nutausik", "--serve"],
      "env": {}
    }
  }
}
```

The agent gets 123 tools: `nutausik_task_add`, `nutausik_task_start`, `nutausik_verify`, `nutausik_status`, etc.

## CLI Reference

| Command | Description |
|---------|-------------|
| `npx nutausik init` | Initialize project |
| `npx nutausik status` | Project overview |
| `npx nutausik task add <slug> <title>` | Create task |
| `npx nutausik task start <slug>` | Activate task (QG-0) |
| `npx nutausik task done <slug> --ac-verified` | Complete task (QG-2) |
| `npx nutausik session start` | Start session |
| `npx nutausik verify --task <slug>` | Run verification gates |
| `npx nutausik doctor` | Health check |
| `npx nutausik --help` | Full command list |

## What's Next

- **[CLI Commands](cli.md)** — full command reference
- **[MCP Tools](mcp.md)** — all 123 MCP tool definitions
- **[Workflow](workflow.md)** — quality gates, session limits, memory
