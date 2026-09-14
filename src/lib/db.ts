import mysql, { Pool } from 'mysql2/promise'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL no configurada')
    pool = mysql.createPool({
      uri: url,
      ssl: { rejectUnauthorized: true },
      connectionLimit: 4,
      waitForConnections: true,
      timezone: 'Z',
    })
  }
  return pool
}

export async function ensureSchema(): Promise<void> {
  const db = getPool()
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      pin_hash CHAR(64) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_name (name)
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token CHAR(48) PRIMARY KEY,
      user_id BIGINT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at BIGINT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS media_car (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      media_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      artist VARCHAR(255) NOT NULL DEFAULT '',
      type VARCHAR(16) NOT NULL,
      ritmo VARCHAR(64) NOT NULL DEFAULT '',
      duration DOUBLE NULL,
      cloudinary_public_id VARCHAR(255) NOT NULL,
      cloudinary_url TEXT NOT NULL,
      size_bytes BIGINT NULL,
      updated_at BIGINT NOT NULL,
      deleted TINYINT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_media (user_id, media_id),
      KEY idx_user (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
}