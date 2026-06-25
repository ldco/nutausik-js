export const NUTAUSIK_VERSION = '0.1.0'

// ── DB Schema ─────────────────────────────────────────────────────────
export const SCHEMA_VERSION = 37

// ── Status enums ──────────────────────────────────────────────────────
export const VALID_TASK_STATUSES = [
  'planning',
  'active',
  'blocked',
  'review',
  'done',
] as const
export type TaskStatus = (typeof VALID_TASK_STATUSES)[number]

export const VALID_STORY_STATUSES = ['open', 'active', 'done'] as const
export type StoryStatus = (typeof VALID_STORY_STATUSES)[number]

export const VALID_EPIC_STATUSES = ['active', 'done', 'archived'] as const
export type EpicStatus = (typeof VALID_EPIC_STATUSES)[number]

export const VALID_SESSION_STATUSES = ['active', 'ended'] as const
export type SessionStatus = (typeof VALID_SESSION_STATUSES)[number]

// ── Complexity / Tier ─────────────────────────────────────────────────
export const VALID_COMPLEXITIES = ['simple', 'medium', 'complex'] as const
export type Complexity = (typeof VALID_COMPLEXITIES)[number]

export const VALID_TIERS = [
  'trivial',
  'light',
  'moderate',
  'substantial',
  'deep',
] as const
export type Tier = (typeof VALID_TIERS)[number]

export const COMPLEXITY_SP: Record<Complexity, number> = {
  simple: 1,
  medium: 3,
  complex: 8,
}

// ── Memory types ──────────────────────────────────────────────────────
export const VALID_MEMORY_TYPES = [
  'pattern',
  'gotcha',
  'convention',
  'context',
  'dead_end',
] as const
export type MemoryType = (typeof VALID_MEMORY_TYPES)[number]

// ── Graph types ──────────────────────────────────────────────────────
export const VALID_NODE_TYPES = ['memory', 'decision'] as const
export type NodeType = (typeof VALID_NODE_TYPES)[number]

export const VALID_EDGE_RELATIONS = [
  'supersedes',
  'caused_by',
  'relates_to',
  'contradicts',
] as const
export type EdgeRelation = (typeof VALID_EDGE_RELATIONS)[number]

// ── Built-in stacks ──────────────────────────────────────────────────
export const BUILT_IN_STACKS = [
  'ansible',
  'blade',
  'django',
  'docker',
  'fastapi',
  'flask',
  'flutter',
  'go',
  'helm',
  'java',
  'javascript',
  'kotlin',
  'kubernetes',
  'laravel',
  'next',
  'nuxt',
  'php',
  'python',
  'react',
  'rust',
  'svelte',
  'swift',
  'terraform',
  'typescript',
  'vue',
] as const
export type BuiltInStack = (typeof BUILT_IN_STACKS)[number]

// ── Gate types ───────────────────────────────────────────────────────
export const VALID_GATE_SEVERITIES = ['warn', 'block'] as const
export type GateSeverity = (typeof VALID_GATE_SEVERITIES)[number]

export const VALID_GATE_TRIGGERS = [
  'task-done',
  'verify',
  'commit',
  'review',
] as const
export type GateTrigger = (typeof VALID_GATE_TRIGGERS)[number]

export const ALLOWED_GATE_EXECUTABLES = [
  'pytest',
  'ruff',
  'mypy',
  'bandit',
  'tsc',
  'eslint',
  'go',
  'golangci-lint',
  'cargo',
  'clippy',
  'phpstan',
  'phpcs',
  'javac',
  'ktlint',
  'npm',
  'npx',
  'pnpm',
  'yarn',
  'make',
  'python',
  'ruby',
  'php',
  'ansible-lint',
  'ansible',
  'terraform',
  'tflint',
  'tofu',
  'helm',
  'kubeval',
  'kube-score',
  'hadolint',
] as const
export type AllowedExecutable = (typeof ALLOWED_GATE_EXECUTABLES)[number]

