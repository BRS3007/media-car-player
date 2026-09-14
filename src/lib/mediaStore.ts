import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type MediaType = 'audio' | 'video'
export type Category = 'music' | 'videos'
export type Source = 'upload' | 'url' | 'sync'

export interface CloudMeta {
  publicId: string
  url: string
  sizeBytes: number
  syncedAt: number
}

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
  updatedAt: number
  cloud?: CloudMeta
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
  graphics: {
    key: string
    value: Blob | Blob[]
  }
}

const DB_NAME = 'media-car-player'
const DB_VERSION = 3

const CURRENT_USER_KEY = 'current_user'
const TOMBSTONE_PREFIX = 'tomb_'
export const CLOUD_TOKEN_PREFIX = 'cloud_token_'

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
        if (!db.objectStoreNames.contains('graphics')) {
          db.createObjectStore('graphics')
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

export async function addMedia(
  item: {
    userId: string
    title: string
    blob: Blob
    mime?: string
    source: Source
  },
  opts?: {
    id?: string
    type?: MediaType
    updatedAt?: number
    cloud?: CloudMeta
  }
): Promise<MediaItem> {
  const db = await getDB()
  const now = Date.now()
  const type = opts?.type ?? detectType(item.title, item.mime || item.blob.type)
  const createTime = opts?.updatedAt ?? now
  const record: StoredMedia = {
    id: opts?.id ?? crypto.randomUUID(),
    userId: item.userId,
    title: item.title,
    type,
    category: categoryFor(type),
    mime: item.mime || item.blob.type || 'application/octet-stream',
    size: item.blob.size,
    source: item.source,
    createdAt: createTime,
    updatedAt: createTime,
    ...(opts?.cloud ? { cloud: opts.cloud } : {}),
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
  await setTombstone(id)
}

export async function setMediaCloudMeta(id: string, cloud: CloudMeta): Promise<void> {
  const db = await getDB()
  const record = await db.get('media', id)
  if (!record) return
  record.cloud = cloud
  await db.put('media', record)
}

export async function updateDuration(id: string, duration: number): Promise<void> {
  const db = await getDB()
  const record = await db.get('media', id)
  if (!record) return
  record.duration = duration
  record.updatedAt = Date.now()
  await db.put('media', record)
}

// ---- Sincronización (tombstones para borrados) ----

export async function setTombstone(mediaId: string): Promise<void> {
  await setMetaValue(`${TOMBSTONE_PREFIX}${mediaId}`, Date.now())
}

export async function getTombstones(): Promise<string[]> {
  const db = await getDB()
  const keys = await db.getAllKeys('meta')
  return keys
    .filter((k) => typeof k === 'string' && k.startsWith(TOMBSTONE_PREFIX))
    .map((k) => String(k).slice(TOMBSTONE_PREFIX.length))
}

export async function clearTombstone(mediaId: string): Promise<void> {
  await setMetaValue(`${TOMBSTONE_PREFIX}${mediaId}`, null)
}

export async function getCloudToken(userId: string): Promise<string | null> {
  const value = await getMetaValue(`${CLOUD_TOKEN_PREFIX}${userId}`)
  return typeof value === 'string' && value ? value : null
}

export async function setCloudToken(userId: string, token: string | null): Promise<void> {
  await setMetaValue(`${CLOUD_TOKEN_PREFIX}${userId}`, token)
}

// ---- Carrusel de fotos (galería local) ----

const CAR_PHOTOS_KEY = 'car_photos'

export async function getCarPhotos(): Promise<Blob[] | null> {
  const db = await getDB()
  const value = await db.get('graphics', CAR_PHOTOS_KEY)
  return Array.isArray(value) && value.length ? value : null
}

export async function setCarPhotos(blobs: Blob[]): Promise<void> {
  const db = await getDB()
  await db.put('graphics', blobs, CAR_PHOTOS_KEY)
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