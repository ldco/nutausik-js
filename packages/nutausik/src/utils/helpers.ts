export class NutausikError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NutausikError'
  }
}

export class ServiceError extends NutausikError {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

// ── Time ──────────────────────────────────────────────────────────────

export function utcnowIso(): string {
  const now = new Date()
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Slug validation ──────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]([a-z0-9_-]{0,62}[a-z0-9])?$/
const SLUG_MAX_LENGTH = 64

export function validateSlug(slug: string): void {
  if (!slug || typeof slug !== 'string') {
    throw new ServiceError('Slug is required')
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    throw new ServiceError(
      `Slug too long (max ${SLUG_MAX_LENGTH} chars): ${slug}`
    )
  }
  if (!SLUG_RE.test(slug)) {
    throw new ServiceError(
      `Invalid slug '${slug}'. Must match: lowercase alphanumeric, ` +
      `hyphens/underscores allowed, 1-64 chars, no leading/trailing separators.`
    )
  }
}

export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

// ── Content validation ───────────────────────────────────────────────

export function validateContent(value: unknown, label: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ServiceError(`${label} is required`)
  }
}

export function validateLength(
  value: string,
  label: string,
  maxLength = 10000
): void {
  if (value.length > maxLength) {
    throw new ServiceError(
      `${label} too long (max ${maxLength} chars)`
    )
  }
}

// ── Single-line sanitizer ────────────────────────────────────────────

export function safeSingleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

// ── Status formatting ────────────────────────────────────────────────

export interface StatusSummary {
  project: string
  version: string
  tasks: {
    total: number
    planning: number
    active: number
    blocked: number
    review: number
    done: number
  }
  session: {
    active: boolean
    id?: number
    started_at?: string
    active_minutes?: number
    wall_minutes?: number
    session_warning?: string | null
  }
  epics: number
  stories: number
}

export function formatStatusText(status: StatusSummary): string {
  const lines: string[] = [
    `Project: ${status.project}`,
    `Version: ${status.version}`,
    '',
    `Tasks: ${status.tasks.total} total`,
    `  ${status.tasks.planning} planning`,
    `  ${status.tasks.active} active`,
    `  ${status.tasks.blocked} blocked`,
    `  ${status.tasks.review} review`,
    `  ${status.tasks.done} done`,
    '',
  ]
  if (status.session.active && status.session.id != null) {
    lines.push(
      `Session #${status.session.id}: active ${status.session.active_minutes ?? 0} min / 180 min limit`
    )
    if (status.session.session_warning) {
      lines.push(`  ⚠ ${status.session.session_warning}`)
    }
  } else {
    lines.push('Session: none')
  }
  lines.push(`Epics: ${status.epics}`)
  lines.push(`Stories: ${status.stories}`)
  return lines.join('\n')
}

export function formatStatusCompactJson(status: StatusSummary): string {
  return JSON.stringify({
    tasks: {
      total: status.tasks.total,
      active: status.tasks.active,
      blocked: status.tasks.blocked,
      done: status.tasks.done,
    },
    session: status.session.active
      ? {
          id: status.session.id,
          active_minutes: status.session.active_minutes,
          wall_minutes: status.session.wall_minutes,
          warning: status.session.session_warning ?? null,
        }
      : null,
  })
}

// ── Table formatting ─────────────────────────────────────────────────

export function formatTable(
  rows: Record<string, unknown>[],
  columns: string[]
): string {
  if (!rows.length) return '  (none)'
  const widths: Record<string, number> = {}
  for (const col of columns) {
    widths[col] = Math.max(
      col.length,
      ...rows.map((r) => String(r[col] ?? '').length)
    )
  }
  const header = columns.map((c) => c.padEnd(widths[c] ?? 0)).join('  ')
  const sep = columns.map((c) => '-'.repeat(widths[c] ?? 0)).join('  ')
  const body = rows.map((r) =>
    columns.map((c) => String(r[c] ?? '').padEnd(widths[c] ?? 0)).join('  ')
  )
  return [header, sep, ...body].join('\n')
}

// ── JSON parse helper ────────────────────────────────────────────────

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