// ── IDE types ─────────────────────────────────────────────────────────
export const VALID_IDES = [
  'claude',
  'cursor',
  'qwen',
  'kilo',
  'windsurf',
  'codex',
] as const
export type IdeType = (typeof VALID_IDES)[number]

export const IDE_DIRS: Record<IdeType, string> = {
  claude: '.claude',
  cursor: '.cursor',
  qwen: '.qwen',
  kilo: '.kilo',
  windsurf: '.windsurf',
  codex: '.codex',
}

// ── Entity row types (DB row shapes) ──────────────────────────────────

export interface EpicRow {
  id: number
  slug: string
  title: string
  status: EpicStatus
  description: string | null
  created_at: string
}

export interface StoryRow {
  id: number
  epic_id: number
  slug: string
  title: string
  status: StoryStatus
  description: string | null
  created_at: string
}

export interface TaskRow {
  id: number
  story_id: number | null
  slug: string
  title: string
  status: TaskStatus
  stack: string | null
  complexity: Complexity | null
  role: string | null
  score: number | null
  goal: string | null
  plan: string | null
  notes: string | null
  acceptance_criteria: string | null
  scope: string | null
  scope_exclude: string | null
  rollback_plan: string | null
  scope_paths: string | null
  scope_tools: string | null
  risk_score: number | null
  risk_json: string | null
  started_model_id: string | null
  started_model_version: string | null
  done_model_id: string | null
  done_model_version: string | null
  model_mismatch: number // 0|1
  relevant_files: string | null
  started_at: string | null
  completed_at: string | null
  blocked_at: string | null
  archived_at: string | null
  attempts: number
  claimed_by: string | null
  defect_of: string | null
  call_budget: number | null
  call_actual: number | null
  cost_budget_usd: number | null
  cost_actual_usd: number | null
  token_budget: number | null
  tokens_actual: number | null
  tier: Tier | null
  created_at: string
  updated_at: string
}

export interface SessionRow {
  id: number
  started_at: string
  ended_at: string | null
  summary: string | null
  tasks_done: string // JSON array
  handoff: string | null
  model_id: string | null
  model_version: string | null
}

export interface DecisionRow {
  id: number
  decision: string
  task_slug: string | null
  rationale: string | null
  created_at: string
}

