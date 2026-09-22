'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addMedia,
  clearUserMedia,
  clearTombstone,
  createUser,
  deleteUser,
  getAllMedia,
  getBlob,
  getCloudToken,
  getCurrentUserMeta,
  getTombstones,
  getUserById,
  getUsers,
  initializeDB,
  removeMedia,
  setCloudToken,
  setCurrentUserMeta,
  setMediaCloudMeta,
  verifyPin,
  type CloudMeta,
  type MediaItem,
  type User,
} from './mediaStore'
import { titleFromUrl } from './format'
import { putToR2 } from './r2Upload'

export type View = 'music' | 'videos' | 'import'

export interface SyncStatus {
  phase: 'upload' | 'push' | 'pull' | 'done'
  current: number
  total: number
  label: string
}

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
  cloudActive: boolean
  syncing: boolean
  cloudError: string | null
  lastSync: number | null
  syncStatus: SyncStatus | null
  activateCloud: (pin: string) => Promise<string | null>
  syncNow: (userIdArg?: string) => Promise<string | null>
  deactivateCloud: () => Promise<void>
  connectCloud: (name: string, pin: string) => Promise<string | null>
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
  const [cloudActive, setCloudActive] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [cloudError, setCloudError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const syncingRef = useRef(false)

  useEffect(() => {
    syncingRef.current = syncing
  }, [syncing])

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

  useEffect(() => {
    if (!currentUserId) {
      setCloudActive(false)
      return
    }
    getCloudToken(currentUserId)
      .then((t) => setCloudActive(!!t))
      .catch(() => setCloudActive(false))
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
      await reloadUsers()
      await selectUser(user.id)
      return null
    },
    [reloadUsers, selectUser]
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

  // ---- Nube ----

  const setTokenAndState = useCallback(async (userId: string, token: string | null) => {
    await setCloudToken(userId, token)
    setCloudActive(!!token)
  }, [])

  const activateCloud = useCallback(
    async (pin: string): Promise<string | null> => {
      const user = currentUser
      if (!user) return 'Primero elige un usuario'
      const name = user.name.trim()
      const pinValue = pin.trim()
      if (!name || !/^\d{4,6}$/.test(pinValue)) return 'El PIN debe tener de 4 a 6 dígitos'
      if (cloudActive) return null

      const send = (path: string) =>
        fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, pin: pinValue }),
        })
      let res = await send('/api/auth/register')
      if (res.status === 409) res = await send('/api/auth/login')
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        return data?.error || (res.status === 401 ? 'Nombre o PIN incorrecto' : 'Error al conectar con la nube')
      }
      const data = await res.json()
      await setTokenAndState(user.id, data.token)
      setCloudError(null)
      return null
    },
    [currentUser, cloudActive, setTokenAndState]
  )

  const deactivateCloud = useCallback(async () => {
    if (!currentUserId) return
    const token = await getCloudToken(currentUserId)
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => {})
    }
    await setTokenAndState(currentUserId, null)
  }, [currentUserId, setTokenAndState])

  useEffect(() => {
    if (!currentUserId || !cloudActive) return
    let disposed = false
    let running = false

    const run = async () => {
      if (disposed || running || syncingRef.current) return
      running = true
      try {
        const token = await getCloudToken(currentUserId)
        if (!token) return
        const pulled = await pullRemoteItems(
          currentUserId,
          token,
          () => {
            if (!disposed) getAllMedia(currentUserId).then(setItems).catch(() => {})
          }
        )
        if (pulled > 0) setItems(await getAllMedia(currentUserId))
        setLastSync(Date.now())
      } catch {
        // silencioso: sin internet aún, se reintenta en el siguiente tick
      } finally {
        running = false
      }
    }

    run()
    const interval = window.setInterval(run, 30000)
    const onFocus = () => run()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [currentUserId, cloudActive])

  const syncNow = useCallback(async (userIdArg?: string): Promise<string | null> => {
    const userId = userIdArg ?? currentUserId
    if (!userId) return 'Primero elige un usuario'
    const token = await getCloudToken(userId)
    if (!token) return 'Primero activa la sincronización en la nube'
    if (syncing) return null

    setSyncing(true)
    setCloudError(null)
    try {
      const local = await getAllMedia(userId)
      const toUpload = local.filter((it) => !it.cloud || it.cloud.syncedAt < it.updatedAt)
      let uploaded = 0
      const uploadErrors: string[] = []
      setSyncStatus({ phase: 'upload', current: 0, total: toUpload.length, label: 'Preparando subida…' })
      for (const item of toUpload) {
        try {
          const blob = await getBlob(item.id)
          await putToR2(token, item.id, blob)
          const meta: CloudMeta = {
            publicId: item.id,
            url: `/api/r2/get?key=${encodeURIComponent(item.id)}`,
            sizeBytes: blob.size,
            syncedAt: Date.now(),
          }
          await setMediaCloudMeta(item.id, meta)
          uploaded++
          setSyncStatus({
            phase: 'upload',
            current: uploaded,
            total: toUpload.length,
            label: `Subiendo ${(item.title || 'archivo').slice(0, 40)}`,
          })
        } catch (e) {
          uploadErrors.push(`${item.title || 'Archivo'}: ${e instanceof Error ? e.message : 'error'}`)
        }
      }
      if (uploadErrors.length) {
        throw new Error('No se subieron ' + uploadErrors.length + ' archivo(s): ' + uploadErrors[0])
      }

      setSyncStatus({ phase: 'push', current: 1, total: 1, label: 'Guardando metadatos en la nube…' })
      const fresh = await getAllMedia(userId)
      const withCloud = fresh.filter((it) => it.cloud)
      if (withCloud.length) {
        const pushRes = await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-token': token },
          body: JSON.stringify({
            items: withCloud.map((it) => ({
              mediaId: it.id,
              title: it.title,
              type: it.type,
              duration: it.duration ?? null,
              cloudinaryPublicId: it.cloud!.publicId,
              cloudinaryUrl: it.cloud!.url,
              sizeBytes: it.cloud!.sizeBytes,
              updatedAt: it.updatedAt,
            })),
          }),
        })
        if (!pushRes.ok) {
          return (await pushRes.json().catch(() => null))?.error || 'Error al guardar en la nube'
        }
      }

      const tombstones = await getTombstones()
      for (const mediaId of tombstones) {
        await fetch('/api/sync/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-token': token },
          body: JSON.stringify({ mediaId }),
        }).catch(() => {})
        await clearTombstone(mediaId)
      }

      setSyncStatus({ phase: 'pull', current: 0, total: 0, label: 'Trayendo novedades de la nube…' })
      await pullRemoteItems(userId, token, (cur, total) =>
        setSyncStatus({ phase: 'pull', current: cur, total, label: 'Descargando novedades…' })
      )

      await refreshItems()
      setLastSync(Date.now())
      setSyncStatus({ phase: 'done', current: 1, total: 1, label: '¡Sincronizado!' })
      return null
    } catch (e) {
      setSyncStatus(null)
      return e instanceof Error ? e.message : 'Error de sincronización'
    } finally {
      setSyncing(false)
    }
  }, [currentUserId, syncing, refreshItems])

  const connectCloud = useCallback(
    async (name: string, pin: string): Promise<string | null> => {
      const trimmed = name.trim()
      const pinValue = pin.trim()
      if (!trimmed || !/^\d{4,6}$/.test(pinValue)) {
        return 'Escribe tu nombre y un PIN de 4 a 6 dígitos'
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, pin: pinValue }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        if (res.status === 401) {
          return 'No encontré ese usuario en la nube. Créalo en el PC con ese nombre y PIN, activa la nube y sincroniza.'
        }
        return (data as { error?: string } | null)?.error || 'Error al conectar con la nube'
      }
      const data = await res.json()
      const existing = users.find((u) => u.name.toLowerCase() === trimmed.toLowerCase())
      let localId: string
      if (existing) {
        localId = existing.id
      } else {
        const user = await createUser(trimmed, pinValue)
        await reloadUsers()
        localId = user.id
      }
      await setTokenAndState(localId, data.token)
      await selectUser(localId)
      return syncNow(localId)
    },
    [users, reloadUsers, selectUser, syncNow, setTokenAndState]
  )

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
      cloudActive,
      syncing,
      cloudError,
      lastSync,
      syncStatus,
      activateCloud,
      syncNow,
      deactivateCloud,
      connectCloud,
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
      cloudActive,
      syncing,
      cloudError,
      lastSync,
      syncStatus,
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
      activateCloud,
      syncNow,
      deactivateCloud,
      connectCloud,
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

