import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type MediaType = 'audio' | 'video'
export type Category = 'music' | 'videos'
export type Source = 'upload' | 'url'

export interface MediaItem {
  id: string
  title: string
  type: MediaType
  category: Category
  mime: string
  size: number
  duration?: number
  source: Source
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
    }
  }
  meta: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'media-car-player'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<CarPlayerDB>> | null = null

function getDB(): Promise<IDBPDatabase<CarPlayerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CarPlayerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('media')) {
          const store = db.createObjectStore('media', { keyPath: 'id' })
          store.createIndex('by-category', 'category')
          store.createIndex('by-type', 'type')
          store.createIndex('by-created', 'createdAt')
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
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
  title: string
  blob: Blob
  mime?: string
  source: Source
}): Promise<MediaItem> {
  const db = await getDB()
  const type = detectType(item.title, item.mime || item.blob.type)
  const record: StoredMedia = {
    id: crypto.randomUUID(),
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

export async function getAllMedia(): Promise<MediaItem[]> {
  const db = await getDB()
  const records = await db.getAllFromIndex('media', 'by-created')
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

export async function getTotalSize(category?: Category): Promise<number> {
  const db = await getDB()
  const items = category ? await db.getAllFromIndex('media', 'by-category', category) : await db.getAll('media')
  return items.reduce((acc, item) => acc + item.size, 0)
}

export async function clearAll(): Promise<void> {
  const db = await getDB()
  await db.clear('media')
}