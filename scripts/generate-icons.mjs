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

function makeIcon(size) {
  const radius = size * 0.22
  const px = (x, y) => {
    // rounded rect background
    const cx = Math.max(radius, Math.min(size - radius, x))
    const cy = Math.max(radius, Math.min(size - radius, y))
    const dx = x - cx
    const dy = y - cy
    const r = Math.hypot(dx, dy)
    if (r > radius) return [15, 23, 42, 0]

    const v = (y / size) * 0.5 + 0.5
    const rA = Math.round(13 + 18 * (1 - v))
    const gA = Math.round(20 + 28 * (1 - v))
    const bA = Math.round(36 + 45 * (1 - v))

    const dxn = (x - size * 0.5) / size
    const dyn = (y - size * 0.5) / size
    const dist = Math.sqrt(dxn * dxn + dyn * dyn)

    let color = [rA, gA, bA]

    // subtle ring
    if (dist < 0.42 && dist > 0.36) {
      const t = (0.42 - dist) / 0.06
      color = [
        Math.round(color[0] + (56 - color[0]) * t),
        Math.round(color[1] + (189 - color[1]) * t),
        Math.round(color[2] + (248 - color[2]) * t),
      ]
    }

    // play triangle
    if (inTriangle(x, y, size * 0.38, size * 0.32, size * 0.38, size * 0.68, size * 0.72, size * 0.5)) {
      color = [56, 189, 248]
    }

    return [...color, 255]
  }
  writeFileSync(join(outDir, `icon-${size}.png`), png(size, size, px))
}

makeIcon(192)
makeIcon(512)
console.log('Iconos generados en public/icons')