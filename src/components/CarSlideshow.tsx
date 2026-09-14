'use client'

import { useEffect, useRef, useState } from 'react'
import { getCarPhotos, setCarPhotos } from '@/lib/mediaStore'
import { CAR_PHOTOS } from '@/lib/carPhotos'

export default function CarSlideshow({ interval }: { interval: number }) {
  const [blobs, setBlobs] = useState<Blob[] | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cached = await getCarPhotos().catch(() => null)
      if (cancelled) return
      if (cached && cached.length) {
        setBlobs(cached)
        return
      }
      const fetched: Blob[] = []
      for (const src of CAR_PHOTOS) {
        try {
          const res = await fetch(src)
          if (!res.ok) continue
          fetched.push(await res.blob())
        } catch {
          // seguir con la siguiente
        }
      }
      if (cancelled) return
      if (fetched.length) {
        await setCarPhotos(fetched).catch(() => {})
        setBlobs(fetched)
      } else {
        setBlobs([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const list = blobs
    if (!list || !list.length) {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    const idx = ((index % list.length) + list.length) % list.length
    const obj = URL.createObjectURL(list[idx])
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return obj
    })
  }, [blobs, index])

  useEffect(() => {
    if (interval <= 0) return
    const timer = setInterval(() => setIndex((i) => i + 1), interval)
    return () => clearInterval(timer)
  }, [interval])

  const next = () => setIndex((i) => i + 1)

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
      {blobs !== null && blobs.length > 0 && url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt=""
          draggable={false}
          onError={next}
          className="h-full w-full object-cover"
          style={{ animation: 'mediaCarFade 1.2s ease' }}
        />
      )}
      <div className="absolute inset-0 bg-slate-950/55" />
    </div>
  )
}