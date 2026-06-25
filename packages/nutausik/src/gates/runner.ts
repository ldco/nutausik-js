import type { GateResult, GateFailure } from '../types/index.js'
import type { GateDefinition } from './defaults.js'
import { filesizeGate } from './filesize.js'
import { runCommandGate } from './command-runner.js'

export interface GatePipelineResult {
  gates: GateResult[]
  blocking_failures: GateFailure[]
  warnings: string[]
  passed: boolean
}

export async function runGates(
  gates: GateDefinition[],
  files: string[],
  timeoutMs = 60_000,
): Promise<GatePipelineResult> {
  const results: GateResult[] = []
  const blockingFailures: GateFailure[] = []
  const warnings: string[] = []

  for (const gate of gates) {
    if (!gate.enabled) continue

    let result: GateResult

    if (gate.name === 'filesize') {
      result = filesizeGate(files, gate.maxLines ?? 400)
    } else if (gate.command) {
      result = await runCommandGate(gate.command, files, gate.timeout ?? timeoutMs)
    } else {
      continue
    }

    results.push(result)

    if (!result.passed && !result.skipped) {
      const failure: GateFailure = {
        gate: gate.name,
        severity: gate.severity,
        files: [...files],
        output: result.output ?? '',
      }

      if (gate.severity === 'block') {
        blockingFailures.push(failure)
      } else {
        warnings.push(`Gate '${gate.name}' warned: ${result.output ?? ''}`)
      }
    }
  }

  return {
    gates: results,
    blocking_failures: blockingFailures,
    warnings,
    passed: blockingFailures.length === 0,
  }
}
