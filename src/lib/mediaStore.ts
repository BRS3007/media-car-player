import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type MediaType = 'audio' | 'video'
export type Category = 'music' | 'videos'
export type Source = 'upload' | 'url'

export interface MediaItem {
  id: string
  userId: string
  title: string
  type: MediaType
  category: Category
  mime: string
  size: number
  duration?: number
  source: Source
  createdAt: number
}

export interface User {
  id: string
  name: string
  pinHash?: string
  createdAt: number
}

type StoredMedia = MediaItem & { blob: Blob }

interface CarPlayerDB extends DBSchema {
  media: {
    key: string
    value: StoredMedia
    indexes: {
      'by-category': Category
      'by-type': MediaType
      'by-created': number
      'by-user': string
    }
  }
  users: {
    key: string
    value: User
  }
  meta: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'media-car-player'
const DB_VERSION = 2

const CURRENT_USER_KEY = 'current_user'

let dbPromise: Promise<IDBPDatabase<CarPlayerDB>> | null = null

function getDB(): Promise<IDBPDatabase<CarPlayerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CarPlayerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('media')) {
          const store = db.createObjectStore('media', { keyPath: 'id' })
          store.createIndex('by-category', 'category')
          store.createIndex('by-type', 'type')
          store.createIndex('by-created', 'createdAt')
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }
        const mediaStore = transaction.objectStore('media')
        if (!mediaStore.indexNames.contains('by-user')) {
          mediaStore.createIndex('by-user', 'userId')
        }
      },
    })
  }
  return dbPromise
}

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'm4a',
  'aac',
  'flac',
  'wav',
  'ogg',
  'oga',
  'opus',
  'wma',
  'weba',
])

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'mkv',
  'avi',
  'webm',
  'm4v',
  'mpg',
  'mpeg',
  'wmv',
  'ts',
  '3gp',
  '3g2',
  'ogv',
])

export function detectType(title: string, mime?: string): MediaType {
  const mimeType = (mime || '').toLowerCase()
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  const cleanName = title.split(/[?#]/)[0]
  const ext = cleanName.split('.').pop()?.toLowerCase() || ''
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  return 'video'
}

export function categoryFor(type: MediaType): Category {
  return type === 'audio' ? 'music' : 'videos'
}

export async function initializeDB(): Promise<void> {
  await getDB()
}

export async function addMedia(item: {
  userId: string
  title: string
  blob: Blob
  mime?: string
  source: Source
}): Promise<MediaItem> {
  const db = await getDB()
  const type = detectType(item.title, item.mime || item.blob.type)
  const record: StoredMedia = {
    id: crypto.randomUUID(),
    userId: item.userId,
    title: item.title,
    type,
    category: categoryFor(type),
    mime: item.mime || item.blob.type || 'application/octet-stream',
    size: item.blob.size,
    source: item.source,
    createdAt: Date.now(),
    blob: item.blob,
  }
  await db.put('media', record)
  const { blob: _blob, ...publicItem } = record
  return publicItem
}

export async function getAllMedia(userId: string): Promise<MediaItem[]> {
  const db = await getDB()
  const records = await db.getAllFromIndex('media', 'by-user', userId)
  records.reverse()
  return records.map(({ blob: _blob, ...item }) => item)
}

export async function getBlob(id: string): Promise<Blob> {
  const db = await getDB()
  const record = await db.get('media', id)
  if (!record) throw new Error('No existe el archivo')
  return record.blob
}

export async function removeMedia(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('media', id)
}

export async function updateDuration(id: string, duration: number): Promise<void> {
  const db = await getDB()
  const record = await db.get('media', id)
  if (!record) return
  record.duration = duration
  await db.put('media', record)
}

export async function clearUserMedia(userId: string): Promise<void> {
  const db = await getDB()
  const records = await db.getAllFromIndex('media', 'by-user', userId)
  const tx = db.transaction('media', 'readwrite')
  await Promise.all(records.map((r) => tx.store.delete(r.id)))
  await tx.done
}

// ---- Usuarios ----

export async function getUsers(): Promise<User[]> {
  const db = await getDB()
  const users = await db.getAll('users')
  users.sort((a, b) => a.createdAt - b.createdAt)
  return users
}

export async function createUser(name: string, pin?: string): Promise<User> {
  const db = await getDB()
  const user: User = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Usuario',
    ...(pin ? { pinHash: hashPin(pin) } : {}),
    createdAt: Date.now(),
  }
  await db.put('users', user)
  return user
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDB()
  return (await db.get('users', id)) ?? null
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDB()
  await clearUserMedia(id)
  await db.delete('users', id)
  const current = await getCurrentUserMeta()
  if (current === id) await setMetaValue(CURRENT_USER_KEY, null)
}

export async function getCurrentUserMeta(): Promise<string | null> {
  const value = await getMetaValue(CURRENT_USER_KEY)
  return typeof value === 'string' && value ? value : null
}

export async function setCurrentUserMeta(id: string | null): Promise<void> {
  await setMetaValue(CURRENT_USER_KEY, id)
}

export function verifyPin(pin: string, pinHash?: string): boolean {
  if (!pinHash) return true
  return hashPin(pin) === pinHash
}

function hashPin(pin: string): string {
  let h = 5381
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) + h) ^ pin.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

export async function getMetaValue(key: string): Promise<unknown> {
  const db = await getDB()
  return db.get('meta', key)
}

export async function setMetaValue(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('meta', value, key)
}