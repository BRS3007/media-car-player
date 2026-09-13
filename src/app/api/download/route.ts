import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Falta el parámetro url' }, { status: 400 })
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 240_000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    })

    if (!res.ok || !res.body) {
      return NextResponse.json({ error: `El servidor respondió ${res.status}` }, { status: 502 })
    }

    const headers = new Headers()
    headers.set('content-type', res.headers.get('content-type') || 'application/octet-stream')
    const disposition = res.headers.get('content-disposition')
    if (disposition) headers.set('content-disposition', disposition)

    return new NextResponse(res.body as ReadableStream, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'No se pudo descargar la URL' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}