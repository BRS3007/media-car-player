'use client'

import { useMemo, useState } from 'react'
import { AppProvider, useApp, type View } from '@/lib/app-context'
import { formatBytes } from '@/lib/format'
import Library from '@/components/Library'
import ImportPanel from '@/components/ImportPanel'
import PlayerBar from '@/components/PlayerBar'
import PlayerOverlay from '@/components/PlayerOverlay'
import HelpModal from '@/components/HelpModal'
import UserScreen from '@/components/UserScreen'
import { DownloadIcon, HelpIcon, MusicIcon, VideoIcon } from '@/components/icons'

function Shell() {
  const { view, setView, items, loading, playAt, removeItem, currentUser, logoutUser } = useApp()
  const playerOpen = useApp().playerOpen
  const [helpOpen, setHelpOpen] = useState(false)

  const musicCount = useMemo(() => items.filter((i) => i.category === 'music').length, [items])
  const videosCount = useMemo(() => items.filter((i) => i.category === 'videos').length, [items])
  const totalSize = useMemo(() => items.reduce((acc, i) => acc + i.size, 0), [items])

  if (!currentUser) return <UserScreen />

  const handleRemove = (id: string) => {
    removeItem(id)
  }

  return (
    <div className="mx-auto flex h-full min-h-dvh max-w-3xl flex-col">
      <header className="pt-safe shrink-0 px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Media Car</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 active:bg-slate-700"
              aria-label="Ayuda"
            >
              <HelpIcon className="h-6 w-6" />
            </button>
            <span className="rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-400">
              {formatBytes(totalSize)}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="min-w-0 text-sm text-slate-500">
            {musicCount} {musicCount === 1 ? 'canción' : 'canciones'} · {videosCount}{' '}
            {videosCount === 1 ? 'video' : 'videos'}
          </p>
          <button
            type="button"
            onClick={() => logoutUser()}
            className="flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 active:bg-slate-800"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
            {currentUser.name} · cambiar
          </button>
        </div>
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