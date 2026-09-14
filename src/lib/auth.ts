import crypto from 'crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { getPool } from './db'

const PIN_SALT = 'media_car_player_v1'

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + PIN_SALT).digest('hex')
}

export async function createUser(name: string, pin: string): Promise<number> {
  const db = getPool()
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO users (name, pin_hash) VALUES (?, ?)',
    [name, hashPin(pin)]
  )
  return result.insertId
}

export async function findUser(name: string): Promise<{ id: number; pinHash: string } | null> {
  const db = getPool()
  const [rows] = await db.execute<mysqlRow[]>(
    'SELECT id, pin_hash AS pinHash FROM users WHERE name = ?',
    [name]
  )
  return rows.length ? rows[0] : null
}

export async function createSession(userId: number): Promise<string> {
  const db = getPool()
  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = Math.round(Date.now() / 1000) + 60 * 60 * 24 * 365
  await db.execute(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expiresAt]
  )
  return token
}

export async function getUserIdByToken(token: string): Promise<number | null> {
  const db = getPool()
  const [rows] = await db.execute<mysqlRow[]>(
    'SELECT user_id AS userId FROM sessions WHERE token = ? AND expires_at > ?',
    [token, Math.round(Date.now() / 1000)]
  )
  return rows.length ? rows[0].userId : null
}

export async function deleteSession(token: string): Promise<void> {
  const db = getPool()
  await db.execute('DELETE FROM sessions WHERE token = ?', [token])
}

type mysqlRow = RowDataPacket & {
  id: number
  userId: number
  pinHash: string
}