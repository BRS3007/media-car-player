'use client'

import { useRef, useState } from 'react'
import { useApp } from '@/lib/app-context'
import { DownloadIcon } from './icons'

export default function ImportPanel() {
  const { importFiles, importUrl, wipeAll } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setMessage(null)
    try {
      const count = await importFiles(Array.from(files))
      setMessage(`${count} archivo${count === 1 ? '' : 's'} importado${count === 1 ? '' : 's'}. Se separaron automáticamente en Música o Videos.`)
    } catch {
      setMessage('Ocurrió un error al importar los archivos.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDownload() {
    const trimmed = url.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setMessage(null)
    setProgress({ received: 0, total: 0 })
    try {
      const count = await importUrl(trimmed, (received, total) =>
        setProgress({ received, total })
      )
      setMessage(`${count > 0 ? 'Descarga completada y guardada' : 'No se pudo guardar'}. Se clasificó en su carpeta automáticamente.`)
      setUrl('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo descargar.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  async function handleWipe() {
    setMessage(null)
    try {
      await wipeAll()
      setMessage('Se eliminó todo el contenido.')
    } catch {
      setMessage('No se pudo vaciar la biblioteca.')
    }
  }

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.received / progress.total) * 100))
      : progress && progress.received > 0
        ? null
        : null

  return (
    <div className="space-y-8 pb-6">
      <section className="rounded-2xl bg-slate-900/80 p-5">
        <h2 className="text-lg font-bold">Subir archivos</h2>
        <p className="mt-1 text-sm text-slate-400">
          Selecciona música o videos desde el iPad. Se detectará el tipo y se guardarán en su
          carpeta automáticamente.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          multiple
          className="hidden"
          id="file-upload"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className="mt-4 flex min-h-20 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/50 text-sky-400 active:border-sky-500"
        >
          <span className="p-4 text-center text-base font-semibold">
            {uploading ? 'Importando…' : 'Toca para seleccionar archivos'}
          </span>
        </label>
      </section>

      <section className="rounded-2xl bg-slate-900/80 p-5">
        <h2 className="text-lg font-bold">Descargar por URL</h2>
        <p className="mt-1 text-sm text-slate-400">
          Pega un enlace directo a un archivo de audio o video y se descargará y clasificará solo.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDownload()
            }}
            placeholder="https://ejemplo.com/cancion.mp3"
            className="w-full min-h-14 rounded-xl border border-slate-700 bg-slate-800 px-4 text-base text-slate-100 placeholder:text-slate-500"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy || !url.trim()}
            className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-sky-600 font-bold text-white active:bg-sky-500 disabled:opacity-40"
          >
            <DownloadIcon className="h-6 w-6" />
            {busy ? 'Descargando…' : 'Descargar'}
          </button>
          {busy && (
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              {percent !== null && percent > 0 ? (
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${percent}%` }}
                />
              ) : (
                <div className="h-full w-1/3 animate-pulse rounded-full bg-sky-600" />
              )}
            </div>
          )}
        </div>
      </section>

      {message && (
        <p
          className={`rounded-xl p-4 text-sm font-medium ${
            message.startsWith('No') || message.startsWith('Ocurrió')
              ? 'bg-red-950/60 text-red-300'
              : 'bg-sky-950/60 text-sky-300'
          }`}
        >
          {message}
        </p>
      )}

      <section className="rounded-2xl bg-slate-900/80 p-5">
        <h2 className="text-base font-bold text-slate-300">Zona de mantenimiento</h2>
        <button
          type="button"
          onClick={handleWipe}
          className="mt-3 min-h-12 rounded-xl border border-red-900/60 bg-red-950/40 px-4 text-sm font-semibold text-red-300 active:bg-red-900/40"
        >
          Vaciar toda la biblioteca
        </button>
      </section>
    </div>
  )
}