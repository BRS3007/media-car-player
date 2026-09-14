import { NextResponse } from 'next/server'
import { ensureSchema, getPool } from '@/lib/db'
import { getUserIdByToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface CloudItem {
  mediaId: string
  title: string
  artist: string
  type: string
  ritmo: string
  duration: number | null
  publicId: string
  cloudinaryUrl: string
  sizeBytes: number | null
  updatedAt: number
}

export async function GET(req: Request) {
  try {
    const token = (req.headers.get('x-session-token') ?? '').trim()
    const userId = await getUserIdByToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })
    }
    await ensureSchema()
    const db = getPool()
    const [rows] = await db.execute<any[]>(
      `SELECT media_id AS mediaId, title, artist, type, ritmo, duration,
              cloudinary_public_id AS publicId, cloudinary_url AS cloudinaryUrl,
              size_bytes AS sizeBytes, updated_at AS updatedAt
       FROM media_car
       WHERE user_id = ? AND deleted = 0`,
      [userId]
    )
    const items: CloudItem[] = rows.map((r) => ({
      mediaId: r.mediaId,
      title: r.title,
      artist: r.artist ?? '',
      type: r.type,
      ritmo: r.ritmo ?? '',
      duration: r.duration == null ? null : Number(r.duration),
      publicId: r.publicId,
      cloudinaryUrl: r.cloudinaryUrl,
      sizeBytes: r.sizeBytes == null ? null : Number(r.sizeBytes),
      updatedAt: Number(r.updatedAt),
    }))
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de servidor' }, { status: 500 })
  }
}