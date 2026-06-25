**English** | [Русский](/ru/docs/cli)

# Nutausik CLI — Command Reference (v0.1)

All commands: `npx nutausik <command> [subcommand] [arguments]`.

The same surface is also available via MCP (`nutausik_*` tools); see [mcp.md](mcp.md).

## Initialization

```bash
init --name <slug>        # Initialize project (creates .nutausik/ with config + DB)
```

## Status & Health

```bash
status [--compact]        # Project overview (tasks, session, epics, stories)
doctor                    # Health check (DB, config, crypto key)
metrics                   # SENAR KPIs: throughput, lead time, FPSR, DER
```

## Task Lifecycle

```bash
task add <slug> <title> [--goal <text>] [--acceptance <text>]     # Create task
task quick <title> [--goal <text>] [--acceptance <text>]           # Quick create (auto-slug)
task start <slug>                                                    # Activate (QG-0)
task done <slug> [--ac-verified]                                     # Complete (QG-2)
task show <slug>                                                     # Show details
task list [--status <status>]                                        # List tasks
task update <slug> [--goal <text>] [--acceptance <text>]            # Update fields
task log <slug> "<message>" [--phase <phase>]                       # Append log entry
task logs <slug>                                                     # Show log
task block <slug>                                                    # Block task
task unblock <slug>                                                  # Unblock task
task review <slug>                                                   # Send to review
task delete <slug>                                                   # Delete task
task move <slug> <story-slug>                                        # Move to story
task claim <slug> <agent-id>                                         # Claim task
task next                                                            # Suggest next task
task plan <slug> <steps>                                             # Set plan steps
task step <slug> <step-num>                                          # Mark step done
```

## Session Management

```bash
session start             # Start session
session end               # End session
session current           # Current session details
session list              # List sessions
```

## Hierarchy

```bash
epic add <slug> <title> [--description <text>]    # Create epic
epic list                                           # List epics
epic show <slug>                                    # Show epic
epic update <slug> [--title <text>]                 # Update epic
epic delete <slug>                                  # Delete epic

story add <epic-slug> <slug> <title>                # Create story
story list                                          # List stories
story show <slug>                                   # Show story
story update <slug> [--title <text>]                # Update story
story delete <slug>                                 # Delete story
```

## Memory & Knowledge

```bash
memory add <type> <title> <content> [--tags <tags>]    # Add memory
memory list [--type <type>]                              # List memory
memory search <query>                                    # Search memory
memory compact [--last <n>]                              # Compact recent memory
memory get <id>                                          # Get memory item
memory update <id> [--title <text>] [--content <text>]   # Update memory
memory delete <id>                                       # Delete memory

decision add "<decision>" --rationale "<text>"           # Record decision
decision list [--task <slug>]                            # List decisions
dead-end <approach> "<reason>"                           # Record dead end
```

## Verification

```bash
verify [--task <slug>] [--scope <scope>] [--emit-receipt]   # Run gates + optional signed receipt
gates list                                                    # List gates
gates enable <name>                                           # Enable gate
gates disable <name>                                          # Disable gate
```

## Crypto & Receipts

```bash
key generate              # Generate ed25519 keypair
key fingerprint           # Show public key fingerprint
receipt show <task>       # Show receipt for task
receipt verify <json>     # Verify receipt structure + signature
receipt export <task>     # Export all receipts for task
```

## Config & Roles

```bash
config get <key>          # Get config value
config set <key> <value>  # Set config value
config show               # Show all config

role add <slug> <title> [--description <text>]    # Create role
role list                                           # List roles
role show <slug>                                    # Show role
```

## Skills & Stacks

```bash
skill list                # List installed skills
skill info <name>         # Show skill info
stack list                # List stacks
stack info <name>         # Show stack info
```

## Search

```bash
search <query>            # FTS5 search across tasks + memory + decisions
```

## Events

```bash
events list               # List events
```

## Error Handling

- All commands return exit code 0 on success, 1 on error
- QG-0 or QG-2 violations return exit code 1 with a descriptive message
- `--help` on any command shows usage
