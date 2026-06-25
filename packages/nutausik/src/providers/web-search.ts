import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, { title: string; url: string; snippet: string }[]>({ max: 500, ttl: 1000 * 60 * 60 })
let context = ''

export function getContext(): string { return context }
export function setContext(v: string): void { context = v }
export function clearContext(): void { context = '' }
export function clearCache(): void { cache.clear() }

export async function searchWeb(query: string, max = 5): Promise<{ title: string; url: string; snippet: string }[]> {
  const cached = cache.get(query)
  if (cached) return cached.slice(0, max)

  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  const html = await response.text()
  const results: { title: string; url: string; snippet: string }[] = []
  const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi
  const snippets: string[] = []
  let m: RegExpExecArray | null
  while ((m = snippetRe.exec(html)) !== null) snippets.push(m[1]?.replace(/<[^>]*>/g, '').trim() ?? '')
  let i = 0
  while ((m = linkRe.exec(html)) !== null && i < max) {
    if (m[1] && !m[1].includes('duckduckgo.com')) {
      results.push({ title: m[2]?.replace(/<[^>]*>/g, '').trim() ?? '', url: m[1], snippet: snippets[i] ?? '' })
      i++
    }
  }
  cache.set(query, results)
  return results
}

export async function fetchWeb(url: string): Promise<{ title: string; content: string }> {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const html = await response.text()

  try {
    const { JSDOM } = await import('jsdom')
    const dom = new JSDOM(html, { url })
    const { Readability } = await import('@mozilla/readability')
    const article = new Readability(dom.window.document).parse()
    if (article) {
      const TurndownService = (await import('turndown')).default
      const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
      const markdown = turndown.turndown(article.content)
      return { title: article.title || url, content: markdown }
    }
  } catch {
    const cheerio = await import('cheerio')
    const $ = cheerio.load(html)
    $('script, style, nav, footer, header, aside').remove()
    const body = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000)
    const title = $('title').text().trim() || url
    return { title, content: body }
  }
  return { title: url, content: 'Could not extract content.' }
}
