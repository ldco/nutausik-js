import type { SQLiteBackend } from '../backend/database.js'
import * as crud from '../backend/crud.js'
import { computeFilesHash } from '../verify/files-hash.js'
import { lookupRecent, recordRun } from '../verify/cache.js'
import { gatesForFiles } from '../gates/stack-dispatch.js'
import { runGates } from '../gates/runner.js'
import type { VerificationResult } from '../types/index.js'

export async function runVerifyForTask(
  be: SQLiteBackend,
  taskSlug: string | null,
  relevantFiles?: string[],
  scope = 'standard',
): Promise<VerificationResult> {
  const files: string[] = relevantFiles ?? []

  if (taskSlug) {
    const task = crud.taskGet(be, taskSlug)
    if (!task) {
      return {
        ok: false,
        task_slug: taskSlug,
        gates: [],
        blocking_failures: [{ gate: 'input', severity: 'block', files: [], output: `Task '${taskSlug}' not found.` }],
        warnings: [],
        cache_status: 'disabled',
        files_hash: null,
        ran_at: new Date().toISOString(),
      }
    }
    if (!files.length) {
      const raw = task.relevant_files || '[]'
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) files.push(...parsed)
      } catch { /* ignore */ }
    }
  }

  const filesHash = files.length > 0 ? computeFilesHash(files) : 'no-files'

  if (taskSlug) {
    const cached = lookupRecent(be, taskSlug, filesHash)
    if (cached) {
      return {
        ok: cached.exitCode === 0,
        task_slug: taskSlug,
        gates: [{ name: cached.command, passed: cached.exitCode === 0, severity: 'block', skipped: false, duration_ms: 0 }],
        blocking_failures: cached.exitCode === 0 ? [] : [{ gate: cached.command, severity: 'block', files, output: cached.summary ?? '' }],
        warnings: [],
        cache_status: 'hit',
        files_hash: filesHash,
        ran_at: cached.ranAt,
      }
    }
  }

  const gates = gatesForFiles(files)
  const pipeline = await runGates(gates, files)

  if (taskSlug) {
    const allPassed = pipeline.passed
    recordRun(be, taskSlug, scope, pipeline.gates.map(g => g.name).join(','), allPassed ? 0 : 1, filesHash, allPassed ? 'All gates passed.' : 'Some gates failed.')
  }

  return {
    ok: pipeline.passed,
    task_slug: taskSlug,
    gates: pipeline.gates,
    blocking_failures: pipeline.blocking_failures,
    warnings: pipeline.warnings,
    cache_status: taskSlug ? 'miss' : 'disabled',
    files_hash: filesHash,
    ran_at: new Date().toISOString(),
  }
}
