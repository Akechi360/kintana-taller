import { ArrowLeftIcon, PrinterIcon } from '@phosphor-icons/react'
import { pb, useCarga, fotoUrl, mensajeError, esAdmin } from '../lib/pb.js'
import { TIPOS, TRABAJOS } from '../lib/flujo.js'
import { useRuta } from '../lib/ruta.js'
import { fmtCOP, fmtFecha, fmtFechaHora, fmtNum } from '../lib/fmt.js'
import {
  evaluarAislamiento, desbalance, voltajeNominal, etiquetaIP, revisarBobinado, limiteVibracion,
} from '../lib/calc.js'
import { totales } from '../components/Cotizacion.jsx'
import { Boton, Cargando, ErrorCaja, cx } from '../ui.jsx'

const TITULOS = { recepcion: 'Acta de recepción de equipo', tecnico: 'Informe técnico de servicio', cotizacion: 'Cotización' }
const PIEZA = { bueno: 'Bueno', regular: 'Regular', malo: 'Malo', na: 'N/A', si: 'Sí', no: 'No' }
const NIVEL_TXT = { ok: 'Cumple', alerta: 'Revisar', mal: 'No cumple' }
const n2 = (x) => (Number.isFinite(x) ? fmtNum(Math.round(x * 100) / 100) : '—')

