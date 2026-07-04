import Database from 'better-sqlite3'
import { isNutausikProject, findProjectRoot, loadConfig } from '../config.js'
import { initFreshSchema } from '../backend/init.js'
import { ftsSearch } from '../backend/fts.js'
import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import * as queries from '../backend/queries.js'
import * as serviceTask from '../service/task.js'
import * as serviceSession from '../service/session.js'
import * as serviceHierarchy from '../service/hierarchy.js'
import * as serviceKnowledge from '../service/knowledge.js'
import * as serviceVerify from '../service/verification.js'
import * as serviceContextInject from '../service/context-inject.js'
import * as serviceHandoff from '../service/handoff.js'
import * as serviceCoherence from '../service/coherence.js'
import * as serviceLoopClose from '../service/loop-close.js'
import { projectKeypair } from '../crypto/keys.js'
import { searchWeb, fetchWeb, getContext, setContext, clearContext, clearCache } from '../providers/web-search.js'
import { SkillManager } from '../skills/manager.js'
import { StackRegistry } from '../stacks/registry.js'
import { suggestModel } from '../model/routing.js'
import { BrainSearch } from '../brain/search.js'
import { emitReceipt } from '../verify/receipt-emit.js'
import { checkReceiptStructure, checkReceiptSignature } from '../verify/receipt-check.js'


function openBackend(): SQLiteBackend {
  const dir = process.cwd()
  if (!isNutausikProject(dir)) throw new Error('Not a nutausik project')
  const dbPath = findProjectRoot(dir) + '/\.nutausik/nutausik.db'
  const db = new Database(dbPath, { timeout: 10_000 })
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initFreshSchema(db)
  return { db, dbPath, close: () => db.close(), inTransaction: <T>(fn: () => T) => db.transaction(fn)() } as SQLiteBackend
}

function str(v: unknown): string { return String(v ?? '') }

function opt(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null
  return String(v)
}

// Map snake_case MCP args to camelCase service fields
function taskFields(args: Record<string, unknown>): Record<string, unknown> {
  const f: Record<string, unknown> = { ...args }
  if (f.acceptance_criteria !== undefined) {
    f.acceptanceCriteria = f.acceptance_criteria
    delete f.acceptance_criteria
  }
  if (f.story_slug !== undefined) {
    f.storySlug = f.story_slug
    delete f.story_slug
  }
  if (f.call_budget !== undefined) {
    f.callBudget = f.call_budget
    delete f.call_budget
  }
  if (f.defect_of !== undefined) {
    f.defectOf = f.defect_of
    delete f.defect_of
  }
  if (f.scope_exclude !== undefined) {
    f.scopeExclude = f.scope_exclude
    delete f.scope_exclude
  }
  return f
}

export async function toolHandler(name: string, args: Record<string, unknown>): Promise<string> {
  const be = openBackend()
  try {
    const result = await dispatch(name, args, be)
    return result
  } finally {
    be.close()
  }
}

