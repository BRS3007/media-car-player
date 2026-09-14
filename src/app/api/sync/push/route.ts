import { NextResponse } from 'next/server'
import { ensureSchema, getPool } from '@/lib/db'
import { getUserIdByToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface PushItem {
  mediaId: string
  title: string
  artist?: string
  type: string
  ritmo?: string
  duration?: number | null
  cloudinaryPublicId: string
  cloudinaryUrl: string
  sizeBytes?: number | null
  updatedAt: number
}

export async function POST(req: Request) {
  try {
    const token = (req.headers.get('x-session-token') ?? '').trim()
    const userId = await getUserIdByToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const items: PushItem[] = Array.isArray(body.items) ? body.items : []
    if (!items.length) return NextResponse.json({ ok: true, count: 0 })

    await ensureSchema()
    const db = getPool()
    let count = 0
    for (const it of items) {
      await db.execute(
        `INSERT INTO media_car
           (user_id, media_id, title, artist, type, ritmo, duration, cloudinary_public_id, cloudinary_url, size_bytes, updated_at, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           artist = VALUES(artist),
           type = VALUES(type),
           ritmo = VALUES(ritmo),
           duration = VALUES(duration),
           cloudinary_public_id = VALUES(cloudinary_public_id),
           cloudinary_url = VALUES(cloudinary_url),
           size_bytes = VALUES(size_bytes),
           updated_at = VALUES(updated_at),
           deleted = 0`,
        [
          userId,
          it.mediaId,
          it.title,
          it.artist ?? '',
          it.type,
          it.ritmo ?? '',
          it.duration ?? null,
          it.cloudinaryPublicId,
          it.cloudinaryUrl,
          it.sizeBytes ?? null,
          it.updatedAt,
        ]
      )
      count++
    }
    return NextResponse.json({ ok: true, count })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de servidor' }, { status: 500 })
  }
}