export default function Informe({ id }) {
  const { query } = useRuta()
  const tipo = TITULOS[query.get('tipo')] ? query.get('tipo') : 'tecnico'
  const carga = useCarga(async () => {
    const orden = await pb.collection('ordenes').getOne(id, { expand: 'cliente,motor,tecnico' })
    const fotos = await pb.collection('fotos').getFullList({ filter: pb.filter('orden = {:o}', { o: id }), sort: 'created' })
    const cot = tipo === 'cotizacion' && esAdmin()
      ? await pb.collection('cotizaciones').getFirstListItem(pb.filter('orden = {:o}', { o: id })).catch(() => null)
      : null
    return { orden, fotos, cot }
  }, [id, tipo])

  if (carga.cargando && !carga.data) return <div className="mx-auto max-w-3xl p-6"><Cargando /></div>
  if (carga.error) return <div className="mx-auto max-w-3xl p-6"><ErrorCaja error={mensajeError(carga.error)} onReintentar={() => carga.recargar()} /></div>

  const { orden, fotos, cot } = carga.data
  const c = orden.expand?.cliente || {}
  const m = orden.expand?.motor || {}
  const fotosVer = tipo === 'recepcion' ? fotos.filter((f) => f.etapa === 'recibido') : tipo === 'tecnico' ? fotos : []

  return (
    <div className="min-h-[100dvh] bg-zinc-200/60 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[816px] items-center justify-between gap-3 px-4">
        <a href={`#/orden/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-900">
          <ArrowLeftIcon className="size-4" aria-hidden /> Volver a la OT {orden.numero}
        </a>
        <Boton icono={PrinterIcon} onClick={() => window.print()}>Imprimir o guardar PDF</Boton>
      </div>

      <article className="hoja mx-auto flex max-w-[816px] flex-col gap-6 bg-white px-10 py-10 text-[13px] leading-relaxed text-zinc-900 shadow-[0_20px_50px_-24px_rgb(24_24_27/0.35)]">
        <header className="flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-4">
          <div>
            <img src="/logo-kintana.svg" alt="Kintana Electro-Automatización Industrial S.A.S" width={150} height={130} className="h-[104px] w-auto" />
            <p className="mt-2 text-[11px] leading-snug text-zinc-600">
              Montajes eléctricos · Mantenimiento preventivo y correctivo · Bobinado de motores<br />
              CRA 36 # 8-392, frente a Postobón, Zipaquirá · Tel. 313 234 5748 · 310 301 1976 · kintanapa@hotmail.com
            </p>
          </div>
          <div className="shrink-0 text-right">
            <h1 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{TITULOS[tipo]}</h1>
            <p className="num text-2xl font-semibold">{tipo === 'cotizacion' && cot ? `N° ${cot.numero}` : `OT ${orden.numero}`}</p>
            <p className="text-xs text-zinc-600">{fmtFecha(tipo === 'recepcion' ? orden.created : new Date().toISOString())}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 avoid-break">
          <Bloque titulo="Cliente">
            <Fila k="Nombre" v={c.nombre} />
            <Fila k="NIT" v={c.nit} />
            <Fila k="Contacto" v={[c.contacto, c.telefono].filter(Boolean).join(' · ')} />
            <Fila k="Ciudad" v={c.ciudad} />
          </Bloque>
          <Bloque titulo="Equipo">
            <Fila k="Marca / serial" v={[m.marca, m.serial].filter(Boolean).join(' · ')} />
            <Fila k="Potencia" v={m.hp ? `${fmtNum(m.hp)} HP · ${fmtNum(m.kw)} kW` : ''} />
            <Fila k="Velocidad / tensión" v={[m.rpm && `${m.rpm} rpm`, m.voltaje && `${m.voltaje} V`, m.amperaje && `${fmtNum(m.amperaje)} A`].filter(Boolean).join(' · ')} />
            <Fila k="Rodamientos" v={[m.rodamiento_la, m.rodamiento_loa].filter(Boolean).join(' / ')} />
            <Fila k="Servicio" v={`${TIPOS[orden.tipo] || ''}${tipo === 'cotizacion' ? ` · OT ${orden.numero}` : ''}`} />
          </Bloque>
        </section>

        {tipo === 'recepcion' && <Recepcion orden={orden} />}
        {tipo === 'tecnico' && <Tecnico orden={orden} />}
        {tipo === 'cotizacion' && (cot ? <TablaCotizacion cot={cot} /> : <p className="text-zinc-500">Esta orden aún no tiene cotización.</p>)}

        {fotosVer.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Registro fotográfico</h2>
            <div className="grid grid-cols-3 gap-3">
              {fotosVer.map((f) => (
                <figure key={f.id} className="avoid-break">
                  <img src={fotoUrl(f, '480x360')} alt={f.nota || 'Foto'} width={480} height={360} className="aspect-[4/3] w-full rounded-[6px] object-cover ring-1 ring-zinc-200" />
                  <figcaption className="mt-1 text-[11px] text-zinc-600">{f.nota || 'Foto'} · {fmtFechaHora(f.created)}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-6 grid grid-cols-2 gap-10 pt-6 avoid-break">
          <Firma etiqueta={tipo === 'cotizacion' ? 'Elaboró' : 'Técnico responsable'} nombre={orden.expand?.tecnico?.name} />
          {tipo === 'recepcion' && <Firma etiqueta="Entrega el equipo (cliente)" />}
          {tipo === 'tecnico' && (orden.firma
            ? <Firma etiqueta="Recibió conforme" nombre={`${orden.recibe_nombre}${orden.recibe_documento ? ` · C.C. ${orden.recibe_documento}` : ''}`} img={pb.files.getURL(orden, orden.firma)} />
            : <Firma etiqueta="Recibió conforme (cliente)" />)}
          {tipo === 'cotizacion' && <Firma etiqueta="Aprobación del cliente" />}
        </footer>
        <p className="text-[10px] text-zinc-400">Documento generado por Kintana Taller · {fmtFechaHora(new Date().toISOString())}</p>
      </article>
    </div>
  )
}

function Bloque({ titulo, children, className = '' }) {
  return (
    <section className={cx('flex flex-col gap-1 avoid-break', className)}>
      <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{titulo}</h2>
      {children}
    </section>
  )
}

function Fila({ k, v, nivel }) {
  return (
    <div className="grid grid-cols-[minmax(0,40%)_1fr] gap-3 border-b border-zinc-100 py-1">
      <span className="text-zinc-500">{k}</span>
      <span className="font-medium tabular-nums">
        {v || '—'}
        {nivel && <span className={cx('ml-2 font-sans text-[11px] font-semibold', nivel === 'ok' ? 'text-ok' : nivel === 'alerta' ? 'text-alerta' : 'text-mal')}>{NIVEL_TXT[nivel]}</span>}
      </span>
    </div>
  )
}

function Firma({ etiqueta, nombre, img }) {
  return (
    <div className="flex flex-col justify-end">
      {img ? <img src={img} alt={`Firma de ${nombre}`} width={240} height={88} className="h-16 w-auto object-contain object-left" /> : <div className="h-16" />}
      <div className="border-t border-zinc-900 pt-1.5">
        <p className="font-medium">{nombre || ' '}</p>
        <p className="text-[11px] text-zinc-500">{etiqueta}</p>
      </div>
    </div>
  )
}

function Recepcion({ orden }) {
  const r = orden.recepcion || {}
  return (
    <section className="grid grid-cols-2 gap-6">
      <Bloque titulo="Motivo de ingreso" className="col-span-2">
        <p className="whitespace-pre-line">{orden.falla_reportada || '—'}</p>
      </Bloque>
      <Bloque titulo="Accesorios entregados">
        <p>{(r.accesorios || []).join(', ') || 'Ninguno'}</p>
      </Bloque>
      <Bloque titulo="Estado físico al recibir">
        <p>{r.estado_fisico || 'Sin observaciones'}</p>
      </Bloque>
      <p className="col-span-2 rounded-[6px] bg-zinc-50 px-3 py-2 text-[11px] leading-snug text-zinc-600">
        El cliente declara que el equipo se entrega en las condiciones descritas. Kintana conservará el registro de este servicio y sus pruebas por un mínimo de 3 años.
      </p>
    </section>
  )
}

function Tecnico({ orden }) {
  const d = orden.diagnostico || {}
  const b = orden.bobinado || {}
  const p = orden.pruebas || {}
  const vnom = voltajeNominal(orden.expand?.motor?.voltaje)
  const a1 = evaluarAislamiento({ r1: d.megger_r1, r10: d.megger_r10, r30s: d.megger_r30s, temp: d.megger_temp, vnom })
  const a2 = evaluarAislamiento({ r1: p.pf_megger_r1, r10: p.pf_megger_r10, r30s: p.pf_megger_r30s, temp: p.pf_megger_temp, vnom })
  const dr = desbalance([d.res_uv, d.res_vw, d.res_wu])
  const dr2 = desbalance([p.pf_res_uv, p.pf_res_vw, p.pf_res_wu])
  const di = desbalance([p.pf_i_f1, p.pf_i_f2, p.pf_i_f3])
  const rev = revisarBobinado({ ranuras: b.ranuras, paso: b.paso, rpm: orden.expand?.motor?.rpm })
  const vib = Number(String(p.pf_vibracion ?? '').replace(',', '.'))
  const nivelD = (x, lim) => (Number.isFinite(x) ? (x <= lim ? 'ok' : 'mal') : null)
  const trabajos = (d.trabajos || []).map((k) => TRABAJOS.find((t) => t.clave === k)?.nombre || k)
  const hayBobinado = !!(b.ranuras || b.espiras || b.paso)
  const hayPruebas = !!(p.pf_megger_r1 || p.pf_i_f1 || p.pf_vibracion)

  return (
    <>
      <section className="grid grid-cols-2 gap-6">
        <Bloque titulo="Inspección">
          {[['Encendido 5 min', d.encendido], ['Fisuras', d.fisuras], ['Tapas / escudos', d.tapas], ['Bornera', d.bornera], ['Ventilador', d.ventilador], ['Caperuza', d.caperuza], ['Eje y acople', d.eje]]
            .map(([k, v]) => <Fila key={k} k={k} v={PIEZA[v]} />)}
        </Bloque>
        <Bloque titulo="Rodamientos y temperatura">
          {[['Ruido', d.rod_ruido], ['Vibración', d.rod_vibracion], ['Fuga de grasa', d.rod_fuga], ['Ajuste', d.rod_ajuste], ['Requieren cambio', d.rod_cambio]]
            .map(([k, v]) => <Fila key={k} k={k} v={PIEZA[v]} />)}
          <Fila k="Carcasa / LA / LOA" v={[d.temp_carcasa, d.temp_rod_la, d.temp_rod_loa].some(Boolean) ? `${d.temp_carcasa || '—'} / ${d.temp_rod_la || '—'} / ${d.temp_rod_loa || '—'} °C` : ''} />
        </Bloque>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <Bloque titulo="Aislamiento inicial (IEEE 43)">
          <Fila k="Tensión de prueba" v={d.megger_v && `${d.megger_v} V CC`} />
          <Fila k="1 min / 10 min" v={d.megger_r1 && `${d.megger_r1} / ${d.megger_r10 || '—'} MΩ`} />
          <Fila k="Corregido a 40 °C" v={Number.isFinite(a1.r40) ? `${n2(a1.r40)} MΩ (mín. ${a1.minimo})` : ''} nivel={a1.nivelR} />
          <Fila k="Índice de polarización" v={Number.isFinite(a1.ip) ? `${n2(a1.ip)} · ${etiquetaIP(a1.ip)}` : ''} nivel={a1.nivelIP} />
          <Fila k="Desbalance resistencia" v={Number.isFinite(dr) ? `${n2(dr)} %` : ''} nivel={nivelD(dr, 2)} />
        </Bloque>
        <Bloque titulo="Diagnóstico">
          <p className="font-medium">Trabajos requeridos</p>
          <p>{trabajos.join(', ') || '—'}</p>
          {d.observaciones && <p className="mt-2 whitespace-pre-line text-zinc-700">{d.observaciones}</p>}
        </Bloque>
      </section>

      {hayBobinado && (
        <section className="grid grid-cols-2 gap-6">
          <Bloque titulo="Datos de bobinado">
            <Fila k="Origen de datos" v={b.dato_original === 'si' ? 'Bobinado original' : b.dato_original === 'no' ? 'Rediseño' : ''} />
            <Fila k="Ranuras / paso" v={[b.ranuras, b.paso].filter(Boolean).join(' · paso ')} />
            <Fila k="Espiras / hilos" v={[b.espiras && `${b.espiras} esp.`, b.hilos && `${b.hilos} hilos`].filter(Boolean).join(' · ')} />
            <Fila k="Calibre / peso" v={[b.calibre, b.peso_kg && `${b.peso_kg} kg`].filter(Boolean).join(' · ')} />
            <Fila k="Conexión / puntas" v={[b.conexion, b.puntas && `${b.puntas} puntas`].filter(Boolean).join(' · ')} />
            <Fila k="Aislamiento / clase" v={[b.aislamiento, b.clase && `Clase ${b.clase}`].filter(Boolean).join(' · ')} />
          </Bloque>
          <Bloque titulo="Estator">
            <Fila k="Ø interno / externo" v={b.diametro_interno && `${b.diametro_interno} / ${b.diametro_externo || '—'} cm`} />
            <Fila k="Largo del paquete" v={b.largo && `${b.largo} cm`} />
            <Fila k="Cabeza de bobina" v={b.cabeza_cm && `${b.cabeza_cm} cm`} />
            <Fila k="Polos / q" v={Number.isFinite(rev.q) ? `${rev.polos} polos · q = ${n2(rev.q)}` : ''} nivel={Number.isFinite(rev.q) ? (rev.avisos.length ? 'alerta' : 'ok') : null} />
            {b.notas && <p className="mt-1 whitespace-pre-line text-zinc-700">{b.notas}</p>}
          </Bloque>
        </section>
      )}

      {hayPruebas && (
        <section className="grid grid-cols-2 gap-6">
          <Bloque titulo="Pruebas finales">
            <Fila k="Aislamiento a 40 °C" v={Number.isFinite(a2.r40) ? `${n2(a2.r40)} MΩ` : ''} nivel={a2.nivelR} />
            <Fila k="Índice de polarización" v={Number.isFinite(a2.ip) ? n2(a2.ip) : ''} nivel={a2.nivelIP} />
            <Fila k="Desbalance resistencia" v={Number.isFinite(dr2) ? `${n2(dr2)} %` : ''} nivel={nivelD(dr2, 2)} />
            <Fila k="Hipot" v={p.pf_hipot_v ? `${p.pf_hipot_v} V · ${PIEZA[p.pf_hipot_ok] || ''}` : PIEZA[p.pf_hipot_ok]} nivel={p.pf_hipot_ok === 'si' ? 'ok' : p.pf_hipot_ok === 'no' ? 'mal' : null} />
            <Fila k="Impulso (surge)" v={PIEZA[p.pf_surge_ok]} nivel={p.pf_surge_ok === 'si' ? 'ok' : p.pf_surge_ok === 'no' ? 'mal' : null} />
          </Bloque>
          <Bloque titulo="Prueba en vacío">
            <Fila k="Corriente F1 / F2 / F3" v={p.pf_i_f1 && `${p.pf_i_f1} / ${p.pf_i_f2 || '—'} / ${p.pf_i_f3 || '—'} A`} />
            <Fila k="Desbalance corriente" v={Number.isFinite(di) ? `${n2(di)} %` : ''} nivel={nivelD(di, 5)} />
            <Fila k="Tensión / velocidad" v={[p.pf_v && `${p.pf_v} V`, p.pf_rpm && `${p.pf_rpm} rpm`].filter(Boolean).join(' · ')} />
            <Fila k="Temp. rod. LA / LOA" v={p.pf_temp_la && `${p.pf_temp_la} / ${p.pf_temp_loa || '—'} °C`} />
            <Fila k="Vibración global" v={p.pf_vibracion && `${p.pf_vibracion} mm/s rms (lím. ${fmtNum(limiteVibracion(p.pf_base))})`} nivel={p.pf_vibracion ? (vib <= limiteVibracion(p.pf_base) ? 'ok' : 'mal') : null} />
          </Bloque>
        </section>
      )}

      {(hayBobinado || p.pf_conforme) && (
        <section className="grid grid-cols-2 gap-6 avoid-break">
          <Bloque titulo="Placa de reparador (RETIE)">
            <Fila k="Reparador" v="Kintana Electro-Automatización Industrial S.A.S" />
            <Fila k="Año de reparación" v={String(new Date(String(orden.updated).replace(' ', 'T')).getFullYear())} />
            <Fila k="Modificación" v={hayBobinado ? (b.dato_original === 'no' ? 'Rebobinado con rediseño' : 'Rebobinado con datos originales') : 'Mantenimiento sin modificación del devanado'} />
          </Bloque>
          <Bloque titulo="Liberación">
            <p className={cx('text-base font-semibold', p.pf_conforme ? 'text-ok' : 'text-zinc-500')}>{p.pf_conforme ? 'Conforme para entregar' : 'Pendiente de liberación'}</p>
            {p.pf_observaciones && <p className="whitespace-pre-line text-zinc-700">{p.pf_observaciones}</p>}
          </Bloque>
        </section>
      )}
    </>
  )
}

function TablaCotizacion({ cot }) {
  const t = totales(cot.items || [], cot.iva)
  return (
    <section className="flex flex-col gap-3">
      <table className="w-full">
        <thead className="border-b-2 border-zinc-900 text-left text-[11px] uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="py-1.5 pr-2 font-semibold">Descripción</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Cant.</th>
            <th className="py-1.5 pr-2 font-semibold">Und.</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Valor unit.</th>
            <th className="py-1.5 text-right font-semibold">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {(cot.items || []).map((it) => (
            <tr key={it.id}>
              <td className="py-1.5 pr-2">{it.descripcion}</td>
              <td className="num py-1.5 pr-2 text-right">{fmtNum(it.cantidad)}</td>
              <td className="py-1.5 pr-2">{it.unidad}</td>
              <td className="num py-1.5 pr-2 text-right">{fmtCOP(it.valor)}</td>
              <td className="num py-1.5 text-right">{fmtCOP((Number(it.cantidad) || 0) * (Number(it.valor) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="num ml-auto grid w-64 grid-cols-2 gap-y-1">
        <dt className="text-zinc-600">Subtotal</dt><dd className="text-right">{fmtCOP(t.subtotal)}</dd>
        {cot.iva && <><dt className="text-zinc-600">IVA 19 %</dt><dd className="text-right">{fmtCOP(t.iva)}</dd></>}
        <dt className="border-t border-zinc-900 pt-1 font-semibold">Total</dt><dd className="border-t border-zinc-900 pt-1 text-right font-semibold">{fmtCOP(t.total)}</dd>
      </dl>
      {cot.notas && <p className="whitespace-pre-line text-zinc-700">{cot.notas}</p>}
    </section>
  )
}
