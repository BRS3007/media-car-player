import crypto from 'crypto'

export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Configuración de Cloudinary incompleta en variables de entorno')
  }
  return { cloudName, apiKey, apiSecret }
}

export function signParams(params: Record<string, string>): string {
  const { apiSecret } = getCloudinaryConfig()
  const toSign = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('&')
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')
}

export const CLOUD_FOLDER = 'media_car_player'