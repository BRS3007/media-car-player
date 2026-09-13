export interface PixabayVideoSize {
  url: string
  width: number
  height: number
  size: number
}

export interface PixabayVideoHit {
  id: number
  pageURL: string
  tags: string
  duration: number
  image: string | null
  videos: {
    large?: PixabayVideoSize | null
    medium?: PixabayVideoSize | null
    small?: PixabayVideoSize | null
  }
  views: number
  downloads: number
  user: string
}

export interface PixabaySearchResult {
  total: number
  hits: PixabayVideoHit[]
}

export async function searchPixabayVideos(
  query: string,
  apiKey: string,
  perPage = 20
): Promise<PixabaySearchResult> {
  const params = new URLSearchParams({ q: query, key: apiKey, per_page: String(perPage) })
  const res = await fetch(`/api/pixabay/search?${params.toString()}`)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Error al buscar en Pixabay')
  }
  return data as PixabaySearchResult
}

export function directDownloadUrl(size: PixabayVideoSize): string {
  const sep = size.url.includes('?') ? '&' : '?'
  return `${size.url}${sep}download=1`
}