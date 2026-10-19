import { useAutoguardado } from '../lib/autoguardado.js'
import { voltajeNominal, hipot, limiteVibracion, fallasPruebas } from '../lib/calc.js'
import { fmtNum } from '../lib/fmt.js'
import { Segmentado, Numero, AreaTexto, Seccion, EstadoGuardado, Lectura, cx } from '../ui.jsx'
import { Aislamiento, TresFases } from './Mediciones.jsx'
import { CheckSquareIcon, SquareIcon, WarningIcon } from '@phosphor-icons/react'

export default function Pruebas({ orden, onGuardado }) {
  const [p, set, estado] = useAutoguardado(orden, 'pruebas', onGuardado)
  const vnom = voltajeNominal(orden.expand?.motor?.voltaje)
  const h = hipot(vnom)
  const lim = limiteVibracion(p.pf_base)
  const vib = Number(String(p.pf_vibracion ?? '').replace(',', '.'))
  const fallas = fallasPruebas(p, vnom)
  const ok = (k, l) => <Segmentado label={l} valor={p[k]} onChange={(x) => set({ [k]: x })} opciones={[{ v: 'si', l: 'Aprobó', tono: 'ok' }, { v: 'no', l: 'No aprobó', tono: 'mal' }, { v: 'na', l: 'No aplica' }]} />

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Pruebas finales antes de entregar.</p>
        <EstadoGuardado estado={estado} />
      </div>

      <Seccion titulo="Aislamiento final">
        <Aislamiento v={p} set={set} pre="pf_megger_" vnom={vnom} />
      </Seccion>

      <Seccion titulo="Resistencia entre fases">
        <TresFases v={p} set={set} claves={['pf_res_uv', 'pf_res_vw', 'pf_res_wu']} tipo="resistencia" />
      </Seccion>

      <Seccion titulo="Prueba de alta tensión" descripcion={h ? `Referencia para bobinado nuevo: ${fmtNum(h.ca)} V CA o ${fmtNum(h.cc)} V CC durante 1 minuto.` : 'Registra el voltaje de placa para calcular el hipot.'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Numero label="Tensión aplicada" unidad="V" valor={p.pf_hipot_v} onValor={(x) => set({ pf_hipot_v: x })} placeholder={h ? String(h.ca) : ''} />
          {ok('pf_hipot_ok', 'Hipot')}
          {ok('pf_surge_ok', 'Impulso (surge)')}
        </div>
      </Seccion>

      <Seccion titulo="Prueba en vacío" descripcion="A tensión y frecuencia nominal.">
        <TresFases v={p} set={set} claves={['pf_i_f1', 'pf_i_f2', 'pf_i_f3']} tipo="corriente" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Numero label="Voltaje aplicado" unidad="V" valor={p.pf_v} onValor={(x) => set({ pf_v: x })} />
          <Numero label="Velocidad medida" unidad="RPM" decimales={false} valor={p.pf_rpm} onValor={(x) => set({ pf_rpm: x })} />
          <Numero label="Temp. rod. LA" unidad="°C" valor={p.pf_temp_la} onValor={(x) => set({ pf_temp_la: x })} ayuda="Ya estabilizada" />
          <Numero label="Temp. rod. LOA" unidad="°C" valor={p.pf_temp_loa} onValor={(x) => set({ pf_temp_loa: x })} />
        </div>
      </Seccion>

      <Seccion titulo="Vibración global">
        <div className="grid gap-4 sm:grid-cols-3">
          <Segmentado label="Base del motor" valor={p.pf_base || 'resiliente'} onChange={(x) => set({ pf_base: x || 'resiliente' })} opciones={[{ v: 'resiliente', l: 'Resiliente' }, { v: 'rigida', l: 'Rígida' }]} />
          <Numero label="Vibración" unidad="mm/s rms" valor={p.pf_vibracion} onValor={(x) => set({ pf_vibracion: x })} />
          <Lectura titulo="Límite" valor={fmtNum(lim)} unidad="mm/s rms" nivel={p.pf_vibracion ? (vib <= lim ? 'ok' : 'mal') : null} detalle="Motores ≥ 1200 rpm" />
        </div>
      </Seccion>

      <Seccion titulo="Liberación">
        {fallas.length > 0 && (
          <ul className="flex flex-col gap-2">
            {fallas.map((f) => (
              <li key={f} className="flex items-center gap-2 rounded-[10px] bg-mal-bg px-3.5 py-2.5 text-[15px] text-mal">
                <WarningIcon className="size-5 shrink-0" weight="bold" aria-hidden />{f}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          role="checkbox"
          aria-checked={!!p.pf_conforme}
          onClick={() => set({ pf_conforme: !p.pf_conforme })}
          className={cx(
            'flex min-h-14 items-center gap-3 rounded-[12px] px-4 py-3 text-left text-base font-semibold ring-1 ring-inset transition-[background-color,box-shadow] duration-150 active:scale-[0.99]',
            p.pf_conforme ? 'bg-ok-bg text-ok ring-ok' : 'bg-white text-zinc-800 ring-zinc-300 hover:ring-zinc-400',
          )}
        >
          {p.pf_conforme ? <CheckSquareIcon className="size-7 shrink-0" weight="fill" aria-hidden /> : <SquareIcon className="size-7 shrink-0" aria-hidden />}
          Conforme para entregar
        </button>
        <AreaTexto label="Observaciones de pruebas" value={p.pf_observaciones || ''} onChange={(e) => set({ pf_observaciones: e.target.value })} rows={3} />
      </Seccion>
    </div>
  )
}
