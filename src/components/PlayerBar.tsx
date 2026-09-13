'use client'

import { useApp } from '@/lib/app-context'
import { MusicIcon } from './icons'

export default function PlayerBar() {
  const { queue, index, playerOpen, playAt } = useApp()
  const current = queue[index]

  if (playerOpen || !current) return null

  return (
    <button
      type="button"
      onClick={() => playAt(queue, index)}
      className="fixed inset-x-0 bottom-20 z-40 mx-3 flex items-center gap-4 rounded-2xl bg-sky-950/95 p-3 text-left shadow-lg ring-1 ring-sky-800/50"
      aria-label={`Reproduciendo ${current.title}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
        <MusicIcon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{current.title}</span>
        <span className="block text-sm text-sky-300">
          {current.category === 'music' ? 'Música' : 'Video'} · tocando ahora
        </span>
      </span>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  )
}