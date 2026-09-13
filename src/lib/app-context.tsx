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
  clearUserMedia,
  createUser,
  deleteUser,
  getAllMedia,
  getCurrentUserMeta,
  getUserById,
  getUsers,
  initializeDB,
  removeMedia,
  setCurrentUserMeta,
  verifyPin,
  type MediaItem,
  type User,
} from './mediaStore'
import { titleFromUrl } from './format'

export type View = 'music' | 'videos' | 'import'

interface AppState {
  items: MediaItem[]
  loading: boolean
  users: User[]
  currentUser: User | null
  currentUserId: string | null
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
  importUrl: (
    url: string,
    onProgress?: (received: number, total: number) => void,
    title?: string
  ) => Promise<number>
  wipeAll: () => Promise<void>
  selectUser: (userId: string, pin?: string) => Promise<boolean>
  addUser: (name: string, pin?: string) => Promise<string | null>
  removeUser: (userId: string) => Promise<void>
  logoutUser: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [view, setViewState] = useState<View>('music')
  const [queue, setQueue] = useState<MediaItem[]>([])
  const [index, setIndex] = useState(0)
  const [playerOpen, setPlayerOpen] = useState(false)

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? null,
    [users, currentUserId]
  )

  const stopPlayback = useCallback(() => {
    setQueue([])
    setIndex(0)
    setPlayerOpen(false)
  }, [])

  const refreshItems = useCallback(async () => {
    const userId = currentUserId
    if (!userId) {
      setItems([])
      return
    }
    const all = await getAllMedia(userId)
    setItems(all)
  }, [currentUserId])

  const reloadUsers = useCallback(async () => {
    setUsers(await getUsers())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await initializeDB()
      } catch {
        // IndexedDB no disponible
      }
      if (cancelled) return
      await reloadUsers()
      const savedUserId = await getCurrentUserMeta()
      if (savedUserId) {
        const user = await getUserById(savedUserId)
        if (user) setCurrentUserId(user.id)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [reloadUsers])

  useEffect(() => {
    if (currentUserId) {
      getAllMedia(currentUserId)
        .then(setItems)
        .catch(() => setItems([]))
    } else {
      setItems([])
    }
  }, [currentUserId])

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
      if (!currentUserId) throw new Error('Primero elige un usuario')
      let added = 0
      for (const file of files) {
        await addMedia({ userId: currentUserId, title: file.name, blob: file, mime: file.type, source: 'upload' })
        added += 1
      }
      await refreshItems()
      return added
    },
    [currentUserId, refreshItems]
  )

  const importUrl = useCallback(
    async (
      url: string,
      onProgress?: (received: number, total: number) => void,
      customTitle?: string
    ): Promise<number> => {
      if (!currentUserId) throw new Error('Primero elige un usuario')
      const res = await fetch(`/api/download?url=${encodeURIComponent(url)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Error al descargar')
      }
      const mime = res.headers.get('content-type') || 'application/octet-stream'
      const disposition = res.headers.get('content-disposition') || ''
      const filename = filenameFromDisposition(disposition)
      const title = (customTitle?.trim() || filename || titleFromUrl(url)).trim()

      if (!title) throw new Error('No se pudo determinar el título del archivo')

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
      await addMedia({ userId: currentUserId, title, blob, mime, source: 'url' })
      await refreshItems()
      return 1
    },
    [currentUserId, refreshItems]
  )

  const wipeAll = useCallback(async () => {
    if (!currentUserId) return
    await clearUserMedia(currentUserId)
    setItems([])
    stopPlayback()
  }, [currentUserId, stopPlayback])

  const selectUser = useCallback(
    async (userId: string, pin?: string): Promise<boolean> => {
      const user = await getUserById(userId)
      if (!user) return false
      if (!verifyPin(pin || '', user.pinHash)) return false
      await setCurrentUserMeta(user.id)
      setCurrentUserId(user.id)
      setViewState('music')
      stopPlayback()
      return true
    },
    [stopPlayback]
  )

  const addUser = useCallback(
    async (name: string, pin?: string): Promise<string | null> => {
      const trimmed = name.trim()
      if (!trimmed) return 'Escribe tu nombre'
      const pinValue = pin?.trim() || ''
      if (pinValue && !/^\d{4,6}$/.test(pinValue)) return 'El PIN debe tener de 4 a 6 números'
      const user = await createUser(trimmed, pinValue || undefined)
      await selectUser(user.id)
      return null
    },
    [selectUser]
  )

  const removeUser = useCallback(
    async (userId: string) => {
      await deleteUser(userId)
      await reloadUsers()
      if (currentUserId === userId) {
        setCurrentUserId(null)
        stopPlayback()
      }
    },
    [currentUserId, reloadUsers, stopPlayback]
  )

  const logoutUser = useCallback(async () => {
    await setCurrentUserMeta(null)
    setCurrentUserId(null)
    setViewState('music')
    stopPlayback()
  }, [stopPlayback])

  const value = useMemo<AppState>(
    () => ({
      items,
      loading,
      users,
      currentUser,
      currentUserId,
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
      selectUser,
      addUser,
      removeUser,
      logoutUser,
    }),
    [
      items,
      loading,
      users,
      currentUser,
      currentUserId,
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
      selectUser,
      addUser,
      removeUser,
      logoutUser,
    ]
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