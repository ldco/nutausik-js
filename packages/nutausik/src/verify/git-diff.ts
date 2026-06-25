import { execa } from 'execa'

export async function gitDiffFiles(projectDir: string): Promise<string[]> {
  try {
    const { stdout } = await execa('git', ['diff', '--name-only'], { cwd: projectDir })
    const files = stdout.split('\n').filter(Boolean).map(f => f.trim())
    const { stdout: staged } = await execa('git', ['diff', '--cached', '--name-only'], { cwd: projectDir })
    const stagedFiles = staged.split('\n').filter(Boolean).map(f => f.trim())
    return [...new Set([...files, ...stagedFiles])]
  } catch {
    return []
  }
}

export async function gitCurrentSha(projectDir: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: projectDir })
    return stdout.trim()
  } catch {
    return null
  }
}
