import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  endpoint: string
}

export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ''
  const bucket = process.env.R2_BUCKET || ''
  const missing = [
    !accountId && 'R2_ACCOUNT_ID',
    !accessKeyId && 'R2_ACCESS_KEY_ID',
    !secretAccessKey && 'R2_SECRET_ACCESS_KEY',
    !bucket && 'R2_BUCKET',
  ].filter(Boolean)
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno R2: ${missing.join(', ')}`)
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  }
}

let clientCache: S3Client | null = null

export function getR2Client(): S3Client {
  if (clientCache) return clientCache
  const { accessKeyId, secretAccessKey, endpoint } = getR2Config()
  clientCache = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  })
  return clientCache
}

/**
 * Genera una URL prefirmada de R2 (S3 compatible) para un objeto del bucket.
 */
export async function presignUrl(
  objectKey: string,
  options: { method?: 'GET' | 'PUT' | 'DELETE'; expiresInSeconds?: number } = {}
): Promise<string> {
  const { bucket } = getR2Config()
  const method = options.method ?? 'GET'
  const expiresIn = options.expiresInSeconds ?? (method === 'PUT' ? 900 : 300)

  const command =
    method === 'PUT'
      ? new PutObjectCommand({ Bucket: bucket, Key: objectKey })
      : method === 'DELETE'
        ? new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })
        : new GetObjectCommand({ Bucket: bucket, Key: objectKey })

  return getSignedUrl(getR2Client(), command, { expiresIn })
}