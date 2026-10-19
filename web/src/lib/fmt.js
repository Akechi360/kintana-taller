const LOC = 'es-CO'
const cop = new Intl.NumberFormat(LOC, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const n2 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 2 })
const fecha = new Intl.DateTimeFormat(LOC, { day: '2-digit', month: 'short', year: 'numeric' })
const fechaHora = new Intl.DateTimeFormat(LOC, { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })

// PocketBase devuelve "2026-10-17 18:50:50.123Z"
const aDate = (v) => (v ? new Date(String(v).replace(' ', 'T')) : null)

export const fmtCOP = (v) => cop.format(Number(v) || 0)
export const fmtNum = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : n2.format(Number(v)))
export const fmtFecha = (v) => (aDate(v) ? fecha.format(aDate(v)) : '—')
export const fmtFechaHora = (v) => (aDate(v) ? fechaHora.format(aDate(v)) : '—')

export function diasDesde(v) {
  const d = aDate(v)
  if (!d) return 0
  return Math.max(0, (Date.now() - d.getTime()) / 86400000)
}

export function fmtDuracion(dias) {
  if (dias < 1 / 24) return 'menos de 1 h'
  if (dias < 1) return `${Math.round(dias * 24)} h`
  return `${n2.format(Math.round(dias * 10) / 10)} d`
}

export const motorCorto = (m) =>
  m ? [m.marca, m.hp ? `${fmtNum(m.hp)} HP` : '', m.rpm ? `${m.rpm} rpm` : ''].filter(Boolean).join(' · ') : '—'

export const iniciales = (nombre = '') =>
  nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
