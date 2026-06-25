import type { Tool } from './index.js'

const T: Tool[] = []

function add(name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []): void {
  const inputSchema: Record<string, unknown> = {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
  }
  T.push({ name, description, inputSchema })
}

// ── Status ──────────────────────────────────────────────────────
add('nutausik_status', 'Project status overview', {
  compact: { type: 'boolean', description: 'Compact JSON output' },
})

// ── Task lifecycle (22 tools) ───────────────────────────────────
add('nutausik_task_add', 'Create a new task', {
  story_slug: { type: 'string', description: 'Parent story slug' },
  slug: { type: 'string', description: 'Task slug' },
  title: { type: 'string', description: 'Task title' },
  goal: { type: 'string', description: 'Goal' },
  complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
  role: { type: 'string' },
  tier: { type: 'string', enum: ['trivial', 'light', 'moderate', 'substantial', 'deep'] },
  stack: { type: 'string' },
}, ['slug', 'title'])

add('nutausik_task_quick', 'Quick-create a task', {
  title: { type: 'string' },
  goal: { type: 'string' },
  role: { type: 'string' },
  stack: { type: 'string' },
  acceptance_criteria: { type: 'string' },
}, ['title'])

add('nutausik_task_start', 'Start a task (QG-0 enforced)', { slug: { type: 'string' } }, ['slug'])
add('nutausik_task_done', 'Complete a task (QG-2 enforced)', {
  slug: { type: 'string' },
  ac_verified: { type: 'boolean', description: 'Acceptance criteria verified' },
}, ['slug'])
add('nutausik_task_show', 'Show task details', { slug: { type: 'string' } }, ['slug'])
add('nutausik_task_list', 'List tasks', {
  status: { type: 'string' },
  story: { type: 'string' },
  epic: { type: 'string' },
  role: { type: 'string' },
  stack: { type: 'string' },
})
add('nutausik_task_update', 'Update task fields', {
  slug: { type: 'string' }, title: { type: 'string' }, goal: { type: 'string' },
  plan: { type: 'string' }, notes: { type: 'string' }, acceptance_criteria: { type: 'string' },
  status: { type: 'string', enum: ['planning', 'active', 'blocked', 'review', 'done'] },
  stack: { type: 'string' }, role: { type: 'string' }, tier: { type: 'string' },
}, ['slug'])
add('nutausik_task_log', 'Log to task', { slug: { type: 'string' }, message: { type: 'string' }, phase: { type: 'string' } }, ['slug', 'message'])
add('nutausik_task_logs', 'Show task logs', { slug: { type: 'string' }, phase: { type: 'string' } }, ['slug'])
add('nutausik_task_block', 'Block a task', { slug: { type: 'string' } }, ['slug'])
add('nutausik_task_unblock', 'Unblock a task', { slug: { type: 'string' } }, ['slug'])
add('nutausik_task_review', 'Move to review', { slug: { type: 'string' } }, ['slug'])
add('nutausik_task_delete', 'Delete a task', { slug: { type: 'string' } }, ['slug'])
add('nutausik_task_move', 'Move task to another story', { slug: { type: 'string' }, story_slug: { type: 'string' } }, ['slug', 'story_slug'])
add('nutausik_task_claim', 'Claim a task', { slug: { type: 'string' }, agent_id: { type: 'string' } }, ['slug', 'agent_id'])
add('nutausik_task_unclaim', 'Release a task', { slug: { type: 'string' } }, ['slug'])
add('nutausik_task_next', 'Suggest next task', { agent_id: { type: 'string' } })
add('nutausik_task_replay', 'Task chronological timeline', { slug: { type: 'string' } }, ['slug'])

// ── Session (8 tools) ──────────────────────────────────────────
add('nutausik_session_start', 'Start a new session', {})
add('nutausik_session_end', 'End the active session', {})
add('nutausik_session_current', 'Show active session', {})
add('nutausik_session_list', 'List sessions', {})
add('nutausik_session_extend', 'Extend session', { minutes: { type: 'number' } })
add('nutausik_session_handoff', 'Save session handoff', { data: { type: 'string' } }, ['data'])
add('nutausik_session_last_handoff', 'Last handoff data', {})
add('nutausik_session_open', 'Open a new session (force)', {})