export interface MemoryRow {
  id: number
  type: MemoryType
  title: string
  content: string
  tags: string | null
  task_slug: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface ExplorationRow {
  id: number
  title: string
  summary: string | null
  time_limit_min: number
  task_slug: string | null
  started_at: string
  ended_at: string | null
  created_at: string
}

export interface EventRow {
  id: number
  entity_type: string
  entity_id: string
  action: string
  actor: string | null
  details: string | null
  created_at: string
  prev_hash: string | null
  entry_hash: string | null
}

export interface RoleRow {
  id: number
  slug: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface MemoryEdgeRow {
  id: number
  source_type: NodeType
  source_id: number
  target_type: NodeType
  target_id: number
  relation: EdgeRelation
  confidence: number
  created_by: string | null
  valid_from: string
  valid_to: string | null
  invalidated_by: number | null
  created_at: string
}

export interface VerificationRunRow {
  id: number
  task_slug: string | null
  scope: string
  command: string
  exit_code: number
  summary: string | null
  files_hash: string
  ran_at: string
  duration_ms: number | null
  receipt_json: string | null
}

export interface TaskLogRow {
  id: number
  task_slug: string
  phase: string | null
  message: string
  created_at: string
}

export interface SessionActivityRow {
  id: number
  session_id: number
  tool_name: string
  created_at: string
}

// ── Gate config types ─────────────────────────────────────────────────

export interface GateConfig {
  enabled: boolean
  severity: GateSeverity
  trigger: GateTrigger[]
  command: string | null
  description: string
  file_extensions?: string[]
  stacks?: string[]
  timeout?: number
  max_lines?: number
}

export interface StackDetectRule {
  file: string
  type: 'exact' | 'glob' | 'dir-marker'
  keyword?: string
}

export interface StackDeclaration {
  name: string
  version?: string
  extends?: string | null
  detect?: StackDetectRule[]
  extensions?: string[]
  filenames?: string[]
  path_hints?: string[]
  gates?: Record<string, GateConfig | null>
  guide_path?: string
  extensions_extra?: string[]
}

// ── Service types ────────────────────────────────────────────────────

export interface TaskCreateInput {
  story_slug?: string | null
  slug: string
  title: string
  stack?: string | null
  complexity?: Complexity | null
  goal?: string | null
  role?: string | null
  defect_of?: string | null
  call_budget?: number | null
  tier?: Tier | null
  cost_budget_usd?: number | null
  token_budget?: number | null
  acceptance_criteria?: string | null
}

export interface TaskUpdateInput {
  title?: string
  goal?: string
  plan?: string
  notes?: string
  acceptance_criteria?: string
  scope?: string
  scope_exclude?: string
  stack?: string
  complexity?: Complexity
  role?: string
  tier?: Tier
  call_budget?: number
  relevant_files?: string[]
  started_at?: string
  completed_at?: string
  blocked_at?: string
}

export interface SessionHandoff {
  completed_tasks?: string[]
  active_tasks?: string[]
  current_goal?: string
  current_task?: string
  summary?: string
  [key: string]: unknown
}

export interface VerificationResult {
  ok: boolean
  task_slug: string | null
  gates: GateResult[]
  blocking_failures: GateFailure[]
  warnings: string[]
  cache_status: 'hit' | 'miss' | 'stale' | 'disabled'
  files_hash: string | null
  ran_at: string
}

export interface GateResult {
  name: string
  passed: boolean
  severity: GateSeverity
  skipped: boolean
  duration_ms: number
  output?: string
}

export interface GateFailure {
  gate: string
  severity: GateSeverity
  files: string[]
  output: string
  remediation?: string
}

export interface TaskDoneReport {
  ok: boolean
  slug: string
  plan_complete: boolean
  ac_verified: boolean
  gates_passed: boolean
  gates: GateResult[]
  blocking_failures: GateFailure[]
  warnings: string[]
  cache_status: string
  evidence_logged: boolean
}

export interface KpiMetrics {
  throughput: number
  fpsr: number
  der: number
  dead_end_rate: number
  cost_per_task: number
  total_tasks: number
}

// ── Receipt types ────────────────────────────────────────────────────

export interface Receipt {
  schema: string
  task_slug: string
  git_sha: string | null
  scope: string
  gates: { name: string; passed: boolean; severity: string }[]
  passed: boolean
  ran_at: string
  files_hash: string | null
  key_fingerprint: string | null
}

export interface SignedEnvelope {
  envelope: string
  receipt: Receipt
  signature: {
    algorithm: string
    key_fingerprint: string
    value: string
  }
}

// ── Config file format (\.nutausik/config.json) ──────────────────────────

export interface NutausikConfig {
  project: string
  version?: number
  custom_stacks?: string[]
  session_max_minutes?: number
  task_done?: {
    auto_verify?: boolean
  }
  verify_pipeline_timeout_seconds?: number
  renar?: {
    qg0_advisory?: boolean
  }
  model_profiles?: {
    families?: Record<string, ModelFamilyConfig>
    cost_caps?: CostCapConfig
  }
  call_budgets?: {
    trivial?: number
    light?: number
    moderate?: number
    substantial?: number
    deep?: number
  }
  cost_budgets?: {
    trivial?: number
    light?: number
    moderate?: number
    substantial?: number
    deep?: number
  }
  gates?: Record<string, GateConfig>
  ide?: IdeType
  [key: string]: unknown
}

export interface ModelFamilyConfig {
  models: string[]
  default?: string
  capability_rank?: number
}

export interface CostCapConfig {
  max_cost_per_task?: number
  max_cost_per_session?: number
  warn_at_percent?: number
}
