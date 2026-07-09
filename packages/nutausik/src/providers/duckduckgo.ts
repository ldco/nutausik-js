import type { SearchProvider, SearchResult } from './types.js'

export class DuckDuckGoProvider implements SearchProvider {
  async search(query: string, options?: { count?: number; region?: string }): Promise<SearchResult[]> {
    const max = options?.count ?? 5
    try {
      // Use lite endpoint — doesn't trigger CAPTCHA
      const response = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NoCowboy/1.0)' },
      })
      const html = await response.text()

      // Lite DGG format: <a rel="nofollow" href="URL">TITLE</a>
      // followed by <td class="result-snippet">SNIPPET</td>
      const linkRegex = /<a rel="nofollow" href="([^"]*)">([^<]*)<\/a>/gi
      const snippetRegex = /<td class="result-snippet">([^<]*)<\/td>/gi
      // Also try fallback: extract snippet text from nearby <td>
      const fallbackSnippetRegex = /<td[^>]*>([^<]{30,500})<\/td>/gi

      const results: SearchResult[] = []
      const snippets: string[] = []
      let match: RegExpExecArray | null

      // Try primary snippet regex first
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1]?.replace(/<[^>]*>/g, '').trim() ?? '')
      }
      // Fallback: extract text-only td elements (no HTML tags inside)
      if (snippets.length === 0) {
        while ((match = fallbackSnippetRegex.exec(html)) !== null) {
          const text = match[1]?.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim() ?? ''
          if (text.length > 20 && !text.startsWith('&')) snippets.push(text)
        }
      }

      let idx = 0
      while ((match = linkRegex.exec(html)) !== null && idx < max) {
        const url = match[1]
        const title = match[2]?.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim() ?? url ?? ''
        const snippet = snippets[idx] ?? ''
        // Skip DuckDuckGo internal links and menu items
        if (url && !url.includes('duckduckgo.com') && !url.startsWith('/') && !url.startsWith('?')) {
          results.push({ title, url: url.startsWith('//') ? `https:${url}` : url, snippet, source: 'duckduckgo' })
          idx++
        }
      }

      return results
    } catch {
      return []
    }
  }
}
