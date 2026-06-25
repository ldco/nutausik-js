import type { TaskRow } from '../types/index.js'

const RISK_WEIGHTS = {
  hasSecurityKeywords: 0.3,
  noGoal: 0.2,
  noPlan: 0.1,
  highComplexity: 0.15,
  deepTier: 0.1,
  defectTask: 0.15,
}

export function computeRiskScore(task: Partial<TaskRow>): number {
  let score = 0

  const goal = task.goal ?? ''
  const acceptance = task.acceptance_criteria ?? ''
  const combined = (goal + ' ' + acceptance).toLowerCase()

  const securityKeywords = ['auth', 'password', 'token', 'credential', 'secret', 'encrypt', 'session', 'xss', 'csrf', 'sql', 'injection']
  if (securityKeywords.some(k => combined.includes(k))) {
    score += RISK_WEIGHTS.hasSecurityKeywords
  }

  if (!task.goal) score += RISK_WEIGHTS.noGoal
  if (!task.plan) score += RISK_WEIGHTS.noPlan
  if (task.complexity === 'complex') score += RISK_WEIGHTS.highComplexity
  if (task.tier === 'deep') score += RISK_WEIGHTS.deepTier
  if (task.defect_of) score += RISK_WEIGHTS.defectTask

  return Math.min(1.0, score)
}

export function requiresL3Review(score: number): boolean {
  return score >= 0.6
}
