'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/app-context'
import { getBlob, updateDuration } from '@/lib/mediaStore'
import { formatDuration } from '@/lib/format'
import { unlockAudio } from '@/lib/audio'
import AudioVisualizer from './AudioVisualizer'
import { BackIcon } from './icons'
import CarSlideshow from './CarSlideshow'

interface WakeLockSentinel {
  release: () => Promise<void>
}

export default function PlayerOverlay() {
  const { queue, index, closePlayer, next, prev } = useApp()
  const current = queue[index]

  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const [mediaEl, setMediaEl] = useState<HTMLMediaElement | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const durationSavedRef = useRef(false)
  const hideTimerRef = useRef<number | null>(null)

  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const carouselMs = 30000

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

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const bumpControls = useCallback(() => {
    setControlsVisible(true)
  }, [])

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (playing && controlsVisible) {
      hideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false)
      }, 3500)
    }
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [playing, controlsVisible])

  const onTap = () => {
    bumpControls()
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  if (!current) return null

  const togglePlay = () => {
    unlockAudio()
    setPlaying((p) => !p)
  }

  const seek = (value: number) => {
    const media = mediaRef.current
    setTime(value)
    if (media) media.currentTime = value
  }

  const onPrev = () => {
    unlockAudio()
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
    <div className="fixed inset-0 z-50 select-none overflow-hidden bg-black" onPointerDown={onTap}>
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            key={current.id}
            ref={(el) => {
              mediaRef.current = el
            }}
            src={url ?? undefined}
            className="h-full w-full object-contain bg-black"
            playsInline
            preload="auto"
          />
        ) : (
          <>
            <CarSlideshow interval={carouselMs} />
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-full bg-slate-950/70 px-5 py-3">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-200">Pausa</span>
                </div>
              </div>
            )}
            <audio
              key={current.id}
              ref={(el) => {
                mediaRef.current = el
                setMediaEl(el)
              }}
              src={url ?? undefined}
              preload="auto"
            />
          </>
        )}
      </div>

      {!isVideo && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 flex h-16 items-end justify-center px-8 pb-2">
          <AudioVisualizer media={mediaEl} playing={playing} bars={28} />
        </div>
      )}

      <div className="absolute inset-x-0 top-0">
        <div
          className="pt-safe flex items-center gap-3 p-3"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0))' }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              closePlayer()
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur active:bg-white/20"
            aria-label="Cerrar reproductor"
          >
            <BackIcon className="h-6 w-6" />
          </button>
          <span className="min-w-0 flex-1 truncate px-2 text-lg font-semibold text-white drop-shadow">{current.title}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleFullscreen()
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur active:bg-white/20"
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          className="px-6 pb-6 pt-10"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))' }}
        >
          <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
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

          <div className="mt-4 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPrev()
              }}
              className="flex h-16 w-16 items-center justify-center text-slate-300 active:text-white"
              aria-label="Anterior"
            >
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
                <path d="M6 6h2v12H6zM20 6l-8.5 6L20 18V6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                togglePlay()
              }}
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
              onClick={(e) => {
                e.stopPropagation()
                unlockAudio()
                next()
              }}
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
    </div>
  )
}