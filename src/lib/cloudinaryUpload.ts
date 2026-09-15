export type CloudSigned = {
  cloudName: string
  apiKey: number
  timestamp: number
  signature: string
  folder: string
}

const CHUNK_SIZE = 5 * 1024 * 1024

function resourceType(file: Blob): 'image' | 'video' | 'raw' {
  const type = file.type || ''
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('audio/') || type.startsWith('video/')) return 'video'
  return 'raw'
}

function buildForm(signed: CloudSigned, file: Blob, fileName: string): FormData {
  const form = new FormData()
  form.append('file', file, fileName)
  form.append('api_key', String(signed.apiKey))
  form.append('timestamp', String(signed.timestamp))
  form.append('signature', signed.signature)
  form.append('folder', signed.folder)
  return form
}

function uniqueId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    // fall through
  }
  return 'uid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}

export async function uploadToCloudinary(
  signed: CloudSigned,
  file: Blob,
  fileName: string
): Promise<{ public_id?: string; secure_url?: string; bytes?: number }> {
  const base = `https://api.cloudinary.com/v1_1/${signed.cloudName}`

  if (file.size <= CHUNK_SIZE) {
    const res = await fetch(`${base}/auto/upload`, { method: 'POST', body: buildForm(signed, file, fileName) })
    if (!res.ok) throw new Error('Cloudinary rechazó la subida (HTTP ' + res.status + ')')
    return res.json()
  }

  const resource = resourceType(file)
  const uploadId = uniqueId()
  let start = 0
  let result: { public_id?: string; secure_url?: string; bytes?: number } | null = null
  while (start < file.size) {
    const end = Math.min(file.size, start + CHUNK_SIZE)
    const chunk = file.slice(start, end)
    const res = await fetch(`${base}/${resource}/upload`, {
      method: 'POST',
      headers: {
        'X-Unique-Upload-Id': uploadId,
        'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
      },
      body: buildForm(signed, chunk, fileName),
    })
    if (!res.ok) throw new Error('Subida en trozos rechazada (HTTP ' + res.status + ')')
    result = await res.json()
    start = end
  }
  return result || {}
}