// ── Epic (5 tools) ─────────────────────────────────────────────
add('nutausik_epic_add', 'Create epic', { slug: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } }, ['slug', 'title'])
add('nutausik_epic_list', 'List epics', { status: { type: 'string' } })
add('nutausik_epic_show', 'Show epic', { slug: { type: 'string' } }, ['slug'])
add('nutausik_epic_update', 'Update epic', { slug: { type: 'string' }, title: { type: 'string' }, status: { type: 'string' }, description: { type: 'string' } }, ['slug'])
add('nutausik_epic_delete', 'Delete epic', { slug: { type: 'string' } }, ['slug'])

// ── Story (5 tools) ────────────────────────────────────────────
add('nutausik_story_add', 'Create story', { epic_slug: { type: 'string' }, slug: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } }, ['epic_slug', 'slug', 'title'])
add('nutausik_story_list', 'List stories', { epic: { type: 'string' }, status: { type: 'string' } })
add('nutausik_story_show', 'Show story', { slug: { type: 'string' } }, ['slug'])
add('nutausik_story_update', 'Update story', { slug: { type: 'string' }, title: { type: 'string' }, status: { type: 'string' } }, ['slug'])
add('nutausik_story_delete', 'Delete story', { slug: { type: 'string' } }, ['slug'])

// ── Memory/Knowledge (12 tools) ────────────────────────────────
add('nutausik_memory_add', 'Add memory', { type: { type: 'string', enum: ['pattern', 'gotcha', 'convention', 'context', 'dead_end'] }, title: { type: 'string' }, content: { type: 'string' }, tags: { type: 'string' }, task_slug: { type: 'string' } }, ['type', 'title', 'content'])
add('nutausik_memory_search', 'Search memory', { query: { type: 'string' }, limit: { type: 'number' } }, ['query'])
add('nutausik_memory_get', 'Get memory', { id: { type: 'number' } }, ['id'])
add('nutausik_memory_update', 'Update memory', { id: { type: 'number' }, title: { type: 'string' }, content: { type: 'string' }, tags: { type: 'string' } }, ['id'])
add('nutausik_memory_delete', 'Delete memory', { id: { type: 'number' } }, ['id'])
add('nutausik_memory_list', 'List memory', { type: { type: 'string' }, task_slug: { type: 'string' } })
add('nutausik_memory_compact', 'Compact memory block', { last: { type: 'number' } })
add('nutausik_memory_surface', 'Surface recent memory', { last: { type: 'number' } })
add('nutausik_memory_block', 'Memory block for context injection', { last: { type: 'number' } })
add('nutausik_memory_decide', 'Record decision', { decision: { type: 'string' }, rationale: { type: 'string' }, task_slug: { type: 'string' } }, ['decision'])
add('nutausik_decision_add', 'Add decision', { decision: { type: 'string' }, task_slug: { type: 'string' }, rationale: { type: 'string' } }, ['decision'])
add('nutausik_decision_list', 'List decisions', { task_slug: { type: 'string' } })

// ── Exploration (4 tools) ──────────────────────────────────────
add('nutausik_explore_start', 'Start exploration', { title: { type: 'string' }, time_limit_min: { type: 'number' } }, ['title'])
add('nutausik_explore_end', 'End exploration', { slug: { type: 'string' } }, ['slug'])
add('nutausik_explore_list', 'List explorations', {})
add('nutausik_explore_show', 'Show exploration', { slug: { type: 'string' } }, ['slug'])

// ── Gates/Verify (8 tools) ─────────────────────────────────────
add('nutausik_verify', 'Run verification', {
  task_slug: { type: 'string' },
  relevant_files: { type: 'string' },
  scope: { type: 'string', enum: ['lightweight', 'standard', 'high', 'critical', 'manual'] },
})
add('nutausik_gates_list', 'List gates', {})
add('nutausik_gates_enable', 'Enable a gate', { name: { type: 'string' } }, ['name'])
add('nutausik_gates_disable', 'Disable a gate', { name: { type: 'string' } }, ['name'])
add('nutausik_gates_reset', 'Reset to default gates', {})
add('nutausik_qg0_dimensions_score', 'QG-0 quality score', { slug: { type: 'string' } }, ['slug'])
add('nutausik_ac_evidence_log', 'Log AC evidence', { slug: { type: 'string' }, evidence: { type: 'string' } }, ['slug', 'evidence'])
add('nutausik_ac_evidence_list', 'List AC evidence', { slug: { type: 'string' } }, ['slug'])

