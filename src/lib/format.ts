export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function titleFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    const lastSegment = url.pathname.split('/').filter(Boolean).pop()
    if (lastSegment) return decodeURIComponent(lastSegment)
    return url.hostname
  } catch {
    return 'descarga'
  }
}