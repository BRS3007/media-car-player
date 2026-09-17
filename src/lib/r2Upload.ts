export interface R2UploadResult {
  etag: string | null
}

export async function putToR2(token: string, key: string, blob: Blob): Promise<R2UploadResult> {
  const res = await fetch('/api/r2/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-token': token },
    body: JSON.stringify({ key }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || `No se pudo preparar la subida (${res.status})`)
  }
  const { url } = await res.json()
  if (typeof url !== 'string') throw new Error('Respuesta de subida inválida')

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  })
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '')
    throw new Error(`R2: error al subir (${putRes.status})${text ? ': ' + text.slice(0, 120) : ''}`)
  }
  return { etag: putRes.headers.get('etag') }
}