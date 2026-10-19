// Genera icon-192.png e icon-512.png (fondo zinc, tres barras cobre) sin dependencias.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
function png(size) {
  const bg = [24, 24, 27], fg = [180, 100, 58]
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      // coordenadas en el viewBox 64x64 del favicon (sin bordes redondeados: el SO aplica su mascara)
      const u = (x / size) * 64, v = (y / size) * 64
      let on = false
      for (const x0 of [14, 24, 34]) {
        if (v < 18 || v > 46) continue
        const t = (46 - v) / 28 // 0 abajo, 1 arriba
        const left = x0 + t * 10
        if (u >= left && u <= left + 5) on = true
      }
      const col = on ? fg : bg
      const i = y * (size * 3 + 1) + 1 + x * 3
      raw[i] = col[0]; raw[i + 1] = col[1]; raw[i + 2] = col[2]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
for (const s of [192, 512]) writeFileSync(new URL(`./public/icon-${s}.png`, import.meta.url), png(s))
console.log('iconos listos')
