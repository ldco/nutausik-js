import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export function computeFilesHash(files: string[]): string {
  const hash = createHash('sha256')
  for (const file of files.sort()) {
    try {
      const content = readFileSync(file)
      hash.update(file).update(content)
    } catch {
      hash.update(file).update('__missing__')
    }
  }
  return hash.digest('hex')
}
