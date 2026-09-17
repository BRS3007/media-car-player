import { NextRequest, NextResponse } from 'next/server'
import { getUserIdByToken } from '@/lib/auth'
import { presignUrl, getR2Config } from '@/lib/r2'

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-session-token')
  if (!token || !(await getUserIdByToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  let key: string | undefined
  try {
    const body = await req.json()
    key = typeof body.key === 'string' ? body.key : undefined
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  if (!key || key.length > 200 || key.includes('..')) {
    return NextResponse.json({ error: 'Clave inválida' }, { status: 400 })
  }
  let url: string
  try {
    url = await presignUrl(key, { method: 'PUT', expiresInSeconds: 900 })
  } catch {
    return NextResponse.json({ error: 'R2 no configurado' }, { status: 500 })
  }
  return NextResponse.json({ url })
}