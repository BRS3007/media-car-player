import { writeFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

const PHOTO_ID = '1494976388531-d1058494cdd8'

async function downloadIcon(size) {
  const url = `https://images.unsplash.com/photo-${PHOTO_ID}?w=${size}&h=${size}&fit=crop&crop=center&fm=png&q=80`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar el icono de ${size}px (HTTP ${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  writeFileSync(join(outDir, `icon-${size}.png`), buffer)
  console.log(`icon-${size}.png  (${buffer.length} bytes)`)
}

await downloadIcon(192)
await downloadIcon(512)
console.log('Iconos con foto de auto real generados en public/icons')