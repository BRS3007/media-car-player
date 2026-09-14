import { NextResponse } from 'next/server'
import { ensureSchema, getPool } from '@/lib/db'
import { getUserIdByToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const token = (req.headers.get('x-session-token') ?? '').trim()
    const userId = await getUserIdByToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const mediaId = String(body.mediaId ?? '')
    if (!mediaId) {
      return NextResponse.json({ error: 'Falta mediaId' }, { status: 400 })
    }
    await ensureSchema()
    const db = getPool()
    await db.execute(
      'UPDATE media_car SET deleted = 1 WHERE user_id = ? AND media_id = ?',
      [userId, mediaId]
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de servidor' }, { status: 500 })
  }
}