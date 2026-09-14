import { NextResponse } from 'next/server'
import { ensureSchema, getPool } from '@/lib/db'
import { createSession, createUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const name = String(body.name ?? '').trim()
    const pin = String(body.pin ?? '').trim()
    if (!name || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'Nombre y PIN de 4 a 6 dígitos son obligatorios' }, { status: 400 })
    }
    const db = getPool()
    let userId: number
    try {
      userId = await createUser(name, pin)
    } catch (err) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ error: 'Ese nombre ya existe. Inicia sesión en vez de registrarte.' }, { status: 409 })
      }
      throw err
    }
    const token = await createSession(userId)
    return NextResponse.json({ token, userId, name })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de servidor' }, { status: 500 })
  }
}