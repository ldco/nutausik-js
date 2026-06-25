export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

export interface SearchProvider {
  search(query: string, options?: { count?: number; region?: string }): Promise<SearchResult[]>
}

export interface FetcherResult {
  title: string
  content: string
  url: string
}
