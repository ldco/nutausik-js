#!/usr/bin/env node
import { Command } from 'commander'
import Database from 'better-sqlite3'
import { mkdirSync, writeFileSync } from 'node:fs'
import { NUTAUSIK_VERSION } from '../version.js'
import { isNutausikProject, findProjectRoot, loadConfig } from '../config.js'
import { initFreshSchema } from '../backend/init.js'
import { ftsSearch } from '../backend/fts.js'
import { projectKeypair } from '../crypto/keys.js'
import type { SQLiteBackend } from '../backend/database.js'
import * as serviceTask from '../service/task.js'
import * as serviceSession from '../service/session.js'
import * as serviceHierarchy from '../service/hierarchy.js'
import * as serviceKnowledge from '../service/knowledge.js'
import * as serviceVerify from '../service/verification.js'
import * as crud from '../backend/crud.js'
import * as queries from '../backend/queries.js'

function openBackend(projectDir?: string): SQLiteBackend {
  const dir = projectDir ?? process.cwd()
  if (!isNutausikProject(dir)) {
    console.log('Not a nutausik project. Run `nutausik init` first.')
    process.exit(1)
  }
  const dbPath = findProjectRoot(dir) + '/\.nutausik/nutausik.db'
  const db = new Database(dbPath, { timeout: 10_000 })
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initFreshSchema(db)
  return { db, dbPath, close: () => db.close(), inTransaction: <T>(fn: () => T) => db.transaction(fn)() } as SQLiteBackend
}

