import { LightbulbIcon, PlusIcon } from '@phosphor-icons/react'
import { useAutoguardado } from '../lib/autoguardado.js'
import { evaluarAislamiento, voltajeNominal } from '../lib/calc.js'
import { TRABAJOS } from '../lib/flujo.js'
import { Segmentado, Chips, Numero, AreaTexto, Seccion, EstadoGuardado, Boton } from '../ui.jsx'
import { Aislamiento, TresFases } from './Mediciones.jsx'

export const ESTADO_PIEZA = [
  { v: 'bueno', l: 'Bueno', tono: 'ok' },
  { v: 'regular', l: 'Regular', tono: 'alerta' },
  { v: 'malo', l: 'Malo', tono: 'mal' },
  { v: 'na', l: 'N/A' },
]
// siEsMalo: si la respuesta "si" indica problema (ej. fisuras).
const siNo = (siEsMalo) => [
  { v: 'si', l: 'Sí', tono: siEsMalo ? 'mal' : 'ok' },
  { v: 'no', l: 'No', tono: siEsMalo ? 'ok' : 'mal' },
]

const PIEZAS = [
  ['tapas', 'Tapas / escudos'],
  ['bornera', 'Bornera'],
  ['ventilador', 'Ventilador'],
  ['caperuza', 'Caperuza'],
  ['eje', 'Eje y acople'],
]

// Sugerencias automaticas de trabajos segun lo marcado.
export function sugerirTrabajos(d, vnom) {
  const s = new Set()
  if (d.rod_cambio === 'si' || d.rod_ruido === 'si' || d.rod_ajuste === 'malo') s.add('rodamientos')
  if (d.ventilador === 'malo') s.add('ventilador')
  if (d.caperuza === 'malo') s.add('caperuza')
  if (d.bornera === 'malo') s.add('terminales')
  if (d.eje === 'malo') s.add('eje')
  if (d.tapas === 'malo' || d.fisuras === 'si') s.add('alojamientos')
  const a = evaluarAislamiento({ r1: d.megger_r1, r10: d.megger_r10, temp: d.megger_temp, vnom })
  if (a.nivelR === 'mal' || a.nivelIP === 'mal') s.add('rebobinado')
  else if (a.nivelIP === 'alerta') s.add('barnizado')
  return [...s].filter((k) => !(d.trabajos || []).includes(k))
}

export default function Diagnostico({ orden, onGuardado }) {
  const [d, set, estado] = useAutoguardado(orden, 'diagnostico', onGuardado)
  const vnom = voltajeNominal(orden.expand?.motor?.voltaje)
  const sugeridos = sugerirTrabajos(d, vnom)
  const nombre = (k) => TRABAJOS.find((t) => t.clave === k)?.nombre || k

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Toca solo lo que aplique. Todo se guarda solo.</p>
        <EstadoGuardado estado={estado} />
      </div>

      <Seccion titulo="Estado general">
        <div className="grid gap-4 sm:grid-cols-2">
          <Segmentado label="Encendió 5 minutos" valor={d.encendido} onChange={(x) => set({ encendido: x })} opciones={siNo(false)} />
          <Segmentado label="Fisuras o grietas" valor={d.fisuras} onChange={(x) => set({ fisuras: x })} opciones={siNo(true)} />
          {PIEZAS.map(([k, l]) => (
            <Segmentado key={k} label={l} valor={d[k]} onChange={(x) => set({ [k]: x })} opciones={ESTADO_PIEZA} />
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Temperatura" descripcion="Con el motor en marcha, si encendió.">
        <div className="grid grid-cols-3 gap-3">
          <Numero label="Carcasa" unidad="°C" valor={d.temp_carcasa} onValor={(x) => set({ temp_carcasa: x })} />
          <Numero label="Rod. LA" unidad="°C" valor={d.temp_rod_la} onValor={(x) => set({ temp_rod_la: x })} />
          <Numero label="Rod. LOA" unidad="°C" valor={d.temp_rod_loa} onValor={(x) => set({ temp_rod_loa: x })} />
        </div>
      </Seccion>

      <Seccion titulo="Aislamiento del devanado" descripcion="Megger a masa. Toma foto de la pantalla del megger en la pestaña Fotos.">
        <Aislamiento v={d} set={set} pre="megger_" vnom={vnom} />
      </Seccion>

      <Seccion titulo="Resistencia óhmica entre fases">
        <TresFases v={d} set={set} claves={['res_uv', 'res_vw', 'res_wu']} tipo="resistencia" />
      </Seccion>

      <Seccion titulo="Corriente" descripcion="En vacío o con carga, por fase.">
        <TresFases v={d} set={set} claves={['i_f1', 'i_f2', 'i_f3']} tipo="corriente" />
      </Seccion>

      <Seccion titulo="Voltaje de alimentación">
        <TresFases v={d} set={set} claves={['v_12', 'v_13', 'v_23']} tipo="voltaje" />
      </Seccion>

      <Seccion titulo="Rodamientos">
        <div className="grid gap-4 sm:grid-cols-2">
          <Segmentado label="Ruido" valor={d.rod_ruido} onChange={(x) => set({ rod_ruido: x })} opciones={siNo(true)} />
          <Segmentado label="Vibración" valor={d.rod_vibracion} onChange={(x) => set({ rod_vibracion: x })} opciones={siNo(true)} />
          <Segmentado label="Fuga de grasa" valor={d.rod_fuga} onChange={(x) => set({ rod_fuga: x })} opciones={siNo(true)} />
          <Segmentado label="Ajuste" valor={d.rod_ajuste} onChange={(x) => set({ rod_ajuste: x })} opciones={ESTADO_PIEZA.slice(0, 3)} />
          <Segmentado label="Requieren cambio" valor={d.rod_cambio} onChange={(x) => set({ rod_cambio: x })} opciones={siNo(true)} />
        </div>
      </Seccion>

      <Seccion titulo="Trabajos requeridos" descripcion="Con esto administración arma la cotización automáticamente.">
        {sugeridos.length > 0 && (
          <div className="flex flex-col gap-3 rounded-[12px] bg-cobre-50 px-4 py-3.5 ring-1 ring-cobre-100">
            <p className="flex items-start gap-2 text-[15px] text-cobre-700">
              <LightbulbIcon className="mt-0.5 size-5 shrink-0" weight="fill" aria-hidden />
              <span>Según lo marcado, el motor podría necesitar: <strong>{sugeridos.map(nombre).join(', ')}</strong>.</span>
            </p>
            <Boton variante="cobre" tam="sm" icono={PlusIcon} className="self-start" onClick={() => set({ trabajos: [...(d.trabajos || []), ...sugeridos] })}>
              Agregar sugeridos
            </Boton>
          </div>
        )}
        <Chips opciones={TRABAJOS.map((t) => ({ v: t.clave, l: t.nombre }))} valores={d.trabajos || []} onChange={(x) => set({ trabajos: x })} />
        <AreaTexto label="Observaciones del diagnóstico" value={d.observaciones || ''} onChange={(e) => set({ observaciones: e.target.value })} placeholder="Ej. devanado con olor a quemado en fase W, eje con desgaste en asiento de rodamiento LA…" ayuda="Puedes dictar con el micrófono del teclado." />
      </Seccion>
    </div>
  )
}