// ── Doctor (3 tools) ───────────────────────────────────────────
add('nutausik_health', 'Server health', {})
add('nutausik_self_check', 'Server freshness check', {})
add('nutausik_doctor', 'Full diagnostics', {})

// ── Metrics (4 tools) ──────────────────────────────────────────
add('nutausik_metrics', 'SENAR KPI metrics', {})
add('nutausik_usage_event_log', 'Log usage event', { tokens: { type: 'number' }, cost: { type: 'number' } })
add('nutausik_usage_events', 'List usage events', { limit: { type: 'number' } })
add('nutausik_session_usage', 'Session usage summary', { session_id: { type: 'number' } })

// ── Roles (5 tools) ────────────────────────────────────────────
add('nutausik_role_add', 'Create role', { slug: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } }, ['slug', 'title'])
add('nutausik_role_list', 'List roles', {})
add('nutausik_role_show', 'Show role', { slug: { type: 'string' } }, ['slug'])
add('nutausik_role_update', 'Update role', { slug: { type: 'string' }, title: { type: 'string' } }, ['slug'])
add('nutausik_role_delete', 'Delete role', { slug: { type: 'string' } }, ['slug'])

// ── Skills (7 tools) ───────────────────────────────────────────
add('nutausik_skill_install', 'Install skill', { name: { type: 'string' } }, ['name'])
add('nutausik_skill_uninstall', 'Uninstall skill', { name: { type: 'string' } }, ['name'])
add('nutausik_skill_list', 'List installed skills', {})
add('nutausik_skill_info', 'Skill info', { name: { type: 'string' } }, ['name'])
add('nutausik_skill_profiles', 'List skill profiles', {})
add('nutausik_skill_profile_rebuild', 'Rebuild profile', {})
add('nutausik_skill_profile_current', 'Current profile', {})

// ── Stacks (4 tools) ───────────────────────────────────────────
add('nutausik_stack_list', 'List stacks', {})
add('nutausik_stack_info', 'Stack info', { name: { type: 'string' } }, ['name'])
add('nutausik_stack_scaffold', 'Generate stack scaffold', { stack: { type: 'string' } }, ['stack'])
add('nutausik_stack_diff', 'Stack config diff', { stack: { type: 'string' } }, ['stack'])

// ── Config (3 tools) ───────────────────────────────────────────
add('nutausik_config_get', 'Get config value', { key: { type: 'string' } }, ['key'])
add('nutausik_config_set', 'Set config value', { key: { type: 'string' }, value: { type: 'string' } }, ['key', 'value'])
add('nutausik_config_show', 'Show all config', {})

// ── Search (2 tools) ───────────────────────────────────────────
add('nutausik_fts_search', 'FTS5 search across tasks, memory, decisions', {
  query: { type: 'string', description: 'Search query' },
  limit: { type: 'number', description: 'Max results' },
}, ['query'])

// ── Events (3 tools) ──────────────────────────────────────────
add('nutausik_events_list', 'List events', { entity_type: { type: 'string' }, entity_id: { type: 'string' }, limit: { type: 'number' } })
add('nutausik_event_show', 'Show event', { id: { type: 'number' } }, ['id'])
add('nutausik_dead_end', 'Record dead end', { approach: { type: 'string' }, reason: { type: 'string' } }, ['approach', 'reason'])

// ── Key/Receipt (5 tools) ──────────────────────────────────────
add('nutausik_key_generate', 'Generate crypto key', {})
add('nutausik_key_fingerprint', 'Key fingerprint', {})
add('nutausik_receipt_show', 'Show receipt', { task_slug: { type: 'string' } }, ['task_slug'])
add('nutausik_receipt_verify', 'Verify receipt', { receipt_json: { type: 'string' } }, ['receipt_json'])
add('nutausik_receipt_export', 'Export receipt', { task_slug: { type: 'string' } }, ['task_slug'])


// ── Web Search (4 tools) ──────────────────────────────────────
add('nutausik_web_search', 'Search the web via DuckDuckGo', {
  query: { type: 'string', description: 'Search query' },
  count: { type: 'number', description: 'Max results' },
}, ['query'])
add('nutausik_web_fetch', 'Fetch and extract readable content from a URL', {
  url: { type: 'string' },
}, ['url'])
add('nutausik_web_context', 'Manage conversation context for search refinement', {
  action: { type: 'string', enum: ['set', 'get', 'clear'] },
  context: { type: 'string' },
}, ['action'])
add('nutausik_web_cache_clear', 'Clear the search result cache', {})


