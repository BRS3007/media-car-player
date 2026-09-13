'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/app-context'
import { getMetaValue, setMetaValue } from '@/lib/mediaStore'
import {
  directDownloadUrl,
  searchPixabayVideos,
  type PixabaySearchResult,
  type PixabayVideoHit,
} from '@/lib/pixabay'
import { formatDuration } from '@/lib/format'
import { DownloadIcon, MusicIcon } from './icons'

const PIXABAY_KEY_META = 'pixabay_api_key'

function titleForHit(hit: PixabayVideoHit): string {
  const firstTag = hit.tags.split(',')[0]?.trim() || `pixabay-${hit.id}`
  return `${firstTag} (Pixabay)`
}

export default function PixabaySection() {
  const { importUrl } = useApp()

  const [apiKey, setApiKey] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PixabaySearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const downloadProgress = useRef<{ received: number; total: number } | null>(null)
  const [, forceUpdate] = useReducerState()

  useEffect(() => {
    let cancelled = false
    getMetaValue(PIXABAY_KEY_META).then((value) => {
      if (!cancelled && typeof value === 'string') setApiKey(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const saveKey = async () => {
    const key = apiKey.trim()
    if (!key) return
    setSavingKey(true)
    setError(null)
    try {
      await setMetaValue(PIXABAY_KEY_META, key)
    } catch {
      setError('No se pudo guardar la API key en este dispositivo.')
    } finally {
      setSavingKey(false)
    }
  }

  const search = async () => {
    const q = query.trim()
    const key = apiKey.trim()
    if (!q || !key || searching) return
    setSearching(true)
    setError(null)
    try {
      const data = await searchPixabayVideos(q, key)
      setResults(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo buscar en Pixabay.')
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  const download = useCallback(
    async (hit: PixabayVideoHit) => {
      const videoSize = hit.videos.large ?? hit.videos.medium
      if (!videoSize) {
        setError('Este video no tiene archivo descargable.')
        return
      }
      setDownloadingId(hit.id)
      downloadProgress.current = { received: 0, total: 0 }
      setError(null)
      try {
        const url = directDownloadUrl(videoSize)
        await importUrl(
          url,
          (received, total) => {
            downloadProgress.current = { received, total }
            forceUpdate()
          },
          titleForHit(hit)
        )
        downloadProgress.current = null
      } catch (e) {
        setError(
          e instanceof Error
            ? `No se pudo descargar «${titleForHit(hit)}». ${e.message}`
            : 'No se pudo descargar el video.'
        )
        downloadProgress.current = null
      } finally {
        setDownloadingId(null)
        forceUpdate()
      }
    },
    [importUrl, forceUpdate]
  )

  const progress = downloadProgress.current

  return (
    <section className="rounded-2xl bg-slate-900/80 p-5">
      <h2 className="text-lg font-bold">Buscar en Pixabay</h2>
      <p className="mt-1 text-sm text-slate-400">
        Busca videos libres y descárgalos directo a la carpeta de Videos. La música de Pixabay no
        tiene API: súbela con «Subir archivos».
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-sm font-medium text-slate-300" htmlFor="pixabay-key">
          API key de Pixabay (gratis, se guarda solo en este dispositivo)
        </label>
          <input
            id="pixabay-key"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Pega tu API key…"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full min-h-12 rounded-xl border border-slate-700 bg-slate-800 px-4 text-base text-slate-100 placeholder:text-slate-500"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={saveKey}
              disabled={savingKey || !apiKey.trim()}
              className="min-h-12 rounded-xl bg-slate-700 font-semibold text-white active:bg-slate-600 disabled:opacity-40"
            >
              {savingKey ? 'Guardando…' : apiKey.length > 6 ? 'Actualizar API key' : 'Guardar API key'}
            </button>
            <a
              href="https://pixabay.com/api/docs/"
              target="_blank"
              rel="noreferrer"
              className="text-center text-sm text-sky-400 underline decoration-sky-800 underline-offset-4"
            >
              Conseguir API key gratis
            </a>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search()
          }}
          placeholder="Ej: playa, coche, atardecer…"
          className="w-full min-h-14 rounded-xl border border-slate-700 bg-slate-800 px-4 text-base text-slate-100 placeholder:text-slate-500"
          inputMode="search"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching || !query.trim() || !apiKey.trim()}
          className="min-h-14 rounded-xl bg-emerald-600 font-bold text-white active:bg-emerald-500 disabled:opacity-40"
        >
          {searching ? 'Buscando…' : `Buscar en Pixabay${query.trim() ? `: ${query.trim()}` : ''}`}
        </button>
      </div>

      {progress && downloadingId !== null && (
        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            {progress.total > 0 ? (
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, (progress.received / progress.total) * 100)}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-pulse rounded-full bg-emerald-600" />
            )}
          </div>
          <p className="mt-2 text-center text-sm text-slate-400">
            Descargando video… sin cerrar la app hasta que termine.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-950/60 p-4 text-sm font-medium text-red-300">{error}</p>
      )}

      {results && (
        <div className="mt-5">
          <p className="mb-3 text-sm text-slate-400">
            {results.total > 0 ? `${results.total} videos para «${query.trim()}»` : 'Sin resultados'}
          </p>
          <ul className="grid grid-cols-2 gap-3">
            {results.hits.map((hit) => (
              <li key={hit.id} className="overflow-hidden rounded-2xl bg-slate-950">
                <div className="relative aspect-video w-full bg-slate-800">
                  {hit.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hit.image}
                      alt={hit.tags}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <MusicIcon className="h-8 w-8" />
                    </div>
                  )}
                  {hit.duration > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                      {formatDuration(hit.duration)}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-200">
                    {hit.tags || `Pixabay ${hit.id}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => download(hit)}
                    disabled={downloadingId !== null}
                    className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white active:bg-emerald-500 disabled:opacity-40"
                  >
                    {downloadingId === hit.id ? (
                      'Descargando…'
                    ) : (
                      <>
                        <DownloadIcon className="h-5 w-5" />
                        Descargar
                      </>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function useReducerState(): [null, () => void] {
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick((t) => t + 1), [])
  return [null, forceUpdate]
}