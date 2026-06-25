import { existsSync } from 'node:fs'

export function resolveTestFiles(sourceFiles: string[]): string[] {
  const testFiles: string[] = []
  for (const file of sourceFiles) {
    const possibleTests = possibleTestPaths(file)
    for (const t of possibleTests) {
      if (existsSync(t)) testFiles.push(t)
    }
  }
  return [...new Set(testFiles)]
}

function possibleTestPaths(sourceFile: string): string[] {
  const suffixes = [
    '.test.ts', '.test.tsx', '.test.js', '.test.jsx',
    '.spec.ts', '.spec.tsx', '.spec.js', '.spec.jsx',
    '_test.go', '_test.py',
  ]
  const dir = sourceFile.substring(0, sourceFile.lastIndexOf('/') + 1) || ''
  const basename = sourceFile.substring(sourceFile.lastIndexOf('/') + 1)
  const nameWithoutExt = basename.replace(/\.[^.]+$/, '')

  const result: string[] = []
  for (const suffix of suffixes) {
    result.push(`${dir}${nameWithoutExt}${suffix}`)
  }
  if (dirname(sourceFile)?.endsWith('__tests__')) {
    result.push(sourceFile.replace(/\.(ts|tsx|js)$/, '.test.$1'))
  }
  return result
}

function dirname(path: string): string | null {
  const idx = path.lastIndexOf('/')
  return idx >= 0 ? path.slice(0, idx) : null
}
