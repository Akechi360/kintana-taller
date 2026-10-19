// Calculos tecnicos de taller. Valores de referencia: IEEE 43 (aislamiento),
// NEMA MG 1 / EASA AR100 (desbalance, hipot, vibracion). Verde/ambar/rojo = ok/alerta/mal.

const num = (v) => {
  if (v === null || v === undefined || v === '') return NaN
  return Number(String(v).replace(',', '.'))
}
const ok = (n) => Number.isFinite(n)

export const hpAKw = (hp) => (ok(num(hp)) ? Math.round(num(hp) * 0.7457 * 100) / 100 : '')
export const kwAHp = (kw) => (ok(num(kw)) ? Math.round((num(kw) / 0.7457) * 100) / 100 : '')

// Voltaje nominal "440" o "220/440" -> el mayor, en voltios.
export function voltajeNominal(v) {
  const vals = String(v ?? '').split(/[^0-9.,]+/).map(num).filter(ok)
  return vals.length ? Math.max(...vals) : NaN
}

// Tension CC de prueba del megger segun tension nominal (IEEE 43, tabla 1).
export function tensionMegger(vnom) {
  const v = num(vnom)
  if (!ok(v)) return null
  if (v < 1000) return { min: 500, max: 1000, texto: '500 V CC' }
  if (v <= 2500) return { min: 500, max: 2500, texto: '1000 V CC' }
  if (v <= 5000) return { min: 1000, max: 5000, texto: '2500 V CC' }
  return { min: 2500, max: 10000, texto: '5000 V CC' }
}

// Correccion a 40 C: la resistencia de aislamiento se reduce a la mitad cada 10 C.
export function corregirA40(r, tempC) {
  const R = num(r), T = num(tempC)
  if (!ok(R)) return NaN
  if (!ok(T)) return R
  return R * Math.pow(0.5, (40 - T) / 10)
}

// Minimo de resistencia de aislamiento a 40 C (IEEE 43): <1 kV alambre redondo 5 MOhm, sino 100 MOhm.
export const minimoAislamiento = (vnom) => (num(vnom) < 1000 ? 5 : 100)

export function evaluarAislamiento({ r1, r10, r30s, temp, vnom }) {
  const R1 = num(r1), R10 = num(r10), R30 = num(r30s)
  const r40 = corregirA40(R1, temp)
  const minimo = minimoAislamiento(ok(num(vnom)) ? num(vnom) : 440)
  const res = { r40, minimo, ip: NaN, dar: NaN, nivelR: null, nivelIP: null, nivelDAR: null }
  if (ok(r40)) res.nivelR = r40 >= minimo ? 'ok' : 'mal'
  if (ok(R1) && ok(R10) && R1 > 0) {
    res.ip = R10 / R1
    // Si R1 > 5000 MOhm el IP no es concluyente (IEEE 43).
    res.nivelIP = R1 > 5000 ? 'ok' : res.ip >= 2 ? 'ok' : res.ip >= 1 ? 'alerta' : 'mal'
  }
  if (ok(R1) && ok(R30) && R30 > 0) {
    res.dar = R1 / R30
    res.nivelDAR = res.dar > 1.25 ? 'ok' : res.dar >= 1 ? 'alerta' : 'mal'
  }
  return res
}

export function etiquetaIP(ip) {
  if (!ok(ip)) return ''
  if (ip < 1) return 'Peligroso'
  if (ip < 2) return 'Cuestionable'
  if (ip <= 4) return 'Bueno'
  return 'Excelente'
}

// Desbalance % = max |x - promedio| / promedio * 100
export function desbalance(valores) {
  const v = valores.map(num).filter(ok)
  if (v.length < 2) return NaN
  const prom = v.reduce((a, b) => a + b, 0) / v.length
  if (prom === 0) return NaN
  return (Math.max(...v.map((x) => Math.abs(x - prom))) / prom) * 100
}

const nivel = (x, okMax, alertaMax) => (!ok(x) ? null : x <= okMax ? 'ok' : x <= alertaMax ? 'alerta' : 'mal')
export const nivelDesbalanceResistencia = (p, pletina = false) => nivel(p, pletina ? 1 : 2, pletina ? 2 : 3)
export const nivelDesbalanceVoltaje = (p) => nivel(p, 1, 5)
export const nivelDesbalanceCorriente = (p) => nivel(p, 5, 10)

// Hipot para bobinado nuevo: CA = 1000 + 2 Vnom; CC = 1.7 x CA.
export function hipot(vnom) {
  const v = num(vnom)
  if (!ok(v)) return null
  const ca = 1000 + 2 * v
  return { ca, cc: Math.round(ca * 1.7) }
}

// Vibracion global maxima (motores >= 1200 rpm): 2.7 mm/s rms base resiliente, x0.8 base rigida.
export const limiteVibracion = (base) => (base === 'rigida' ? 2.16 : 2.7)

// Polos a 60 Hz desde rpm de placa (sincronica = 7200 / polos).
export function polosDesdeRpm(rpm) {
  const r = num(rpm)
  if (!ok(r) || r <= 0) return NaN
  const p = Math.round(7200 / r / 2) * 2
  return p >= 2 ? p : NaN
}

// Paso "1 a 16" / "1-16" / "1:16" -> 15 ranuras de paso.
export function pasoRanuras(paso) {
  const m = String(paso ?? '').match(/(\d+)\D+(\d+)/)
  return m ? Number(m[2]) - Number(m[1]) : NaN
}

// Coherencia de bobinado: ranuras por polo, q (ranuras/polo/fase) y acortamiento del paso.
export function revisarBobinado({ ranuras, paso, rpm, fases = 3 }) {
  const Z = num(ranuras), p = polosDesdeRpm(rpm), y = pasoRanuras(paso)
  const out = { polos: p, polar: NaN, q: NaN, acortamiento: NaN, avisos: [] }
  if (!ok(Z) || !ok(p)) return out
  out.polar = Z / p
  out.q = Z / (p * fases)
  if (!Number.isInteger(out.q)) out.avisos.push(`Ranuras por polo y fase = ${out.q.toFixed(2)} (no entero): verificar ranuras o polos.`)
  if (ok(y)) {
    out.acortamiento = y / out.polar
    if (out.acortamiento > 1) out.avisos.push('El paso supera el paso polar: revisar paso.')
    else if (out.acortamiento < 0.66) out.avisos.push('Paso muy acortado (< 2/3 del paso polar): revisar paso.')
  }
  return out
}

// Resume que pruebas no pasan, para avisar antes de dar "Conforme".
export function fallasPruebas(p, vnom) {
  const f = []
  const a = evaluarAislamiento({ r1: p.pf_megger_r1, r10: p.pf_megger_r10, temp: p.pf_megger_temp, vnom })
  if (a.nivelR === 'mal') f.push('Aislamiento por debajo del mínimo')
  if (a.nivelIP === 'mal') f.push('Índice de polarización menor a 1')
  if (nivelDesbalanceResistencia(desbalance([p.pf_res_uv, p.pf_res_vw, p.pf_res_wu])) === 'mal') f.push('Desbalance de resistencia > 3 %')
  const vib = Number(String(p.pf_vibracion ?? '').replace(',', '.'))
  if (p.pf_vibracion && vib > limiteVibracion(p.pf_base)) f.push('Vibración sobre el límite')
  if (p.pf_hipot_ok === 'no') f.push('Hipot no aprobado')
  if (p.pf_surge_ok === 'no') f.push('Prueba de impulso (surge) no aprobada')
  return f
}