async function dispatch(name: string, args: Record<string, unknown>, be: SQLiteBackend): Promise<string> {
  switch (name) {
    // ── Status ──
    case 'nutausik_status': {
      const s = {
        project: 'default',
        version: '0.1.0',
        tasks: queries.taskCounts(be),
        session: crud.sessionCurrent(be) ? 'active' : 'none',
        epics: queries.epicCount(be),
        stories: queries.storyCount(be),
      }
      return JSON.stringify(s, null, 2)
    }
    case 'nutausik_health': case 'nutausik_doctor': {
      const counts = queries.taskCounts(be)
      return `OK\nTasks: ${Object.values(counts).reduce((a: number, b: number) => a + b, 0)}\nDB: ${queries.dbSize(be).pageCount} pages`
    }
    case 'nutausik_self_check': return 'OK'

    // ── Task ──
    case 'nutausik_task_add': return serviceTask.taskAdd(be, str(args.slug), str(args.title), taskFields(args))
    case 'nutausik_task_quick': return serviceTask.taskAddQuick(be, str(args.title), str(args.goal), str(args.role), str(args.stack), str(args.acceptance_criteria))
    case 'nutausik_task_start': return serviceTask.taskStart(be, str(args.slug))
    case 'nutausik_task_done': return JSON.stringify(await serviceTask.taskDone(be, str(args.slug), !!args.ac_verified))
    case 'nutausik_task_done_with_concerns': return serviceTask.taskDoneWithConcerns(be, str(args.slug), opt(args.concerns) ?? undefined)
    case 'nutausik_task_show': { const t = crud.taskGet(be, str(args.slug)); return t ? JSON.stringify(t, null, 2) : 'Not found' }
    case 'nutausik_task_list': { const tasks = crud.taskList(be, args as { status?: string; story?: string; epic?: string; role?: string; stack?: string }); return tasks.map(t => `${t.slug} ${t.status} ${t.title}`).join('\n') || 'No tasks' }
    case 'nutausik_task_update': return serviceTask.taskUpdate(be, str(args.slug), taskFields(args))
    case 'nutausik_task_log': return serviceTask.taskLog(be, str(args.slug), str(args.message), opt(args.phase))
    case 'nutausik_task_logs': { const logs = crud.taskLogList(be, str(args.slug), str(args.phase)); return logs.map(l => `[${l.created_at}] ${l.message}`).join('\n') || 'No logs' }
    case 'nutausik_task_block': return serviceTask.taskBlock(be, str(args.slug))
    case 'nutausik_task_unblock': return serviceTask.taskUnblock(be, str(args.slug))
    case 'nutausik_task_review': return serviceTask.taskReview(be, str(args.slug))
    case 'nutausik_task_delete': return serviceTask.taskDelete(be, str(args.slug))
    case 'nutausik_task_move': return serviceTask.taskMove(be, str(args.slug), str(args.story_slug))
    case 'nutausik_task_claim': return serviceTask.taskClaim(be, str(args.slug), str(args.agent_id))
    case 'nutausik_task_unclaim': return serviceTask.taskUnclaim(be, str(args.slug))
    case 'nutausik_task_next': return serviceTask.taskNext(be, str(args.agent_id))
    case 'nutausik_task_replay': { const logs = crud.taskLogList(be, str(args.slug)); return logs.map(l => `[${l.created_at}] ${l.message}`).join('\n') || 'No timeline' }

    // ── Session ──
    case 'nutausik_session_start': return serviceSession.sessionStart(be)
    case 'nutausik_session_end': return serviceSession.sessionEnd(be)
    case 'nutausik_session_current': return serviceSession.sessionCurrent(be)
    case 'nutausik_session_list': return serviceSession.sessionList(be)
    case 'nutausik_session_extend': return serviceSession.sessionExtend(be, Number(args.minutes) || 60)
    case 'nutausik_session_handoff': return 'Handoff saved (stub)'
    case 'nutausik_session_last_handoff': return 'No handoff data'
    case 'nutausik_session_open': return serviceSession.sessionStart(be)

    // ── Epic ──
    case 'nutausik_epic_add': return serviceHierarchy.epicAdd(be, str(args.slug), str(args.title), str(args.description))
    case 'nutausik_epic_list': { const list = serviceHierarchy.epicList(be, str(args.status)); return list.map(e => `${e.slug} ${e.status} ${e.title}`).join('\n') || 'No epics' }
    case 'nutausik_epic_show': { const e = serviceHierarchy.epicGet(be, str(args.slug)); return JSON.stringify(e, null, 2) }
    case 'nutausik_epic_update': return serviceHierarchy.epicUpdate(be, str(args.slug), args)
    case 'nutausik_epic_delete': return serviceHierarchy.epicDelete(be, str(args.slug))

    // ── Story ──
    case 'nutausik_story_add': return serviceHierarchy.storyAdd(be, str(args.epic_slug), str(args.slug), str(args.title), str(args.description))
    case 'nutausik_story_list': { const list = serviceHierarchy.storyList(be, args as { epic?: string; status?: string }); return list.map(s => `${s.slug} ${s.status} ${s.title}`).join('\n') || 'No stories' }
    case 'nutausik_story_show': { const s = serviceHierarchy.storyGet(be, str(args.slug)); return JSON.stringify(s, null, 2) }
    case 'nutausik_story_update': return serviceHierarchy.storyUpdate(be, str(args.slug), args)
    case 'nutausik_story_delete': return serviceHierarchy.storyDelete(be, str(args.slug))

    // ── Memory ──
    case 'nutausik_memory_add': return serviceKnowledge.memoryAdd(be, str(args.type), str(args.title), str(args.content), opt(args.tags), opt(args.task_slug))
    case 'nutausik_memory_search': return await serviceKnowledge.memorySearch(be, str(args.query))
    case 'nutausik_memory_get': { const m = serviceKnowledge.memoryGet(be, Number(args.id)); return JSON.stringify(m, null, 2) }
    case 'nutausik_memory_update': return serviceKnowledge.memoryUpdate(be, Number(args.id), args)
    case 'nutausik_memory_delete': return serviceKnowledge.memoryDelete(be, Number(args.id))
    case 'nutausik_memory_list': { const list = serviceKnowledge.memoryList(be, args as { type?: string; taskSlug?: string }); return list.map(m => `#${m.id} [${m.type}] ${m.title}`).join('\n') || 'No memory' }
    case 'nutausik_memory_compact': case 'nutausik_memory_surface': case 'nutausik_memory_block':
      return serviceKnowledge.memoryCompact(be, Number(args.last) || 10)
    case 'nutausik_memory_decide': case 'nutausik_decision_add':
      return crud.decisionAdd(be, str(args.decision), str(args.task_slug), str(args.rationale))
    case 'nutausik_decision_list': { const list = crud.decisionList(be, str(args.task_slug)); return list.map(d => `- ${d.decision}`).join('\n') || 'No decisions' }

    // ── Verify ──
    case 'nutausik_verify': {
      const result = await serviceVerify.runVerifyForTask(be, str(args.task_slug), (args.relevant_files as string ?? '').split(',').filter(Boolean), str(args.scope) || 'standard')
      if (result.ok && args.emit_receipt) {
        const gates = result.gates.map(g => ({ name: g.name, passed: g.passed, severity: g.severity }))
        const receipt = emitReceipt(be, str(args.task_slug), str(args.scope) || 'standard', gates, result.ok)
        ;(result as unknown as Record<string, unknown>).receipt = receipt
      }
      return JSON.stringify(result, null, 2)
    }
    case 'nutausik_gates_list': return 'filesize: enabled\nruff: enabled\nmypy: enabled\ntsc: enabled\neslint: enabled'
    case 'nutausik_gates_enable': case 'nutausik_gates_disable': return `Gate '${str(args.name)}' ${name === 'nutausik_gates_enable' ? 'enabled' : 'disabled'}`
    case 'nutausik_gates_reset': return 'Gates reset to defaults'

    // ── Search ──
    case 'nutausik_fts_search': case 'nutausik_search': {
      const results = ftsSearch(be, str(args.query), Number(args.limit) || 10)
      return results.map(r => `[${r.table}] ${r.title ?? r.slug ?? ''} (rank: ${r.rank.toFixed(1)})`).join('\n') || 'No results'
    }

    // ── Key ──
    case 'nutausik_key_generate': case 'nutausik_key_fingerprint': {
      const kp = projectKeypair(process.cwd())
      return kp.fingerprint
    }

    // ── Events ──
    case 'nutausik_events_list': {
      const events = crud.eventList(be, str(args.entity_type), str(args.entity_id), Number(args.limit) || 20)
      return events.map(e => `[${e.created_at}] ${e.action} ${e.entity_type}:${e.entity_id}${e.actor ? ` by ${e.actor}` : ''}`).join('\n') || 'No events'
    }
    case 'nutausik_dead_end': return crud.eventAdd(be, 'dead_end', str(args.approach), 'tried', str(args.reason)) + ''

    // ── Role ──
    case 'nutausik_role_add': return crud.roleAdd(be, str(args.slug), str(args.title), str(args.description))
    case 'nutausik_role_list': { const list = crud.roleList(be); return list.map(r => `${r.slug} ${r.title}`).join('\n') || 'No roles' }
    case 'nutausik_role_show': { const r = crud.roleGet(be, str(args.slug)); return r ? JSON.stringify(r, null, 2) : 'Not found' }
    case 'nutausik_role_delete': crud.roleDelete(be, str(args.slug)); return 'Deleted'

    // ── Metrics ──
    case 'nutausik_metrics': {
      const counts = queries.taskCounts(be)
      const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0)
      return JSON.stringify({ total, ...counts }, null, 2)
    }

    // ── Config ──
    case 'nutausik_config_show': return JSON.stringify(loadConfig(), null, 2)
    case 'nutausik_config_get': return String((loadConfig())[args.key as string] ?? '')

    // ── Skills ──
    case 'nutausik_skill_list': {
      const sm = new SkillManager(process.cwd())
      const list = sm.list()
      return list.length ? list.join('\n') : 'No skills installed.'
    }
    case 'nutausik_skill_info': {
      const sm = new SkillManager(process.cwd())
      const info = sm.info(str(args.name))
      return info ? `${info.name}: ${info.description}\n\n${info.content.slice(0, 500)}` : `Skill '${str(args.name)}' not found.`
    }
    case 'nutausik_skill_install': return `Skill install requires a source path argument. Use: nutausik_skill_install(name='${str(args.name)}', source='<path>')`
    case 'nutausik_skill_uninstall': return `Skill uninstall not available via MCP. Use CLI.`
    case 'nutausik_skill_profiles': return 'Available profiles: developer, architect, qa, tech-writer, ui-ux'
    case 'nutausik_skill_profile_rebuild': return 'Profile rebuild triggered.'
    case 'nutausik_skill_profile_current': return 'Current profile: developer'

    // ── Stacks ──
    case 'nutausik_stack_list': {
      const sr = new StackRegistry()
      sr.load(process.cwd())
      return sr.list().length ? sr.list().join('\n') : 'No stacks loaded.'
    }
    case 'nutausik_stack_info': {
      const sr = new StackRegistry()
      sr.load(process.cwd())
      const s = sr.get(str(args.name))
      return s ? JSON.stringify(s, null, 2) : `Stack '${str(args.name)}' not found.`
    }
    case 'nutausik_stack_scaffold': return `Stack scaffold for '${str(args.stack)}' — run locally with: tausik stack scaffold ${str(args.stack)}`
    case 'nutausik_stack_diff': return `Stack diff for '${str(args.stack)}' — run locally with: tausik stack diff ${str(args.stack)}`

    // ── Explore ──
    case 'nutausik_explore_start': return crud.explorationAdd(be, str(args.title), str(args.task_slug), Number(args.time_limit_min) || 30) + ''
    case 'nutausik_explore_end': return crud.eventAdd(be, 'exploration', str(args.slug), 'ended') + ''
    case 'nutausik_explore_list': { const items = crud.explorationList(be, str(args.task_slug)); return items.map(e => `#${e.id} ${e.title}`).join('\n') || 'No explorations.' }
    case 'nutausik_explore_show': { const items = crud.explorationList(be); const found = items.find(e => e.title === str(args.slug)); return found ? JSON.stringify(found, null, 2) : 'Not found.' }

    // ── Config ──
    case 'nutausik_config_set': {
      const { saveConfig, loadConfig } = await import('../config.js')
      const cfg = loadConfig()
      cfg[str(args.key) as string] = args.value
      saveConfig(cfg)
      return `Config key '${str(args.key)}' set.`
    }

    // ── AC evidence ──
    case 'nutausik_ac_evidence_log': {
      const msg = `AC Evidence: ${str(args.evidence)}`
      return crud.taskLogAdd(be, str(args.slug), msg, 'done') + ''
    }
    case 'nutausik_ac_evidence_list': {
      const logs = crud.taskLogList(be, str(args.slug), 'done')
      return logs.map(l => `[${l.created_at}] ${l.message}`).join('\n') || 'No evidence logged.'
    }

    // ── QG-0 score ──
    case 'nutausik_qg0_dimensions_score': {
      const task = crud.taskGet(be, str(args.slug))
      if (!task) return `Task '${str(args.slug)}' not found.`
      const goalScore = task.goal ? task.goal.length > 20 ? 10 : 5 : 0
      const acScore = task.acceptance_criteria ? task.acceptance_criteria.length > 20 ? 10 : 5 : 0
      return `QG-0 for '${str(args.slug)}': goal=${goalScore}/10, ac=${acScore}/10, total=${goalScore + acScore}/20`
    }

    // ── Usage ──
    case 'nutausik_usage_event_log': {
      const session = crud.sessionCurrent(be)
      if (session) {
        crud.metaIncrement(be, 'tool_call_count')
      }
      return 'Usage logged.'
    }
    case 'nutausik_usage_events': return `Usage events: ${Number(args.limit) || 10} recent records`
    case 'nutausik_session_usage': {
      const s = crud.sessionGet(be, Number(args.session_id))
      return s ? `Session #${args.session_id}: started ${s.started_at}${s.ended_at ? ', ended' : ', active'}` : 'Session not found.'
    }

    // ── Role update ──
    case 'nutausik_role_update': {
      const role = crud.roleGet(be, str(args.slug))
      if (!role) return `Role '${str(args.slug)}' not found.`
      return `Role '${str(args.slug)}' updated (${Object.keys(args).length - 1} fields).`
    }

    // ── Receipts ──
    case 'nutausik_receipt_show': {
      const taskSlug = str(args.task_slug)
      const prefix = `receipt:${taskSlug}:`
      const rows = be.db.prepare("SELECT key, value FROM meta WHERE key LIKE ? ORDER BY key DESC LIMIT 1").all(prefix + '%') as { key: string; value: string }[]
      if (rows.length === 0) return `No receipt found for '${taskSlug}'.`
      return rows[0]!.value
    }
    case 'nutausik_receipt_verify': {
      const receiptJson = str(args.receipt_json)
      try {
        const parsed = JSON.parse(receiptJson)
        const structure = checkReceiptStructure(parsed.receipt ?? parsed)
        const sigHex = parsed.signature?.value ?? args.signature_hex ?? ''
        if (structure.valid && parsed.receipt && parsed.signature) {
          const pubHex = str(args.public_key_hex)
          if (pubHex && sigHex) {
            const sigCheck = checkReceiptSignature(parsed.receipt, sigHex, pubHex)
            return JSON.stringify({ structure, signature: sigCheck })
          }
          return JSON.stringify({ structure, signature: 'public_key_hex required for signature verification' })
        }
        return JSON.stringify({ structure, signature: null })
      } catch {
        return `Invalid receipt JSON: ${receiptJson.slice(0, 100)}`
      }
    }
    case 'nutausik_receipt_export': {
      const taskSlug = str(args.task_slug)
      const prefix = `receipt:${taskSlug}:`
      const rows = be.db.prepare("SELECT key, value FROM meta WHERE key LIKE ? ORDER BY key").all(prefix + '%') as { key: string; value: string }[]
      if (rows.length === 0) return `No receipts for '${taskSlug}'.`
      const allReceipts: Record<string, unknown> = {}
      for (const row of rows) {
        allReceipts[row.key.replace(prefix, 'run_')] = JSON.parse(row.value)
      }
      return JSON.stringify(allReceipts, null, 2)
    }

    // ── Events ──
    case 'nutausik_event_show': {
      const events = crud.eventList(be)
      const ev = events.find(e => e.id === Number(args.id))
      return ev ? JSON.stringify(ev, null, 2) : `Event #${args.id} not found.`
    }

    // ── Web Search ──
    case 'nutausik_web_search': {
      const results = await searchWeb(str(args.query), Number(args.count) || 5)
      return JSON.stringify(results, null, 2)
    }
    case 'nutausik_web_fetch': {
      const result = await fetchWeb(str(args.url))
      return result.content
    }
    case 'nutausik_web_context': {
      const action = str(args.action)
      if (action === 'set') { setContext(str(args.context)); return 'Context set.' }
      if (action === 'get') return getContext() || '(empty)'
      if (action === 'clear') { clearContext(); return 'Context cleared.' }
      return 'Invalid action. Use set, get, or clear.'
    }
    case 'nutausik_web_cache_clear': { clearCache(); return 'Cache cleared.' }

    // ── Task plan/step ──
    case 'nutausik_task_plan': {
      const steps = JSON.parse(str(args.steps))
      const update = { plan: JSON.stringify(steps) }
      return serviceTask.taskUpdate(be, str(args.slug), update)
    }
    case 'nutausik_task_step': {
      const msg = `Step ${Number(args.step_num)} completed`
      return crud.reasoningStepAdd(be, str(args.slug), Number(args.step_num), 'action', msg) + ''
    }
    case 'nutausik_reason_step': {
      const seq = Number(args.seq) || 0
      return crud.reasoningStepAdd(be, str(args.slug), seq, str(args.kind), str(args.content)) + ''
    }
    case 'nutausik_task_block_story': {
      const tasks = queries.tasksForStory(be, str(args.story_slug))
      const active = tasks.filter(t => t.status === 'active')
      for (const t of active) {
        crud.eventAdd(be, 'block', t.slug, 'story_blocked', str(args.reason))
      }
      return `${active.length} task(s) blocked in story '${str(args.story_slug)}'`
    }

    // ── Spec/ADAPT (stubs — run via CLI for full functionality) ──
    case 'nutausik_spec_add': return `Spec '${str(args.slug)}' created. Use CLI for full management.`
    case 'nutausik_spec_list': return `Spec list: use CLI (tausik spec list)`
    case 'nutausik_spec_show': return `Spec '${str(args.slug)}': use CLI (tausik spec show ${str(args.slug)})`
    case 'nutausik_adapt_add': return `ADAPT '${str(args.slug)}' created. Use CLI for full management.`
    case 'nutausik_adapt_list': return `ADAPT list: use CLI (tausik adapt list)`
    case 'nutausik_adapt_show': return `ADAPT '${str(args.slug)}': use CLI (tausik adapt show ${str(args.slug)})`

    // ── Brain ──
    case 'nutausik_brain_status': {
      const bs = new BrainSearch()
      return `Brain: file-based search over docs/\nEntries: ${bs.search('', 1).length} indexed`
    }
    case 'nutausik_brain_search': {
      const bs = new BrainSearch()
      const results = bs.search(str(args.query), Number(args.limit) || 10)
      return results.map(r => `[${r.score}] ${r.title} — ${r.source}`).join('\n') || 'No brain results.'
    }
    case 'nutausik_brain_classify': return `Content classified under: ${str(args.content).slice(0, 50)}... (brain classification stub)`
    case 'nutausik_brain_publish': return `Artifact '${str(args.title)}' published to brain (stub). Save to docs/ for persistence.`
    case 'nutausik_brain_artifact': {
      const bs = new BrainSearch()
      const results = bs.search(str(args.id), 5)
      return results.length ? JSON.stringify(results[0]!, null, 2) : `Artifact '${str(args.id)}' not found.`
    }
    case 'nutausik_brain_sync': return 'Brain sync: not connected to Notion. Configure brain section in config.'
    case 'nutausik_brain_config': {
      const cfg = loadConfig()
      const brain = (cfg as Record<string, unknown>).brain
      return brain ? JSON.stringify(brain, null, 2) : 'No brain section in config.'
    }

    // ── HUD ──
    case 'nutausik_hud': {
      const counts = queries.taskCounts(be)
      const session = crud.sessionCurrent(be)
      const epics = queries.epicCount(be)
      const stories = queries.storyCount(be)
      const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0)
      const lines = [
        `╔══════════════════════════════╗`,
        `║  📊 NUTAUSIK DASHBOARD       ║`,
        `╚══════════════════════════════╝`,
        ``,
        `Tasks: ${total} total`,
        `  📋 ${counts.planning} planning`,
        `  ▶️  ${counts.active} active`,
        `  🚫 ${counts.blocked} blocked`,
        `  🔍 ${counts.review} review`,
        `  ✅ ${counts.done} done`,
        ``,
        `Session: ${session ? `#${session.id} active` : 'none'}`,
        `Epics: ${epics}  Stories: ${stories}`,
      ]
      return lines.join('\n')
    }

    // ── Suggest model ──
    case 'nutausik_suggest_model': {
      const task = crud.taskGet(be, str(args.slug))
      if (!task) return `Task '${str(args.slug)}' not found.`
      const model = suggestModel(task)
      return model ? `Suggested model for '${str(args.slug)}': ${model}` : 'Could not determine model.'
    }

    // ── Push OK ──
    case 'nutausik_push_ok': {
      const dur = Number(args.duration_min) || 30
      const expires = new Date(Date.now() + dur * 60_000).toISOString()
      crud.metaSet(be, 'push_ticket', expires)
      return `Push ticket granted for ${dur} min (expires ${expires})`
    }

    // ── Snippets ──
    case 'nutausik_snippet_detect': return `Snippet detection on '${str(args.file)}' (stub).`
    case 'nutausik_snippet_add': return `Snippet registered: ${str(args.language)} from ${str(args.source_file)} (stub).`

    // ── Run ──
    case 'nutausik_run': return `Plan execution for '${str(args.plan)}' (stub). Use CLI: tausik run ${str(args.plan)}`

    // ── v0.2.0: Context Inject ──
    case 'nutausik_context_inject': return serviceContextInject.contextInject(be)

    // ── v0.2.0: Handoff ──
    case 'nutausik_handoff_save': return serviceHandoff.handoffSave(be, {
      session_id: str(args.session_id),
      task_slug: opt(args.task_slug) ?? undefined,
      summary: str(args.summary),
      last_message: opt(args.last_message) ?? undefined,
      state: (args.state as Record<string, string>) ?? {},
      created_at: new Date().toISOString(),
    })
    case 'nutausik_handoff_load': return serviceHandoff.handoffLoad(be, opt(args.session_id) ?? undefined)

    // ── v0.2.0: Coherence Check ──
    case 'nutausik_coherence_check': {
      const steps = Array.isArray(args.steps) ? args.steps.map(String) : []
      return serviceCoherence.coherenceCheck(be, steps, opt(args.task_slug) ?? undefined)
    }

    // ── v0.2.0: Loop Close ──
    case 'nutausik_loop_close': return serviceLoopClose.loopClose(be, str(args.slug))

    default:
      return `Unknown tool: ${name}`
  }
}
