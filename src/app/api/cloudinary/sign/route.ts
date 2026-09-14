import { NextResponse } from 'next/server'
import { CLOUD_FOLDER, getCloudinaryConfig, signParams } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const { cloudName, apiKey } = getCloudinaryConfig()
    const timestamp = String(Math.round(Date.now() / 1000))
    const params: Record<string, string> = {
      timestamp,
      folder: CLOUD_FOLDER,
    }
    const signature = signParams(params)
    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: params.folder,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de servidor' }, { status: 500 })
  }
}