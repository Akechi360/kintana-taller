import { useState } from 'react'
import { MagnifyingGlassIcon, WarningIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { pb, mensajeError } from '../lib/pb.js'
import { useAutoguardado } from '../lib/autoguardado.js'
import { revisarBobinado } from '../lib/calc.js'
import { fmtNum } from '../lib/fmt.js'
import { Segmentado, Numero, Texto, Selector, AreaTexto, Seccion, EstadoGuardado, Boton, Lectura, Dialogo, Cargando, ErrorCaja, useAviso } from '../ui.jsx'
import { ListaRecetas, buscarRecetas } from './ListaRecetas.jsx'

const AWG = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26']
const CONEXIONES = ['1Y', '2Y', '4Y', '1Δ', '2Δ', '4Δ']
// Datos que se copian de una receta (la geometria la mide el tecnico).
const DE_RECETA = ['ranuras', 'paso', 'espiras', 'hilos', 'calibre', 'peso_kg', 'conexion', 'circuitos', 'puntas', 'cabeza_cm', 'aislamiento', 'clase']

export default function Bobinado({ orden, onGuardado }) {
  const [b, set, estado] = useAutoguardado(orden, 'bobinado', onGuardado)
  const aviso = useAviso()
  const motor = orden.expand?.motor || {}
  const rev = revisarBobinado({ ranuras: b.ranuras, paso: b.paso, rpm: motor.rpm })
  const [buscando, setBuscando] = useState(null) // null | { cargando, data, error }

  async function buscar() {
    setBuscando({ cargando: true })
    try {
      const data = await buscarRecetas(pb, { ranuras: b.ranuras, di: b.diametro_interno, largo: b.largo })
      setBuscando({ data })
    } catch (e) {
      setBuscando({ error: mensajeError(e) })
    }
  }

  function usar(r) {
    const copia = Object.fromEntries(DE_RECETA.filter((k) => r.bobinado[k] !== undefined && r.bobinado[k] !== '').map((k) => [k, r.bobinado[k]]))
    set({ ...copia, receta_origen: r.orden })
    setBuscando(null)
    aviso(`Datos copiados de la OT ${r.orden}. Verifica antes de bobinar.`)
  }

  const c = (k) => ({ valor: b[k], onValor: (x) => set({ [k]: x }) })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Hoja de datos de bobinado{b.receta_origen ? ` · copiada de OT ${b.receta_origen}` : ''}</p>
        <EstadoGuardado estado={estado} />
      </div>

      <Seccion titulo="Medidas del estator" descripcion="Con estas medidas se buscan motores iguales ya bobinados en el taller.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Numero label="Diámetro interno" unidad="cm" {...c('diametro_interno')} />
          <Numero label="Diámetro externo" unidad="cm" {...c('diametro_externo')} />
          <Numero label="Largo del paquete" unidad="cm" {...c('largo')} />
          <Numero label="Ancho del diente" unidad="mm" {...c('ancho_diente')} />
          <Numero label="Alto del diente" unidad="mm" {...c('alto_diente')} />
          <Numero label="Ranuras (canales)" decimales={false} {...c('ranuras')} />
        </div>
        <Boton variante="secundario" icono={MagnifyingGlassIcon} onClick={buscar} className="self-start" disabled={!b.ranuras && !b.diametro_interno}>
          Buscar recetas con estas medidas
        </Boton>
      </Seccion>

      <Seccion titulo="Datos del bobinado">
        <Segmentado label="¿Datos tomados del bobinado original?" valor={b.dato_original} onChange={(x) => set({ dato_original: x })} opciones={[{ v: 'si', l: 'Sí, original' }, { v: 'no', l: 'No, rediseño' }]} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Texto label="Paso de bobina" value={b.paso || ''} onChange={(e) => set({ paso: e.target.value })} placeholder="1 a 16…" mono />
          <Numero label="Espiras por bobina" decimales={false} {...c('espiras')} />
          <Numero label="Hilos en paralelo" decimales={false} {...c('hilos')} />
          <Selector label="Calibre" value={b.calibre || ''} onChange={(e) => set({ calibre: e.target.value })}>
            <option value="">AWG…</option>
            {AWG.map((a) => <option key={a} value={`AWG ${a}`}>AWG {a}</option>)}
          </Selector>
          <Numero label="Peso del alambre" unidad="kg" {...c('peso_kg')} />
          <Numero label="Circuitos en paralelo" decimales={false} {...c('circuitos')} />
        </div>
        <div className="flex flex-col gap-2">
          <Texto label="Conexión" value={b.conexion || ''} onChange={(e) => set({ conexion: e.target.value })} placeholder="4Δ…" mono />
          <div className="flex flex-wrap gap-2">
            {CONEXIONES.map((x) => (
              <button key={x} type="button" aria-pressed={b.conexion === x} onClick={() => set({ conexion: x })} className={`num h-10 rounded-[9px] px-3 text-sm font-medium ring-1 ring-inset transition-[background-color,color] duration-150 active:scale-[0.97] ${b.conexion === x ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-300 hover:ring-zinc-400'}`}>{x}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Numero label="Puntas afuera" decimales={false} {...c('puntas')} />
          <Numero label="Cabeza de bobina" unidad="cm" {...c('cabeza_cm')} />
          <Segmentado label="Clase térmica" valor={b.clase} onChange={(x) => set({ clase: x })} opciones={[{ v: 'B', l: 'B' }, { v: 'F', l: 'F' }, { v: 'H', l: 'H' }]} />
        </div>
        <Texto label="Aislamiento de ranura" value={b.aislamiento || ''} onChange={(e) => set({ aislamiento: e.target.value })} placeholder="Fibra Royal # 0,40…" />
      </Seccion>

      <Seccion titulo="Revisión automática" descripcion={motor.rpm ? `Con ${motor.rpm} rpm de placa a 60 Hz.` : 'Registra las RPM del motor para revisar el bobinado.'}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Lectura titulo="Polos" valor={Number.isFinite(rev.polos) ? rev.polos : '—'} />
          <Lectura titulo="Paso polar" valor={Number.isFinite(rev.polar) ? fmtNum(rev.polar) : '—'} unidad="ranuras" />
          <Lectura titulo="Ranuras/polo/fase" valor={Number.isFinite(rev.q) ? fmtNum(Math.round(rev.q * 100) / 100) : '—'} nivel={Number.isFinite(rev.q) ? (Number.isInteger(rev.q) ? 'ok' : 'alerta') : null} />
          <Lectura titulo="Acortamiento" valor={Number.isFinite(rev.acortamiento) ? `${fmtNum(Math.round(rev.acortamiento * 1000) / 10)}` : '—'} unidad="%" nivel={Number.isFinite(rev.acortamiento) ? (rev.acortamiento <= 1 && rev.acortamiento >= 0.66 ? 'ok' : 'alerta') : null} />
        </div>
        {rev.avisos.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {rev.avisos.map((a) => (
              <li key={a} className="flex items-start gap-2 rounded-[10px] bg-alerta-bg px-3.5 py-2.5 text-[15px] text-alerta">
                <WarningIcon className="mt-0.5 size-5 shrink-0" weight="bold" aria-hidden />{a}
              </li>
            ))}
          </ul>
        ) : Number.isFinite(rev.q) && (
          <p className="flex items-center gap-2 text-[15px] text-ok"><CheckCircleIcon className="size-5" weight="fill" aria-hidden />Ranuras, polos y paso son coherentes.</p>
        )}
      </Seccion>

      <Seccion titulo="Observaciones y diseño">
        <AreaTexto label="Notas de diseño" value={b.notas || ''} onChange={(e) => set({ notas: e.target.value })} placeholder="Ej. 74 cm de cabeza, 12 puntas afuera, amarre doble en cabeza LOA…" ayuda="Puedes dictar con el micrófono del teclado." />
      </Seccion>

      <Dialogo abierto={!!buscando} onCerrar={() => setBuscando(null)} titulo="Recetas del taller" ancho="max-w-2xl">
        {buscando?.cargando && <Cargando filas={3} />}
        <ErrorCaja error={buscando?.error} onReintentar={buscar} />
        {buscando?.data && <ListaRecetas recetas={buscando.data} onUsar={usar} excluirOrden={orden.numero} />}
      </Dialogo>
    </div>
  )
}
