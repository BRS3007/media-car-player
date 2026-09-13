'use client'

import { useMemo } from 'react'
import type { MediaItem } from '@/lib/mediaStore'
import { formatBytes, formatDuration } from '@/lib/format'
import { MusicIcon, TrashIcon, VideoIcon } from './icons'

interface LibraryProps {
  category: 'music' | 'videos'
  items: MediaItem[]
  onPlay: (queue: MediaItem[], index: number) => void
  onRemove: (id: string) => void
}

export default function Library({ category, items, onPlay, onRemove }: LibraryProps) {
  const sorted = useMemo(
    () => items.filter((i) => i.category === category),
    [items, category]
  )

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center text-slate-400">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800 text-slate-500">
          {category === 'music' ? (
            <MusicIcon className="h-12 w-12" />
          ) : (
            <VideoIcon className="h-12 w-12" />
          )}
        </div>
        <p className="text-lg">No hay {category === 'music' ? 'música' : 'videos'} todavía</p>
        <p className="text-sm text-slate-500">
          Usa la pestaña <span className="font-semibold text-sky-400">Importar</span> para agregar
          archivos
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3 pb-6">
      {sorted.map((item, idx) => (
        <li key={item.id}>
          <div className="flex items-center gap-4 rounded-2xl bg-slate-900/80 p-3">
            <button
              type="button"
              onClick={() => onPlay(sorted, idx)}
              className="flex min-h-16 flex-1 items-center gap-4 text-left"
              aria-label={`Reproducir ${item.title}`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white ${
                  category === 'music' ? 'bg-sky-600' : 'bg-emerald-600'
                }`}
              >
                {category === 'music' ? (
                  <MusicIcon className="h-7 w-7" />
                ) : (
                  <VideoIcon className="h-7 w-7" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{item.title}</span>
                <span className="mt-1 flex gap-2 text-sm text-slate-400">
                  <span>{formatBytes(item.size)}</span>
                  <span>·</span>
                  <span>{item.duration ? formatDuration(item.duration) : '—'}</span>
                  <span>·</span>
                  <span className="text-slate-500">
                    {item.source === 'url' ? 'URL' : 'Archivo'}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="flex h-12 w-12 items-center justify-center rounded-xl text-slate-500 active:text-red-400"
              aria-label={`Eliminar ${item.title}`}
            >
              <TrashIcon className="h-6 w-6" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}