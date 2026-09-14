import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function png(width, height, px) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 4)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 4
      raw[i] = px(x, y)[0]
      raw[i + 1] = px(x, y)[1]
      raw[i + 2] = px(x, y)[2]
      raw[i + 3] = px(x, y)[3]
    }
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const s1 = (cx - ax) * (py - ay) - (cy - ay) * (px - ax)
  const s2 = (bx - cx) * (py - cy) - (by - cy) * (px - cx)
  const s3 = (ax - bx) * (py - by) - (ay - by) * (px - bx)
  const neg = s1 < 0 || s2 < 0 || s3 < 0
  const pos = s1 > 0 || s2 > 0 || s3 > 0
  return !(neg && pos)
}

function circlePoints(cx, cy, r, x, y) {
  return Math.hypot(x - cx, y - cy) <= r
}

function roundedRect(x1, y1, x2, y2, r, x, y) {
  if (x < x1 || x > x2 || y < y1 || y > y2) return false
  const qx = Math.max(x1 + r, Math.min(x2 - r, x))
  const qy = Math.max(y1 + r, Math.min(y2 - r, y))
  return Math.hypot(x - qx, y - qy) <= r
}

function makeIcon(size) {
  const radius = size * 0.22
  const s = size
  const px = (x, y) => {
    // rounded rect background
    const cx = Math.max(radius, Math.min(size - radius, x))
    const cy = Math.max(radius, Math.min(size - radius, y))
    const dx = x - cx
    const dy = y - cy
    const r = Math.hypot(dx, dy)
    if (r > radius) return [15, 23, 42, 0]

    // fondo: degradado cielo
    const v = y / s
    const rA = Math.round(56 + (30 - 56) * v)
    const gA = Math.round(189 + (58 - 189) * v)
    const bA = Math.round(248 + (129 - 248) * v)
    let color = [rA, gA, bA]

    // carro blanco
    const body = roundedRect(s * 0.15, s * 0.44, s * 0.85, s * 0.66, s * 0.05, x, y)
    const cabin = roundedRect(s * 0.41, s * 0.28, s * 0.63, s * 0.46, s * 0.04, x, y)
    const window_ = roundedRect(s * 0.44, s * 0.315, s * 0.6, s * 0.42, s * 0.03, x, y)
    const wheelL = circlePoints(s * 0.33, s * 0.7, s * 0.09, x, y)
    const wheelR = circlePoints(s * 0.67, s * 0.7, s * 0.09, x, y)
    const hubL = circlePoints(s * 0.33, s * 0.7, s * 0.035, x, y)
    const hubR = circlePoints(s * 0.67, s * 0.7, s * 0.035, x, y)

    if (body || cabin) color = [248, 250, 252]
    if (window_) color = [125, 211, 252]
    if (wheelL || wheelR) color = [15, 23, 42]
    if (hubL || hubR) color = [125, 211, 252]

    return [...color, 255]
  }
  writeFileSync(join(outDir, `icon-${size}.png`), png(size, size, px))
}

makeIcon(192)
makeIcon(512)
console.log('Iconos generados en public/icons')