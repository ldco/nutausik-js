import { computeRiskScore, requiresL3Review } from './compute.js'
import type { TaskRow } from '../types/index.js'

export interface L3ReviewRequest {
  task_slug: string
  risk_score: number
  reason: string
  created_at: string
}

export function checkRequiresReview(task: Partial<TaskRow>): L3ReviewRequest | null {
  const score = computeRiskScore(task)
  if (!requiresL3Review(score)) return null

  const reasons: string[] = []
  const combined = ((task.goal ?? '') + ' ' + (task.acceptance_criteria ?? '')).toLowerCase()
  const securityKeywords = ['auth', 'password', 'token', 'credential', 'secret', 'encrypt', 'session', 'xss', 'csrf', 'sql', 'injection']
  if (securityKeywords.some(k => combined.includes(k))) reasons.push('security-sensitive content')
  if (!task.goal) reasons.push('no goal defined')
  if (!task.plan) reasons.push('no plan defined')
  if (task.complexity === 'complex') reasons.push('high complexity')
  if (task.tier === 'deep') reasons.push('deep tier task')

  return {
    task_slug: task.slug ?? 'unknown',
    risk_score: score,
    reason: reasons.join('; ') || `risk score ${score.toFixed(2)} >= 0.6`,
    created_at: new Date().toISOString(),
  }
}
