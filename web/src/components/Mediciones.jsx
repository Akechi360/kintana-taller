import {
  evaluarAislamiento, etiquetaIP, tensionMegger, desbalance,
  nivelDesbalanceResistencia, nivelDesbalanceCorriente, nivelDesbalanceVoltaje,
} from '../lib/calc.js'
import { fmtNum } from '../lib/fmt.js'
import { Numero, Lectura } from '../ui.jsx'

const f2 = (n) => (Number.isFinite(n) ? fmtNum(Math.round(n * 100) / 100) : '—')

// Megger: lecturas a 30 s, 1 min y 10 min; corrige a 40 C y calcula IP y DAR.
export function Aislamiento({ v, set, pre, vnom }) {
  const k = (s) => `${pre}${s}`
  const sug = tensionMegger(vnom)
  const r = evaluarAislamiento({ r1: v[k('r1')], r10: v[k('r10')], r30s: v[k('r30s')], temp: v[k('temp')], vnom })
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Numero label="Tensión" unidad="V CC" valor={v[k('v')]} onValor={(x) => set({ [k('v')]: x })} placeholder={sug ? String(sug.min) : '500'} ayuda={sug ? `Sugerida: ${sug.texto}` : 'Según voltaje de placa'} />
        <Numero label="Temp. devanado" unidad="°C" valor={v[k('temp')]} onValor={(x) => set({ [k('temp')]: x })} placeholder="25…" ayuda="Para corregir a 40 °C" />
        <Numero label="Lectura 30 s" unidad="MΩ" valor={v[k('r30s')]} onValor={(x) => set({ [k('r30s')]: x })} />
        <Numero label="Lectura 1 min" unidad="MΩ" valor={v[k('r1')]} onValor={(x) => set({ [k('r1')]: x })} />
        <Numero label="Lectura 10 min" unidad="MΩ" valor={v[k('r10')]} onValor={(x) => set({ [k('r10')]: x })} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Lectura titulo="Aislamiento a 40 °C" valor={f2(r.r40)} unidad="MΩ" nivel={r.nivelR} detalle={`Mínimo ${r.minimo} MΩ (IEEE 43)`} />
        <Lectura titulo="Índice de polarización" valor={f2(r.ip)} nivel={r.nivelIP} detalle={Number.isFinite(r.ip) ? `${etiquetaIP(r.ip)} · mínimo 2,0` : 'Requiere 1 y 10 min'} />
        <Lectura titulo="Absorción dieléctrica" valor={f2(r.dar)} nivel={r.nivelDAR} detalle={Number.isFinite(r.dar) ? 'Bueno > 1,25' : 'Requiere 30 s y 1 min'} />
      </div>
    </div>
  )
}

const TIPO = {
  resistencia: { unidad: 'Ω', etiquetas: ['U–V', 'V–W', 'W–U'], nivel: nivelDesbalanceResistencia, max: 'Máx. 2 % (alambre redondo)' },
  corriente: { unidad: 'A', etiquetas: ['F1', 'F2', 'F3'], nivel: nivelDesbalanceCorriente, max: 'Referencia ≤ 5 %' },
  voltaje: { unidad: 'V', etiquetas: ['F1–F2', 'F1–F3', 'F2–F3'], nivel: nivelDesbalanceVoltaje, max: 'NEMA: ≤ 1 % sin derrateo' },
}

export function TresFases({ v, set, claves, tipo }) {
  const t = TIPO[tipo]
  const d = desbalance(claves.map((c) => v[c]))
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {claves.map((c, i) => (
        <Numero key={c} label={t.etiquetas[i]} unidad={t.unidad} valor={v[c]} onValor={(x) => set({ [c]: x })} />
      ))}
      <Lectura titulo="Desbalance" valor={f2(d)} unidad="%" nivel={t.nivel(d)} detalle={t.max} />
    </div>
  )
}
