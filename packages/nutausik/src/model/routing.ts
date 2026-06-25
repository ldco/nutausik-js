import type { Complexity, Tier } from '../types/index.js'

const MODEL_MATRIX: Record<string, { models: string[]; capabilityRank: number }> = {
  a: { models: ['claude-haiku', 'gpt-4o-mini', 'gemini-flash'], capabilityRank: 1 },
  b: { models: ['claude-sonnet', 'gpt-4o', 'gemini-pro'], capabilityRank: 2 },
  c: { models: ['claude-opus', 'o1', 'gemini-ultra', 'deepseek-r1'], capabilityRank: 3 },
}

const TIER_FAMILY: Record<Tier, string> = {
  trivial: 'a',
  light: 'a',
  moderate: 'b',
  substantial: 'b',
  deep: 'c',
}

const COMPLEXITY_FAMILY: Record<Complexity, string> = {
  simple: 'a',
  medium: 'b',
  complex: 'c',
}

export function suggestModel(task: {
  complexity?: Complexity | null
  tier?: Tier | null
  stack?: string | null
}): string | null {
  const family = task.tier
    ? TIER_FAMILY[task.tier]
    : task.complexity
      ? COMPLEXITY_FAMILY[task.complexity]
      : 'b'

  const entry = MODEL_MATRIX[family]
  return entry?.models[0] ?? null
}

export function getFamilyRank(family: string): number {
  return MODEL_MATRIX[family]?.capabilityRank ?? 0
}

export function matchesProfile(modelId: string, family: string): boolean {
  const entry = MODEL_MATRIX[family]
  if (!entry) return false
  return entry.models.some(m => modelId.toLowerCase().includes(m.split('-')[0]!))
}
