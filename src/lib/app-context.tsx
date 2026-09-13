'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  addMedia,
  getAllMedia,
  initializeDB,
  removeMedia,
  clearAll,
  type MediaItem,
} from './mediaStore'
import { titleFromUrl } from './format'

export type View = 'music' | 'videos' | 'import'

interface AppState {
  items: MediaItem[]
  loading: boolean
  view: View
  queue: MediaItem[]
  index: number
  playerOpen: boolean
  setView: (view: View) => void
  playAt: (queue: MediaItem[], index: number) => void
  closePlayer: () => void
  next: () => void
  prev: () => void
  removeItem: (id: string) => Promise<void>
  refreshItems: () => Promise<void>
  importFiles: (files: File[]) => Promise<number>
  importUrl: (url: string, onProgress?: (received: number, total: number) => void) => Promise<number>
  wipeAll: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setViewState] = useState<View>('music')
  const [queue, setQueue] = useState<MediaItem[]>([])
  const [index, setIndex] = useState(0)
  const [playerOpen, setPlayerOpen] = useState(false)

  const refreshItems = useCallback(async () => {
    const all = await getAllMedia()
    setItems(all)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await initializeDB()
      } catch {
        // IndexedDB no disponible
      }
      if (!cancelled) {
        const all = await getAllMedia()
        setItems(all)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setView = useCallback((v: View) => {
    setViewState(v)
  }, [])

  const playAt = useCallback((nextQueue: MediaItem[], nextIndex: number) => {
    setQueue(nextQueue)
    setIndex(nextIndex)
    setPlayerOpen(true)
  }, [])

  const closePlayer = useCallback(() => {
    setPlayerOpen(false)
  }, [])

  const next = useCallback(() => {
    setQueue((q) => {
      setIndex((i) => (q.length === 0 ? 0 : (i + 1) % q.length))
      return q
    })
  }, [])

  const prev = useCallback(() => {
    setQueue((q) => {
      setIndex((i) => (q.length === 0 ? 0 : (i - 1 + q.length) % q.length))
      return q
    })
  }, [])

  const removeItem = useCallback(
    async (id: string) => {
      await removeMedia(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setQueue((q) => q.filter((item) => item.id !== id))
    },
    []
  )

  const importFiles = useCallback(
    async (files: File[]): Promise<number> => {
      let added = 0
      for (const file of files) {
        await addMedia({ title: file.name, blob: file, mime: file.type, source: 'upload' })
        added += 1
      }
      await refreshItems()
      return added
    },
    [refreshItems]
  )

  const importUrl = useCallback(
    async (
      url: string,
      onProgress?: (received: number, total: number) => void
    ): Promise<number> => {
      const res = await fetch(`/api/download?url=${encodeURIComponent(url)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Error al descargar')
      }
      const mime = res.headers.get('content-type') || 'application/octet-stream'
      const disposition = res.headers.get('content-disposition') || ''
      const filename = filenameFromDisposition(disposition)
      const title = filename || titleFromUrl(url)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Sin datos')

      const chunks: BlobPart[] = []
      let received = 0
      const total = Number(res.headers.get('content-length')) || 0

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.byteLength
        onProgress?.(received, total)
      }

      const blob = new Blob(chunks as BlobPart[], { type: mime })
      await addMedia({ title, blob, mime, source: 'url' })
      await refreshItems()
      return 1
    },
    [refreshItems]
  )

  const wipeAll = useCallback(async () => {
    await clearAll()
    setItems([])
    setQueue([])
    setPlayerOpen(false)
  }, [])

  const value = useMemo<AppState>(
    () => ({
      items,
      loading,
      view,
      queue,
      index,
      playerOpen,
      setView,
      playAt,
      closePlayer,
      next,
      prev,
      removeItem,
      refreshItems,
      importFiles,
      importUrl,
      wipeAll,
    }),
    [items, loading, view, queue, index, playerOpen, setView, playAt, closePlayer, next, prev, removeItem, refreshItems, importFiles, importUrl, wipeAll]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

function filenameFromDisposition(disposition: string): string {
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch) return decodeURIComponent(utfMatch[1].replace(/["']/g, ''))
  const plainMatch = disposition.match(/filename="?([^";\n]+)"?/i)
  if (plainMatch) return plainMatch[1].trim()
  return ''
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}