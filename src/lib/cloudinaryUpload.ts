export type CloudSigned = {
  cloudName: string
  apiKey: number
  timestamp: number
  signature: string
  folder: string
}

const CHUNK_SIZE = 5 * 1024 * 1024

type UpResult = {
  status: number
  json: { public_id?: string; secure_url?: string; bytes?: number; error?: { message?: string } }
}

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

async function postUpload(
  base: string,
  endpoint: string,
  signed: CloudSigned,
  file: Blob,
  fileName: string,
  headers: Record<string, string> = {}
): Promise<UpResult> {
  const res = await fetch(`${base}/${endpoint}`, {
    method: 'POST',
    headers,
    body: buildForm(signed, file, fileName),
  })
  const text = await res.text()
  let json: UpResult['json'] = {}
  try {
    json = JSON.parse(text)
  } catch {
    // no JSON body
  }
  return { status: res.status, json }
}

function ok(r: UpResult): boolean {
  return r.status >= 200 && r.status < 300 && Boolean(r.json?.public_id)
}

function failMessage(r: UpResult): string {
  const m = r.json?.error?.message
  return m ? `Cloudinary: ${m}` : `Cloudinary: HTTP ${r.status}`
}

async function chunkedUpload(
  base: string,
  resource: string,
  signed: CloudSigned,
  file: Blob,
  fileName: string
): Promise<UpResult['json']> {
  const uploadId = uniqueId()
  let start = 0
  let result: UpResult['json'] = {}
  while (start < file.size) {
    const end = Math.min(file.size, start + CHUNK_SIZE)
    const chunk = file.slice(start, end)
    const r = await postUpload(base, `${resource}/upload`, signed, chunk, fileName, {
      'X-Unique-Upload-Id': uploadId,
      'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
    })
    if (r.status >= 300) {
      const err = new Error(failMessage(r)) as Error & { status?: number }
      err.status = r.status
      throw err
    }
    result = r.json
    start = end
  }
  return result
}

export async function uploadToCloudinary(
  signed: CloudSigned,
  file: Blob,
  fileName: string
): Promise<{ public_id?: string; secure_url?: string; bytes?: number }> {
  const base = `https://api.cloudinary.com/v1_1/${signed.cloudName}`

  if (file.size <= CHUNK_SIZE) {
    const first = await postUpload(base, 'auto/upload', signed, file, fileName)
    if (ok(first)) return first.json
    if (first.status === 400 || first.status === 415) {
      const raw = await postUpload(base, 'raw/upload', signed, file, fileName)
      if (ok(raw)) return raw.json
      throw new Error(failMessage(raw))
    }
    throw new Error(failMessage(first))
  }

  const resource = resourceType(file)
  const resources: string[] = resource === 'raw' ? ['raw'] : [resource, 'raw']
  let lastError: Error | null = null
  for (const r of resources) {
    try {
      const result = await chunkedUpload(base, r, signed, file, fileName)
      if (result?.public_id) return result
    } catch (e) {
      const err = e as Error & { status?: number }
      lastError = err
      if (err.status !== 400 && err.status !== 415) throw err
    }
  }
  throw lastError || new Error('No se pudo subir el archivo')
}