'use client'

import { useMemo } from 'react'
import { AppProvider, useApp, type View } from '@/lib/app-context'
import { formatBytes } from '@/lib/format'
import Library from '@/components/Library'
import ImportPanel from '@/components/ImportPanel'
import PlayerBar from '@/components/PlayerBar'
import PlayerOverlay from '@/components/PlayerOverlay'
import { DownloadIcon, MusicIcon, VideoIcon } from '@/components/icons'

function Shell() {
  const { view, setView, items, loading, playAt, removeItem } = useApp()
  const playerOpen = useApp().playerOpen

  const musicCount = useMemo(() => items.filter((i) => i.category === 'music').length, [items])
  const videosCount = useMemo(() => items.filter((i) => i.category === 'videos').length, [items])
  const totalSize = useMemo(() => items.reduce((acc, i) => acc + i.size, 0), [items])

  const handleRemove = (id: string) => {
    removeItem(id)
  }

  return (
    <div className="mx-auto flex h-full min-h-dvh max-w-3xl flex-col">
      <header className="pt-safe shrink-0 px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Media Car</h1>
          <span className="rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-400">
            {formatBytes(totalSize)}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {musicCount} {musicCount === 1 ? 'canción' : 'canciones'} · {videosCount}{' '}
          {videosCount === 1 ? 'video' : 'videos'}
        </p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 no-scrollbar">
        {loading ? (
          <div className="py-24 text-center text-slate-500">Cargando biblioteca…</div>
        ) : view === 'import' ? (
          <ImportPanel />
        ) : (
          <Library
            category={view}
            items={items}
            onPlay={playAt}
            onRemove={handleRemove}
          />
        )}
      </main>

      <nav className="pb-safe shrink-0 border-t border-slate-800/80 bg-slate-950/95">
        <div className="mx-auto flex max-w-3xl gap-2 p-3">
          <NavTab
            active={view === 'music'}
            onClick={() => setView('music')}
            icon={<MusicIcon className="h-7 w-7" />}
            label="Música"
            count={musicCount}
          />
          <NavTab
            active={view === 'videos'}
            onClick={() => setView('videos')}
            icon={<VideoIcon className="h-7 w-7" />}
            label="Videos"
            count={videosCount}
          />
          <NavTab
            active={view === 'import'}
            onClick={() => setView('import')}
            icon={<DownloadIcon className="h-7 w-7" />}
            label="Importar"
            count={null}
          />
        </div>
      </nav>

      <PlayerBar />
      {playerOpen && <PlayerOverlay />}
    </div>
  )
}

function NavTab({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number | null
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-20 flex-1 flex-col items-center justify-center gap-1 rounded-2xl font-semibold transition ${
        active ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-300 active:bg-slate-800'
      }`}
    >
      {icon}
      <span className="text-sm">
        {label}
        {count !== null && ` (${count})`}
      </span>
    </button>
  )
}

export default function Page() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}