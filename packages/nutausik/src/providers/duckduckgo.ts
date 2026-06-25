import type { SearchProvider, SearchResult } from './types.js'

export class DuckDuckGoProvider implements SearchProvider {
  async search(query: string, options?: { count?: number; region?: string }): Promise<SearchResult[]> {
    const max = options?.count ?? 5
    try {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'TAUSIK-MCP/0.1' },
      })
      const html = await response.text()

      const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi

      const results: SearchResult[] = []
      let match: RegExpExecArray | null
      const snippets: string[] = []
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1]?.replace(/<[^>]*>/g, '').trim() ?? '')
      }

      let idx = 0
      while ((match = linkRegex.exec(html)) !== null && idx < max) {
        const url = match[1]
        const title = match[2]?.replace(/<[^>]*>/g, '').trim() ?? url ?? ''
        const snippet = snippets[idx] ?? ''
        if (url && !url.includes('duckduckgo.com')) {
          results.push({ title, url, snippet, source: 'duckduckgo' })
          idx++
        }
      }

      return results
    } catch {
      return []
    }
  }
}
