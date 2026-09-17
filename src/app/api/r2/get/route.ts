import { NextRequest, NextResponse } from 'next/server'
import { getUserIdByToken } from '@/lib/auth'
import { presignUrl } from '@/lib/r2'

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-session-token')
  if (!token || !(await getUserIdByToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const key = req.nextUrl.searchParams.get('key')
  if (!key || key.length > 200) {
    return NextResponse.json({ error: 'Clave inválida' }, { status: 400 })
  }
  try {
    const url = await presignUrl(key, { method: 'GET', expiresInSeconds: 300 })
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.json({ error: 'R2 no configurado' }, { status: 500 })
  }
}