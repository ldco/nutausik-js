import type { SearchProvider } from './types.js'
import { DuckDuckGoProvider } from './duckduckgo.js'

const providers = new Map<string, SearchProvider>()
try { providers.set('duckduckgo', new DuckDuckGoProvider()) } catch { /* skip */ }

export function getProvider(name?: string): SearchProvider {
  const key = name ?? 'duckduckgo'
  const p = providers.get(key)
  if (!p) throw new Error(`Search provider '${key}' not found. Available: ${[...providers.keys()].join(', ')}`)
  return p
}

export function listProviders(): string[] {
  return [...providers.keys()]
}
