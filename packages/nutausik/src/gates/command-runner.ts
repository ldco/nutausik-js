import { execa } from 'execa'
import type { GateResult } from '../types/index.js'

export async function runCommandGate(
  command: string,
  files: string[],
  timeout = 60_000,
): Promise<GateResult> {
  const start = Date.now()
  const cmd = command.replace('{files}', files.join(' '))

  try {
    const { exitCode, stdout, stderr } = await execa(cmd, {
      shell: true,
      timeout,
      reject: false,
      preferLocal: true,
    })
    const duration_ms = Date.now() - start
    return {
      name: command.split(/\s+/)[0] ?? 'gate',
      passed: exitCode === 0,
      severity: exitCode === 0 ? 'block' : 'warn',
      skipped: false,
      duration_ms,
      output: stdout || stderr || undefined,
    }
  } catch (err) {
    const duration_ms = Date.now() - start
    return {
      name: command.split(/\s+/)[0] ?? 'gate',
      passed: false,
      severity: 'warn',
      skipped: true,
      duration_ms,
      output: (err as Error).message,
    }
  }
}
