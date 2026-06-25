import { ServiceError } from '../utils/helpers.js'
import { VALID_COMPLEXITIES, VALID_TIERS } from '../types/index.js'

export function validateSlug(slug: string): void {
  if (!slug || typeof slug !== 'string') throw new ServiceError('Slug is required')
  if (slug.length > 64) throw new ServiceError(`Slug too long (max 64 chars): ${slug}`)
  if (!/^[a-z0-9]([a-z0-9_-]{0,62}[a-z0-9])?$/.test(slug)) {
    throw new ServiceError(`Invalid slug '${slug}'. Must match: lowercase alphanumeric, hyphens/underscores allowed, 1-64 chars, no leading/trailing separators.`)
  }
}

export function validateTaskStatus(value: string): string {
  if (!['planning', 'active', 'blocked', 'review', 'done'].includes(value)) {
    throw new ServiceError(`Invalid status '${value}'. Valid: planning, active, blocked, review, done.`)
  }
  return value
}

export function validateStack(stack: string | null | undefined, validStacks: Set<string>): void {
  if (stack && !validStacks.has(stack)) {
    throw new ServiceError(`Invalid stack '${stack}'. Valid stacks: ${[...validStacks].join(', ')}`)
  }
}

export function validateComplexity(value: string | null | undefined): void {
  if (value && !(VALID_COMPLEXITIES as readonly string[]).includes(value)) {
    throw new ServiceError(`Invalid complexity '${value}'. Valid: ${VALID_COMPLEXITIES.join(', ')}`)
  }
}

export function validateTier(value: string | null | undefined): void {
  if (value && !(VALID_TIERS as readonly string[]).includes(value)) {
    throw new ServiceError(`Invalid tier '${value}'. Valid: ${VALID_TIERS.join(', ')}`)
  }
}

export function validateCallBudget(value: number | null | undefined): void {
  if (value != null && (value < 0 || !Number.isInteger(value))) {
    throw new ServiceError(`Call budget must be a non-negative integer, got '${value}'`)
  }
}

export function validateTaskAddInputs(
  stack?: string | null,
  complexity?: string | null,
  callBudget?: number | null,
  tier?: string | null,
): void {
  const stacks = new Set(['python', 'typescript', 'react', 'go', 'rust', 'java', 'javascript', 'vue', 'svelte', 'next', 'nuxt', 'fastapi', 'flask', 'django', 'laravel', 'php', 'blade', 'kotlin', 'swift', 'flutter', 'ansible', 'terraform', 'helm', 'kubernetes', 'docker'])
  validateStack(stack ?? null, stacks)
  validateComplexity(complexity ?? null)
  validateTier(tier ?? null)
  validateCallBudget(callBudget ?? null)
}

export function validateContent(value: unknown, label: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ServiceError(`${label} is required`)
  }
}

export function validateLength(value: string, label: string, maxLength = 10000): void {
  if (value.length > maxLength) throw new ServiceError(`${label} too long (max ${maxLength} chars)`)
}

export function slugFromTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64)
}
