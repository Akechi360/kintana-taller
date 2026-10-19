// Genera favicon.svg, icon-192.png e icon-512.png con la marca de Kintana (fabrica del logo)
// sin dependencias: rasteriza los poligonos del logo con regla par-impar.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const FABRICA = [
  [[68, 350], [104, 350], [116, 155], [172, 155], [164, 350], [216, 350], [234, 226], [348, 152], [345, 186], [458, 112], [455, 148], [562, 76], [542, 350], [572, 350], [572, 372], [68, 372]],
  [[258, 350], [270, 250], [322, 215], [310, 350]],
  [[366, 350], [378, 210], [432, 174], [420, 350]],
  [[474, 350], [486, 170], [534, 136], [522, 350]],
]
// Humo: curvas de Bezier del logo muestreadas como poligono.
const bez = (p0, p1, p2, p3, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
})
const HUMO = [[
  ...bez([162, 142], [188, 92], [235, 88], [295, 82]),
  ...bez([295, 82], [340, 77], [372, 60], [402, 36]),
  ...bez([402, 36], [396, 76], [368, 102], [312, 108]),
  ...bez([312, 108], [252, 114], [205, 116], [162, 142]),
]]
const BANDAS = [[0.14, [139, 92, 160]], [0.28, [118, 88, 152]], [0.42, [141, 91, 158]], [0.57, [105, 90, 150]], [0.71, [141, 91, 158]], [0.85, [98, 88, 148]], [1, [139, 92, 160]]]

const dentro = (polys, x, y) => {
  let c = false
  for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }

function png(size) {
  // Marca centrada con margen del 18% (zona segura para iconos "maskable").
  const vx = 58, vy = 28, vw = 520, vh = 352
  const escala = (size * 0.64) / vw
  const ox = (size - vw * escala) / 2, oy = (size - vh * escala) / 2
  const SS = 3 // supermuestreo por eje para bordes suaves
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = (x + (sx + 0.5) / SS - ox) / escala + vx
        const v = (y + (sy + 0.5) / SS - oy) / escala + vy
        let col = [255, 255, 255]
        if (dentro(FABRICA, u, v)) col = BANDAS.find(([h]) => (v - 76) / (372 - 76) <= h)?.[1] || BANDAS[6][1]
        else if (dentro(HUMO, u, v)) col = [90, 73, 70]
        r += col[0]; g += col[1]; b += col[2]
      }
      const i = y * (size * 3 + 1) + 1 + x * 3, n = SS * SS
      raw[i] = Math.round(r / n); raw[i + 1] = Math.round(g / n); raw[i + 2] = Math.round(b / n)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

for (const s of [192, 512]) writeFileSync(new URL(`./public/icon-${s}.png`, import.meta.url), png(s))
const pts = (p) => p.map(([x, y]) => `${x} ${y}`).join(' L')
writeFileSync(new URL('./public/favicon.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 0 556 410"><rect x="40" y="0" width="556" height="410" rx="70" fill="#fff"/>` +
  `<path d="M162 142C188 92 235 88 295 82C340 77 372 60 402 36C396 76 368 102 312 108C252 114 205 116 162 142Z" fill="#5a4946"/>` +
  `<path fill-rule="evenodd" fill="#7a5a9c" d="${FABRICA.map((p) => `M${pts(p)}Z`).join('')}"/></svg>\n`)
console.log('iconos listos')