export function main(): void {
  const program = new Command()
  program.name('nutausik').description('nutausik governance framework').version(NUTAUSIK_VERSION)

  // ── init ───────────────────────────────────────────────────────
  program.command('init')
    .description('Initialize TAUSIK project in current directory')
    .option('-n, --name <name>', 'Project name')
    .action((opts) => {
      const dir = process.cwd()
      const name = opts.name ?? dir.split('/').pop() ?? 'my-project'
      const nutausikDir = dir + '/.nutausik'
      mkdirSync(nutausikDir, { recursive: true })
      writeFileSync(nutausikDir + '/config.json', JSON.stringify({ project: name, version: 1 }, null, 2) + '\n')
      const db = new Database(nutausikDir + '/nutausik.db')
      db.pragma('journal_mode = WAL')
      db.pragma('foreign_keys = ON')
      initFreshSchema(db)
      db.close()
      console.log(`TAUSIK initialized in ${dir}`)
      console.log(`Project: ${name}`)
    })

  // ── status ─────────────────────────────────────────────────────
  program.command('status')
    .description('Project status')
    .option('--compact', 'Compact JSON output')
    .action((opts) => {
      const be = openBackend()
      const s = {
        project: loadConfig().project || 'default',
        version: NUTAUSIK_VERSION,
        tasks: queries.taskCounts(be),
        session: crud.sessionCurrent(be) ? 'active' : 'none',
        epics: queries.epicCount(be),
        stories: queries.storyCount(be),
      }
      be.close()
      if (opts.compact) {
        console.log(JSON.stringify(s))
      } else {
        console.log(`Project: ${s.project} v${s.version}`)
        console.log(`Tasks: planning=${s.tasks.planning} active=${s.tasks.active} blocked=${s.tasks.blocked} review=${s.tasks.review} done=${s.tasks.done}`)
        console.log(`Session: ${s.session}`)
        console.log(`Epics: ${s.epics}`)
        console.log(`Stories: ${s.stories}`)
      }
    })

  // ── task ────────────────────────────────────────────────────────
  const taskCmd = program.command('task').description('Task management')

  taskCmd.command('add <slug> <title>')
    .description('Create a new task')
    .option('--goal <text>', 'Task goal')
    .option('--acceptance <text>', 'Acceptance criteria')
    .option('--stack <name>', 'Stack')
    .option('--complexity <level>', 'Complexity')
    .option('--role <name>', 'Role')
    .option('--tier <level>', 'Tier')
    .action((slug, title, opts) => {
      const be = openBackend()
      const fields: Record<string, unknown> = { ...opts }
      if (fields.acceptance !== undefined) {
        fields.acceptanceCriteria = fields.acceptance
        delete fields.acceptance
      }
      if (fields.goal !== undefined) fields.goal = fields.goal
      const result = serviceTask.taskAdd(be, slug, title, fields)
      be.close()
      console.log(result)
    })

  taskCmd.command('quick <title>')
    .description('Quick-create a task with auto-slug')
    .option('--goal <text>')
    .option('--acceptance <text>')
    .option('--stack <name>')
    .option('--role <name>')
    .action((title, opts) => {
      const be = openBackend()
      const result = serviceTask.taskAddQuick(be, title, opts.goal, opts.role, opts.stack, opts.acceptance)
      be.close()
      console.log(result)
    })

  taskCmd.command('plan <slug> <steps>')
    .description('Set plan steps (JSON array)')
    .action((slug, steps) => {
      const be = openBackend()
      const result = serviceTask.taskUpdate(be, slug, { plan: steps })
      be.close()
      console.log(result)
    })

  taskCmd.command('step <slug> <step-num>')
    .description('Mark plan step as done')
    .action((slug, num) => {
      const be = openBackend()
      crud.reasoningStepAdd(be, slug, parseInt(num), 'action', `Step ${num} completed`)
      console.log(`Step ${num} marked done for '${slug}'`)
      be.close()
    })

  taskCmd.command('start <slug>')
    .description('Start a task (QG-0 enforced)')
    .action((slug) => {
      const be = openBackend()
      try { console.log(serviceTask.taskStart(be, slug)) }
      catch (e: unknown) { console.error((e as Error).message); process.exit(1) }
      finally { be.close() }
    })

  taskCmd.command('done <slug>')
    .description('Complete a task (QG-2 enforced)')
    .option('--ac-verified', 'Acceptance criteria verified')
    .action(async (slug, opts) => {
      const be = openBackend()
      try { 
        const result = await serviceTask.taskDone(be, slug, !!opts.acVerified)
        const failures = result.blocking_failures as Array<{ gate: string; output: string }> | undefined
        if (failures?.length) {
          for (const f of failures) console.error(`BLOCKED: ${f.gate} — ${f.output}`)
        }
        console.log(`Task '${slug}' completed.`)
      } catch (e: unknown) { console.error((e as Error).message); process.exit(1) }
      finally { be.close() }
    })

  taskCmd.command('show <slug>')
    .description('Show task details')
    .action((slug) => {
      const be = openBackend()
      const task = crud.taskGet(be, slug)
      be.close()
      if (!task) { console.log(`Task '${slug}' not found.`); return }
      console.log(`Task: ${task.slug} — ${task.title}`)
      console.log(`Status: ${task.status} | Stack: ${task.stack ?? '-'} | Complexity: ${task.complexity ?? '-'} | Role: ${task.role ?? '-'}`)
      console.log(`Goal: ${task.goal ?? '-'}`)
      console.log(`AC: ${task.acceptance_criteria ?? '-'}`)
      console.log(`Plan: ${task.plan ? 'defined' : 'none'}`)
      console.log(`Claimed by: ${task.claimed_by ?? '-'}`)
      if (task.started_at) console.log(`Started: ${task.started_at}`)
      if (task.completed_at) console.log(`Completed: ${task.completed_at}`)
    })

  taskCmd.command('list')
    .description('List tasks')
    .option('-s, --status <status>', 'Filter by status')
    .option('--story <slug>', 'Filter by story')
    .option('--epic <slug>', 'Filter by epic')
    .option('--role <name>', 'Filter by role')
    .option('--stack <name>', 'Filter by stack')
    .action((opts) => {
      const be = openBackend()
      const tasks = crud.taskList(be, opts)
      be.close()
      if (!tasks.length) { console.log('No tasks found.'); return }
      for (const t of tasks) console.log(`  ${t.slug.padEnd(25)} ${t.status.padEnd(10)} ${t.title}`)
    })

  taskCmd.command('update <slug>')
    .description('Update task fields')
    .option('--title <text>')
    .option('--goal <text>')
    .option('--plan <text>')
    .option('--notes <text>')
    .option('--acceptance <text>')
    .option('--status <status>')
    .option('--stack <name>')
    .option('--complexity <level>')
    .option('--role <name>')
    .action((slug, opts) => {
      const be = openBackend()
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(opts)) if (v !== undefined) clean[k] = v
      const result = serviceTask.taskUpdate(be, slug, clean)
      be.close()
      console.log(result)
    })

  taskCmd.command('block <slug>').description('Block a task').action((slug) => {
    const be = openBackend()
    try { console.log(serviceTask.taskBlock(be, slug)) } catch (e: unknown) { console.error((e as Error).message); process.exit(1) }
    finally { be.close() }
  })

  taskCmd.command('unblock <slug>').description('Unblock a task').action((slug) => {
    const be = openBackend()
    try { console.log(serviceTask.taskUnblock(be, slug)) } catch (e: unknown) { console.error((e as Error).message); process.exit(1) }
    finally { be.close() }
  })

  taskCmd.command('review <slug>').description('Move to review').action((slug) => {
    const be = openBackend()
    try { console.log(serviceTask.taskReview(be, slug)) } catch (e: unknown) { console.error((e as Error).message); process.exit(1) }
    finally { be.close() }
  })

  taskCmd.command('delete <slug>').description('Delete task').action((slug) => {
    const be = openBackend()
    console.log(serviceTask.taskDelete(be, slug))
    be.close()
  })

  taskCmd.command('claim <slug> <agent-id>').description('Claim task').action((slug, agent) => {
    const be = openBackend()
    console.log(serviceTask.taskClaim(be, slug, agent))
    be.close()
  })

  taskCmd.command('unclaim <slug>').description('Release task').action((slug) => {
    const be = openBackend()
    console.log(serviceTask.taskUnclaim(be, slug))
    be.close()
  })

  taskCmd.command('log <slug> <message>').description('Append to task log').option('--phase <name>').action((slug, msg, opts) => {
    const be = openBackend()
    console.log(serviceTask.taskLog(be, slug, msg, opts.phase))
    be.close()
  })

  taskCmd.command('logs <slug>').description('Show task logs').option('--phase <name>').action((slug, opts) => {
    const be = openBackend()
    const logs = crud.taskLogList(be, slug, opts.phase)
    be.close()
    if (!logs.length) { console.log('No logs.'); return }
    for (const l of logs) console.log(`  [${l.created_at}] ${l.message}${l.phase ? ` (${l.phase})` : ''}`)
  })

  taskCmd.command('next').description('Suggest next task').option('--agent-id <id>').action((opts) => {
    const be = openBackend()
    console.log(serviceTask.taskNext(be, opts.agentId))
    be.close()
  })

  // ── session ─────────────────────────────────────────────────────
  const sessionCmd = program.command('session').description('Session management')
  sessionCmd.command('start').action(() => { const be = openBackend(); console.log(serviceSession.sessionStart(be)); be.close() })
  sessionCmd.command('end').action(() => { const be = openBackend(); console.log(serviceSession.sessionEnd(be)); be.close() })
  sessionCmd.command('current').action(() => { const be = openBackend(); console.log(serviceSession.sessionCurrent(be)); be.close() })
  sessionCmd.command('list').action(() => { const be = openBackend(); console.log(serviceSession.sessionList(be)); be.close() })
  sessionCmd.command('extend <minutes>').action((m) => { const be = openBackend(); console.log(serviceSession.sessionExtend(be, parseInt(m))); be.close() })

  // ── epic ─────────────────────────────────────────────────────────
  const epicCmd = program.command('epic').description('Epic management')
  epicCmd.command('add <slug> <title>').option('-d, --description <text>').action((slug, title, opts) => {
    const be = openBackend(); console.log(serviceHierarchy.epicAdd(be, slug, title, opts.description)); be.close()
  })
  epicCmd.command('list').option('-s, --status <status>').action((opts) => {
    const be = openBackend(); const list = serviceHierarchy.epicList(be, opts.status); be.close()
    for (const e of list) console.log(`  ${e.slug.padEnd(25)} ${e.status.padEnd(10)} ${e.title}`)
  })
  epicCmd.command('show <slug>').action((slug) => {
    const be = openBackend()
    try { const epic = serviceHierarchy.epicGet(be, slug); console.log(`${epic.slug}: ${epic.title} (${epic.status})`) }
    catch (e: unknown) { console.error((e as Error).message) }
    finally { be.close() }
  })
  epicCmd.command('delete <slug>').action((slug) => {
    const be = openBackend(); console.log(serviceHierarchy.epicDelete(be, slug)); be.close()
  })

  // ── story ────────────────────────────────────────────────────────
  const storyCmd = program.command('story').description('Story management')
  storyCmd.command('add <epic-slug> <slug> <title>').option('-d, --description <text>').action((epic, slug, title, opts) => {
    const be = openBackend(); console.log(serviceHierarchy.storyAdd(be, epic, slug, title, opts.description)); be.close()
  })
  storyCmd.command('list').option('-e, --epic <slug>').option('-s, --status <status>').action((opts) => {
    const be = openBackend(); const list = serviceHierarchy.storyList(be, opts); be.close()
    for (const s of list) console.log(`  ${s.slug.padEnd(25)} ${s.status.padEnd(10)} ${s.title}`)
  })
  storyCmd.command('show <slug>').action((slug) => {
    const be = openBackend()
    try { const story = serviceHierarchy.storyGet(be, slug); console.log(`${story.slug}: ${story.title} (${story.status})`) }
    catch (e: unknown) { console.error((e as Error).message) }
    finally { be.close() }
  })
  storyCmd.command('delete <slug>').action((slug) => {
    const be = openBackend(); console.log(serviceHierarchy.storyDelete(be, slug)); be.close()
  })

  // ── memory ───────────────────────────────────────────────────────
  const memCmd = program.command('memory').description('Project memory')
  memCmd.command('add <type> <title> <content>').option('-t, --tags <tags>').option('--task <slug>').action((type, title, content, opts) => {
    const be = openBackend(); console.log(serviceKnowledge.memoryAdd(be, type, title, content, opts.tags, opts.task)); be.close()
  })
  memCmd.command('list').option('-t, --type <type>').option('--task <slug>').action((opts) => {
    const be = openBackend(); const list = serviceKnowledge.memoryList(be, opts); be.close()
    for (const m of list) console.log(`  #${m.id} [${m.type}] ${m.title} (${m.created_at})`)
  })
  memCmd.command('search <query>').action(async (query) => {
    const be = openBackend(); const result = await serviceKnowledge.memorySearch(be, query); be.close(); console.log(result)
  })
  memCmd.command('compact').option('-n, --last <num>', 'Number', '10').action((opts) => {
    const be = openBackend(); console.log(serviceKnowledge.memoryCompact(be, parseInt(opts.last))); be.close()
  })

  // ── verify ──────────────────────────────────────────────────────
  program.command('verify')
    .description('Run verification gates')
    .option('--task <slug>', 'Verify specific task')
    .option('--files <files>', 'Comma-separated files')
    .option('--full', 'Full suite')
    .action(async (opts) => {
      const be = openBackend()
      const files = opts.files ? opts.files.split(',') : []
      const result = await serviceVerify.runVerifyForTask(be, opts.task ?? null, files, opts.full ? 'high' : 'standard')
      be.close()
      console.log(`Verification: ${result.ok ? 'PASSED' : 'FAILED'} (cache: ${result.cache_status})`)
      for (const g of result.gates) console.log(`  ${g.name}: ${g.passed ? '✅' : '❌'} (${g.duration_ms}ms)`)
      for (const w of result.warnings) console.log(`  ⚠ ${w}`)
      for (const f of result.blocking_failures) console.log(`  🔴 ${f.gate}: ${f.output}`)
    })

  // ── doctor ──────────────────────────────────────────────────────
  program.command('doctor')
    .description('Project health check')
    .action(() => {
      const dir = process.cwd()
      if (!isNutausikProject(dir)) { console.log('❌ Not a nutausik project.'); return }
      const be = openBackend()
      try {
        const counts = queries.taskCounts(be)
        console.log(`✅ DB: ${queries.dbSize(be).pageCount} pages`)
        console.log(`✅ Tasks: ${Object.values(counts).reduce((a: number, b: number) => a + b, 0)} total`)
        console.log(`✅ Session: ${crud.sessionCurrent(be) ? 'active' : 'none'}`)
      } catch (e: unknown) { console.error(`❌ DB error: ${(e as Error).message}`) }
      be.close()
    })

  // ── search ──────────────────────────────────────────────────────
  program.command('search <query>')
    .description('Full-text search')
    .action((query) => {
      const be = openBackend()
      const results = ftsSearch(be, query)
      be.close()
      if (!results.length) { console.log('No results.'); return }
      for (const r of results) console.log(`  [${r.table}] ${r.title ?? r.slug ?? ''} (rank: ${r.rank.toFixed(1)})`)
    })

  // ── events ──────────────────────────────────────────────────────
  program.command('events')
    .description('List events')
    .option('--entity-type <type>')
    .option('--entity-id <id>')
    .option('-n, --limit <num>', 'Max events', '20')
    .action((opts) => {
      const be = openBackend()
      const events = crud.eventList(be, opts.entityType, opts.entityId, parseInt(opts.limit))
      be.close()
      for (const e of events) console.log(`  [${e.created_at}] ${e.action} ${e.entity_type}:${e.entity_id}${e.actor ? ` by ${e.actor}` : ''}`)
    })

  // ── metrics ─────────────────────────────────────────────────────
  program.command('metrics')
    .description('SENAR metrics')
    .action(() => {
      const be = openBackend()
      const counts = queries.taskCounts(be)
      const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0)
      const done = counts.done ?? 0
      console.log(`Total tasks: ${total}`)
      console.log(`Done: ${done}`)
      console.log(`Active: ${counts.active ?? 0}`)
      console.log(`Throughput: ${done} tasks total`)
      be.close()
    })

  // ── key ──────────────────────────────────────────────────────────
  program.command('key')
    .description('Crypto key management')
    .command('generate')
    .action(() => {
      const dir = findProjectRoot()
      const kp = projectKeypair(dir)
      console.log(`Key: ${kp.fingerprint}`)
    })
    .command('fingerprint')
    .action(() => {
      const dir = findProjectRoot()
      const kp = projectKeypair(dir)
      console.log(kp.fingerprint)
    })

  // ── receipt ─────────────────────────────────────────────────────
  program.command('receipt')
    .description('Receipt operations')
    .command('show')
    .action(() => console.log('Receipt operations not implemented in CLI. Use MCP.'))
    .command('verify')
    .action(() => console.log('Receipt verify not implemented in CLI. Use MCP.'))

  // ── context_inject ──────────────────────────────────────────────
  program.command('context-inject')
    .description('Generate NUTAUSIK context block for agent prompt injection')
    .action(() => {
      const be = openBackend()
      // Dynamic import to avoid circular dependency
      import('../service/context-inject.js').then((m) => {
        console.log(m.contextInject(be))
        be.close()
      })
    })

  // ── handoff ────────────────────────────────────────────────────
  // Separate commands instead of nested subcommands (commander limitation)
  program.command('handoff-save')
    .description('Save handoff data for next session')
    .requiredOption('-s, --session-id <id>', 'Session ID')
    .option('-t, --task-slug <slug>', 'Task slug')
    .requiredOption('-m, --summary <text>', 'Session summary')
    .option('-l, --last-message <text>', 'Last message content')
    .action((opts) => {
      const be = openBackend()
      import('../service/handoff.js').then((m) => {
        console.log(m.handoffSave(be, {
          session_id: opts.sessionId,
          task_slug: opts.taskSlug,
          summary: opts.summary,
          last_message: opts.lastMessage,
          state: {},
          created_at: new Date().toISOString(),
        }))
        be.close()
      })
    })
  program.command('handoff-load')
    .description('Load handoff data from previous session')
    .option('-s, --session-id <id>', 'Session ID (optional, loads latest if omitted)')
    .action((opts) => {
      const be = openBackend()
      import('../service/handoff.js').then((m) => {
        console.log(m.handoffLoad(be, opts.sessionId))
        be.close()
      })
    })

  // ── coherence-check ────────────────────────────────────────────
  program.command('coherence-check')
    .description('Validate a plan against memory, decisions, and existing tasks')
    .requiredOption('--steps <steps>', 'Comma-separated plan steps')
    .option('-t, --task-slug <slug>', 'Task slug to check for duplicates')
    .action((opts) => {
      const be = openBackend()
      import('../service/coherence.js').then((m) => {
        console.log(m.coherenceCheck(be, opts.steps.split(',').map((s: string) => s.trim()), opts.taskSlug))
        be.close()
      })
    })

  // ── loop-close ──────────────────────────────────────────────────
  program.command('loop-close')
    .description('Compare plan vs actual, generate SUMMARY')
    .requiredOption('-s, --slug <slug>', 'Task slug')
    .action((opts) => {
      const be = openBackend()
      import('../service/loop-close.js').then((m) => {
        console.log(m.loopClose(be, opts.slug))
        be.close()
      })
    })

  program.parse(process.argv)
}

if (import.meta.url.startsWith("file:")) main()
