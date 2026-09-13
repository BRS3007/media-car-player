'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/app-context'
import { getBlob, updateDuration } from '@/lib/mediaStore'
import { formatDuration } from '@/lib/format'
import { BackIcon, MusicIcon, VideoIcon } from './icons'

interface WakeLockSentinel {
  release: () => Promise<void>
}

export default function PlayerOverlay() {
  const { queue, index, closePlayer, next, prev } = useApp()
  const current = queue[index]

  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const durationSavedRef = useRef(false)

  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!current) {
      setUrl(null)
      return
    }
    let objectUrl: string | null = null
    let cancelled = false
    durationSavedRef.current = false
    setTime(0)
    setDuration(0)
    setPlaying(false)
    getBlob(current.id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => setUrl(null))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const media = mediaRef.current
    if (!media || !url) return

    const onLoadedMetadata = () => {
      if (isFinite(media.duration) && media.duration > 0) {
        setDuration(media.duration)
        if (!durationSavedRef.current && current) {
          durationSavedRef.current = true
          updateDuration(current.id, media.duration).catch(() => {})
        }
      }
      media.play().catch(() => setPlaying(false))
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => setTime(media.currentTime)
    const onEnded = () => {
      if (index >= queue.length - 1) closePlayer()
      else next()
    }
    const onError = () => setPlaying(false)

    media.addEventListener('loadedmetadata', onLoadedMetadata)
    media.addEventListener('play', onPlay)
    media.addEventListener('pause', onPause)
    media.addEventListener('timeupdate', onTimeUpdate)
    media.addEventListener('ended', onEnded)
    media.addEventListener('error', onError)

    return () => {
      media.removeEventListener('loadedmetadata', onLoadedMetadata)
      media.removeEventListener('play', onPlay)
      media.removeEventListener('pause', onPause)
      media.removeEventListener('timeupdate', onTimeUpdate)
      media.removeEventListener('ended', onEnded)
      media.removeEventListener('error', onError)
    }
  }, [url, current, index, queue.length, next, prev, closePlayer])

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    if (playing) media.play().catch(() => {})
    else media.pause()
  }, [playing])

  useEffect(() => {
    const w = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<WakeLockSentinel> } }
    w.wakeLock?.request('screen').then((lock) => { wakeLockRef.current = lock }).catch(() => {})
    return () => {
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  if (!current) return null

  const togglePlay = () => setPlaying((p) => !p)

  const seek = (value: number) => {
    const media = mediaRef.current
    setTime(value)
    if (media) media.currentTime = value
  }

  const onPrev = () => {
    const media = mediaRef.current
    if (media && media.currentTime > 3) {
      media.currentTime = 0
      setTime(0)
    } else {
      prev()
    }
  }

  const isVideo = current.type === 'video'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="pt-safe flex shrink-0 items-center gap-3 p-3">
        <button
          type="button"
          onClick={closePlayer}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white active:bg-slate-700"
          aria-label="Cerrar reproductor"
        >
          <BackIcon className="h-8 w-8" />
        </button>
        <span className="min-w-0 flex-1 truncate px-2 text-lg font-semibold">{current.title}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isVideo ? (
          <video
            key={current.id}
            ref={(el) => {
              mediaRef.current = el
            }}
            src={url ?? undefined}
            className="h-full w-full object-contain bg-black"
            controls={false}
            playsInline
            preload="auto"
          />
        ) : (
          <>
            <div className="flex h-full items-center justify-center">
              <div className="flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-br from-sky-900 to-slate-900 ring-8 ring-slate-800">
                <MusicIcon className="h-36 w-36 text-sky-400" />
              </div>
            </div>
            <audio
              key={current.id}
              ref={(el) => {
                mediaRef.current = el
              }}
              src={url ?? undefined}
              preload="auto"
            />
          </>
        )}
      </div>

      <div className="shrink-0 px-6 pb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
          <span>{formatDuration(time)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.5}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full"
          aria-label="Progreso"
        />

        <div className="mt-5 flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={onPrev}
            className="flex h-16 w-16 items-center justify-center text-slate-300 active:text-white"
            aria-label="Anterior"
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
              <path d="M6 6h2v12H6zM20 6l-8.5 6L20 18V6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-900/50 active:bg-sky-500"
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-11 w-11" fill="currentColor">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-11 w-11" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={next}
            className="flex h-16 w-16 items-center justify-center text-slate-300 active:text-white"
            aria-label="Siguiente"
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
              <path d="M16 6h2v12h-2zM4 6l8.5 6L4 18V6z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}