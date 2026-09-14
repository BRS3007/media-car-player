import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const token = String(body.token ?? '')
  if (!token) return NextResponse.json({ ok: true })
  try {
    await deleteSession(token)
  } catch {
    // sin importar el estado, la sesión muere
  }
  return NextResponse.json({ ok: true })
}