// ── Task lifecycle — additional (4 tools) ──────────────────────
add('nutausik_task_plan', 'Set plan steps for a task', {
  slug: { type: 'string', description: 'Task slug' },
  steps: { type: 'string', description: 'JSON array of plan steps' },
}, ['slug', 'steps'])

add('nutausik_task_step', 'Mark a plan step as done', {
  slug: { type: 'string', description: 'Task slug' },
  step_num: { type: 'number', description: 'Step number (1-based)' },
}, ['slug', 'step_num'])

add('nutausik_reason_step', 'Add a reasoning step', {
  slug: { type: 'string', description: 'Task slug' },
  kind: { type: 'string', enum: ['intent', 'premise', 'action', 'verification'], description: 'Step kind' },
  content: { type: 'string', description: 'Reasoning content' },
}, ['slug', 'kind', 'content'])

add('nutausik_task_block_story', 'Block all tasks in a story', {
  story_slug: { type: 'string', description: 'Story slug' },
  reason: { type: 'string', description: 'Block reason' },
}, ['story_slug'])

// ── Spec/ADAPT (6 tools) ───────────────────────────────────────
add('nutausik_spec_add', 'Create a SPEC artifact', {
  slug: { type: 'string' }, title: { type: 'string' },
  spec_type: { type: 'string', enum: ['ARCH', 'API', 'DATA', 'INT', 'PROC', 'UI', 'AI', 'SEC', 'OPS'] },
  content_ref: { type: 'string' },
}, ['slug', 'title', 'spec_type'])

add('nutausik_spec_list', 'List SPEC artifacts', {
  spec_type: { type: 'string' },
})

add('nutausik_spec_show', 'Show SPEC artifact', { slug: { type: 'string' } }, ['slug'])

add('nutausik_adapt_add', 'Create an ADAPT artifact', {
  slug: { type: 'string' }, title: { type: 'string' },
  tz_ref: { type: 'string' }, parent_adapt: { type: 'string' },
}, ['slug', 'title', 'tz_ref'])

add('nutausik_adapt_list', 'List ADAPT artifacts', {})

add('nutausik_adapt_show', 'Show ADAPT artifact', { slug: { type: 'string' } }, ['slug'])

// ── Brain (7 tools) ────────────────────────────────────────────
add('nutausik_brain_status', 'Brain database status', {})
add('nutausik_brain_search', 'Search brain artifacts', {
  query: { type: 'string' }, limit: { type: 'number' },
}, ['query'])
add('nutausik_brain_classify', 'Classify content against brain', {
  content: { type: 'string' },
}, ['content'])
add('nutausik_brain_publish', 'Publish artifact to brain', {
  title: { type: 'string' }, content: { type: 'string' }, artifact_type: { type: 'string' },
}, ['title', 'content'])
add('nutausik_brain_artifact', 'Get brain artifact', { id: { type: 'string' } }, ['id'])
add('nutausik_brain_sync', 'Sync brain from Notion', {})
add('nutausik_brain_config', 'Brain configuration', {})

// ── Other tools (6 tools) ─────────────────────────────────────
add('nutausik_hud', 'Rich project dashboard', {
  compact: { type: 'boolean', description: 'Compact output' },
})

add('nutausik_suggest_model', 'Suggest AI model for a task', {
  slug: { type: 'string', description: 'Task slug' },
}, ['slug'])

add('nutausik_push_ok', 'Grant push authorization ticket', {
  duration_min: { type: 'number', description: 'Ticket validity in minutes' },
})

add('nutausik_snippet_detect', 'Detect code snippets for clone tracking', {
  file: { type: 'string', description: 'File path' },
}, ['file'])

add('nutausik_snippet_add', 'Register a code snippet', {
  language: { type: 'string' }, code: { type: 'string' },
  source_file: { type: 'string' }, source_lines: { type: 'string' },
}, ['language', 'code', 'source_file'])

add('nutausik_run', 'Execute a plan markdown file', {
  plan: { type: 'string', description: 'Path to plan .md file' },
}, ['plan'])

export const TOOLS: Tool[] = T
