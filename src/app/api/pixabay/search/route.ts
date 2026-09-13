import { NextRequest, NextResponse } from 'next/server'
import type { PixabayVideoHit } from '@/lib/pixabay'

export const dynamic = 'force-dynamic'

interface RawHit {
  id: number
  pageURL: string
  tags: string
  duration: number
  image?: string
  videos?: {
    large?: { url: string; width: number; height: number; size: number }
    medium?: { url: string; width: number; height: number; size: number }
    small?: { url: string; width: number; height: number; size: number }
  }
  views: number
  downloads: number
  user: string
}

interface RawResponse {
  total?: number
  totalHits?: number
  hits?: RawHit[]
  error?: string
}

function sanitizeHit(hit: RawHit): PixabayVideoHit {
  return {
    id: hit.id,
    pageURL: hit.pageURL,
    tags: hit.tags || '',
    duration: hit.duration || 0,
    image: hit.image || null,
    videos: {
      large: hit.videos?.large ?? null,
      medium: hit.videos?.medium ?? null,
      small: hit.videos?.small ?? null,
    },
    views: hit.views || 0,
    downloads: hit.downloads || 0,
    user: hit.user || '',
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()
  const apiKey =
    request.nextUrl.searchParams.get('key')?.trim() || process.env.PIXABAY_API_KEY?.trim() || ''

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Falta la API key de Pixabay. Configúrala en Almacenar > Pixabay o en PIXABAY_API_KEY.' },
      { status: 400 }
    )
  }
  if (!query) {
    return NextResponse.json({ error: 'Falta el término de búsqueda' }, { status: 400 })
  }

  const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(
    query
  )}&per_page=20&safesearch=true`

  try {
    const res = await fetch(url)
    const data: RawResponse = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || `Error de Pixabay (${res.status})` },
        { status: res.status }
      )
    }

    const hits = (data.hits ?? []).map(sanitizeHit)
    return NextResponse.json({ total: data.totalHits ?? 0, hits })
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con Pixabay' }, { status: 502 })
  }
}