interface CloudItem {
  mediaId: string
  title: string
  type: 'audio' | 'video'
  duration: number | null
  publicId: string
  cloudinaryUrl: string
  sizeBytes: number | null
  updatedAt: number
}

async function fetchCloudBlob(url: string, token: string): Promise<Blob | null> {
  const r2 = url.startsWith('/api/r2/get')
  const withTimeout = (ms: number) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    return { signal: controller.signal, done: () => clearTimeout(timer) }
  }
  const attempt = async (
    target: string,
    headers?: Record<string, string>,
    ms = 60000
  ): Promise<Blob | null> => {
    let c: ReturnType<typeof withTimeout> | null = null
    try {
      c = withTimeout(ms)
      const res = await fetch(target, { headers, signal: c.signal })
      if (!res.ok) return null
      return await res.blob()
    } catch {
      return null
    } finally {
      c?.done()
    }
  }
  try {
    if (r2) return await attempt(url, { 'x-session-token': token })
    const direct = await attempt(url)
    if (direct) return direct
    return await attempt(`/api/download?url=${encodeURIComponent(url)}`, undefined, 60000)
  } catch {
    return null
  }
}

async function pullRemoteItems(
  userId: string,
  token: string,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const local = await getAllMedia(userId)
  const res = await fetch('/api/sync/pull', { headers: { 'x-session-token': token } })
  if (!res.ok) throw new Error('Error al traer la biblioteca de la nube')
  const data = await res.json()
  const items: CloudItem[] = Array.isArray(data.items) ? data.items : []
  let pulled = 0
  const CONCURRENCY = 4
  let next = 0
  const work = async () => {
    while (true) {
      const c = items[next++]
      if (!c) return
      const exists = local.find((it) => it.id === c.mediaId)
      if (exists && exists.updatedAt >= c.updatedAt) continue
      const blob = await fetchCloudBlob(c.cloudinaryUrl, token)
      if (!blob) continue
      await addMedia(
        { userId, title: c.title || c.mediaId, blob, mime: blob.type, source: 'sync' },
        {
          id: c.mediaId,
          type: c.type,
          updatedAt: c.updatedAt,
          cloud: {
            publicId: c.publicId,
            url: c.cloudinaryUrl,
            sizeBytes: c.sizeBytes ?? blob.size,
            syncedAt: c.updatedAt,
          },
        }
      )
      pulled++
      if (onProgress) onProgress(pulled, items.length)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => work()))
  return pulled
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}