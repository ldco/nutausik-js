const MODEL_COST: Record<string, { input: number; output: number }> = {
  'claude-haiku': { input: 0.25, output: 1.25 },
  'claude-sonnet': { input: 3.00, output: 15.00 },
  'claude-opus': { input: 15.00, output: 75.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'deepseek-r1': { input: 0.55, output: 2.19 },
  default: { input: 3.00, output: 15.00 },
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): { inputCost: number; outputCost: number; total: number } {
  const costs = MODEL_COST[model] ?? MODEL_COST.default!
  const inputCost = (inputTokens / 1_000_000) * costs.input
  const outputCost = (outputTokens / 1_000_000) * costs.output
  return {
    inputCost,
    outputCost,
    total: inputCost + outputCost,
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function listModelPricing(): Record<string, { input: number; output: number }> {
  return { ...MODEL_COST }
}
