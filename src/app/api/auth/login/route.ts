import { NextResponse } from 'next/server'
import { ensureSchema, getPool } from '@/lib/db'
import { createSession, findUser, hashPin } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const name = String(body.name ?? '').trim()
    const pin = String(body.pin ?? '').trim()
    if (!name || !pin) {
      return NextResponse.json({ error: 'Faltan nombre o PIN' }, { status: 400 })
    }
    const user = await findUser(name)
    if (!user || user.pinHash !== hashPin(pin)) {
      return NextResponse.json({ error: 'Nombre o PIN incorrecto' }, { status: 401 })
    }
    const token = await createSession(user.id)
    return NextResponse.json({ token, userId: user.id, name })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de servidor' }, { status: 500 })
  }
}