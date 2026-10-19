import { useEffect, useMemo, useRef, useState } from 'react'
import { FileXlsIcon, LightningIcon, PlusIcon, PrinterIcon, TrashIcon, WhatsappLogoIcon, FloppyDiskIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { pb, useCarga, mensajeError } from '../lib/pb.js'
import { TRABAJOS } from '../lib/flujo.js'
import { fmtCOP, fmtNum } from '../lib/fmt.js'
import { exportarCotizacion } from '../lib/excel.js'
import { Boton, Enlace, Seccion, Cargando, ErrorCaja, Vacio, Selector, AreaTexto, useAviso, cx } from '../ui.jsx'

const uid = () => Math.random().toString(36).slice(2, 10)

// Arma las lineas de la cotizacion a partir de los trabajos marcados en el diagnostico.
export function itemsDesdeDiagnostico(orden, precios) {
  const m = orden.expand?.motor || {}
  const trabajos = orden.diagnostico?.trabajos || []
  const items = []
  for (const clave of trabajos) {
    if (clave === 'rodamientos') {
      for (const ref of [m.rodamiento_la, m.rodamiento_loa].filter(Boolean)) {
        const p = precios.find((x) => x.clave === `rod_${ref}`) || precios.find((x) => x.clave === 'rodamientos')
        items.push({ id: uid(), descripcion: `Rodamiento ${ref}`, cantidad: 1, unidad: 'und', valor: p?.valor || 0 })
      }
      const mo = precios.find((x) => x.clave === 'mo_rodamientos')
      if (mo) items.push({ id: uid(), descripcion: mo.descripcion, cantidad: 1, unidad: mo.unidad || 'und', valor: mo.valor })
      if (m.rodamiento_la || m.rodamiento_loa) continue
    }
    const p = precios.find((x) => x.clave === clave)
    const nombre = TRABAJOS.find((t) => t.clave === clave)?.nombre || clave
    const unidad = p?.unidad || 'und'
    const cantidad = unidad === 'HP' ? Number(m.hp) || 1 : unidad === 'kg' ? Number(orden.bobinado?.peso_kg) || 1 : 1
    items.push({ id: uid(), descripcion: p?.descripcion || nombre, cantidad, unidad, valor: p?.valor || 0 })
  }
  return items
}

export const totales = (items, iva) => {
  const subtotal = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.valor) || 0), 0)
  const vIva = iva ? Math.round(subtotal * 0.19) : 0
  return { subtotal, iva: vIva, total: subtotal + vIva }
}

const ESTADOS_COT = { borrador: 'Borrador', enviada: 'Enviada al cliente', aprobada: 'Aprobada', rechazada: 'Rechazada' }

export default function Cotizacion({ orden, onMoverOrden }) {
  const aviso = useAviso()
  const carga = useCarga(async () => {
    const [cot, precios] = await Promise.all([
      pb.collection('cotizaciones').getFirstListItem(pb.filter('orden = {:o}', { o: orden.id })).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
      pb.collection('precios').getFullList({ sort: 'descripcion' }),
    ])
    return { cot, precios }
  }, [orden.id])
  const [cot, setCot] = useState(null)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [borrada, setBorrada] = useState(null) // { item, indice } para deshacer
  const pendiente = useRef(null)
  pendiente.current = sucio && cot ? cot : null

  useEffect(() => { if (carga.data) { setCot(carga.data.cot); setSucio(false) } }, [carga.data])
  useEffect(() => { if (!borrada) return; const t = setTimeout(() => setBorrada(null), 7000); return () => clearTimeout(t) }, [borrada])
  // Cambios sin guardar: aviso al cerrar la pagina y guardado al salir de la pestana.
  useEffect(() => {
    if (!sucio) return
    const avisoSalida = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisoSalida)
    return () => window.removeEventListener('beforeunload', avisoSalida)
  }, [sucio])
  useEffect(() => () => {
    const c = pendiente.current
    if (c) pb.collection('cotizaciones').update(c.id, { items: c.items, iva: c.iva, estado: c.estado, notas: c.notas }).catch(() => {})
  }, [])

  const t = useMemo(() => (cot ? totales(cot.items || [], cot.iva) : null), [cot])

  if (carga.cargando && !carga.data) return <Cargando />
  if (carga.error) return <ErrorCaja error={mensajeError(carga.error)} onReintentar={() => carga.recargar()} />

  const precios = carga.data.precios
  const cambiar = (p) => { setCot((c) => ({ ...c, ...p })); setSucio(true) }
  const cambiarItem = (id, p) => cambiar({ items: cot.items.map((it) => (it.id === id ? { ...it, ...p } : it)) })

  async function crear(desdeDiagnostico) {
    setGuardando(true)
    setError('')
    try {
      const items = desdeDiagnostico ? itemsDesdeDiagnostico(orden, precios) : [{ id: uid(), descripcion: '', cantidad: 1, unidad: 'und', valor: 0 }]
      const rec = await pb.collection('cotizaciones').create({ orden: orden.id, items, iva: false, estado: 'borrador', notas: 'Validez de la oferta: 15 días. Garantía de 6 meses sobre el trabajo realizado.' })
      setCot(rec)
      setSucio(false)
      aviso(`Cotización ${rec.numero} creada con ${items.length} línea${items.length === 1 ? '' : 's'}`)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  async function guardar(extra = {}) {
    setGuardando(true)
    setError('')
    try {
      const rec = await pb.collection('cotizaciones').update(cot.id, { items: cot.items, iva: cot.iva, estado: cot.estado, notas: cot.notas, ...extra })
      setCot(rec)
      setSucio(false)
      aviso('Cotización guardada')
      return rec
    } catch (e) {
      setError(mensajeError(e))
      return null
    } finally {
      setGuardando(false)
    }
  }

  function whatsapp() {
    const c = orden.expand?.cliente || {}
    const m = orden.expand?.motor || {}
    let tel = String(c.telefono || '').replace(/\D/g, '')
    if (tel.length === 10 && tel.startsWith('3')) tel = `57${tel}`
    const lineas = cot.items.map((it) => `• ${it.descripcion}: ${fmtCOP((Number(it.cantidad) || 0) * (Number(it.valor) || 0))}`)
    const texto = [
      `Buen día${c.contacto ? ` ${c.contacto}` : ''}. Le compartimos la cotización N° ${cot.numero} de Kintana Electricidad Industrial.`,
      `Equipo: ${[m.marca, m.hp && `${m.hp} HP`, m.rpm && `${m.rpm} rpm`].filter(Boolean).join(' ')} (OT ${orden.numero})`,
      '',
      ...lineas,
      '',
      `Total: ${fmtCOP(t.total)}${cot.iva ? ' (IVA incluido)' : ''}`,
      cot.notas || '',
      '',
      'Quedamos atentos a su aprobación.',
    ].join('\n')
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank', 'noopener')
    if (cot.estado === 'borrador') guardar({ estado: 'enviada' }).then((r) => r && setCot(r))
  }

  if (!cot) {
    const n = (orden.diagnostico?.trabajos || []).length
    return (
      <div className="flex flex-col gap-4">
        <ErrorCaja error={error} />
        <Vacio icono={LightningIcon} titulo="Esta orden aún no tiene cotización" texto={n ? `El diagnóstico marcó ${n} trabajo${n === 1 ? '' : 's'}. La cotización se arma sola con la lista de precios; luego puedes ajustar cantidades y valores.` : 'El técnico no ha marcado trabajos en el diagnóstico. Puedes crear una cotización en blanco.'}>
          <div className="flex flex-wrap gap-2">
            {n > 0 && <Boton variante="cobre" icono={LightningIcon} cargando={guardando} onClick={() => crear(true)}>Generar desde el diagnóstico</Boton>}
            <Boton variante="secundario" icono={PlusIcon} disabled={guardando} onClick={() => crear(false)}>Cotización en blanco</Boton>
          </div>
        </Vacio>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="num text-sm text-zinc-500">Cotización N° {cot.numero}</p>
          <p className="text-2xl font-semibold tracking-tight num">{fmtCOP(t.total)}</p>
        </div>
        <Selector label="Estado" value={cot.estado} onChange={(e) => cambiar({ estado: e.target.value })} className="w-56">
          {Object.entries(ESTADOS_COT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Selector>
      </div>

      <Seccion titulo="Líneas" accion={<Boton variante="secundario" tam="sm" icono={PlusIcon} onClick={() => cambiar({ items: [...cot.items, { id: uid(), descripcion: '', cantidad: 1, unidad: 'und', valor: 0 }] })}>Agregar línea</Boton>}>
        <div className="overflow-x-auto rounded-[12px] ring-1 ring-zinc-200">
          <table className="w-full min-w-[640px] bg-white text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2.5">Descripción</th>
                <th className="w-20 px-2 py-2.5 text-right">Cant.</th>
                <th className="w-20 px-2 py-2.5">Unidad</th>
                <th className="w-36 px-2 py-2.5 text-right">Valor unit.</th>
                <th className="w-36 px-3 py-2.5 text-right">Subtotal</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {cot.items.map((it, i) => (
                <tr key={it.id}>
                  <td className="px-2 py-1.5">
                    <input aria-label={`Descripción línea ${i + 1}`} value={it.descripcion} onChange={(e) => cambiarItem(it.id, { descripcion: e.target.value })} list="precios-lista" autoComplete="off" className="h-10 w-full rounded-[8px] px-2 hover:bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cobre-500" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input aria-label={`Cantidad línea ${i + 1}`} inputMode="decimal" value={it.cantidad} onChange={(e) => cambiarItem(it.id, { cantidad: e.target.value.replace(',', '.') })} className="num h-10 w-full rounded-[8px] px-2 text-right hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-cobre-500" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input aria-label={`Unidad línea ${i + 1}`} value={it.unidad} onChange={(e) => cambiarItem(it.id, { unidad: e.target.value })} className="h-10 w-full rounded-[8px] px-2 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-cobre-500" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input aria-label={`Valor unitario línea ${i + 1}`} inputMode="numeric" value={it.valor} onChange={(e) => cambiarItem(it.id, { valor: e.target.value.replace(/\D/g, '') })} className="num h-10 w-full rounded-[8px] px-2 text-right hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-cobre-500" />
                  </td>
                  <td className="num px-3 py-1.5 text-right font-medium">{fmtCOP((Number(it.cantidad) || 0) * (Number(it.valor) || 0))}</td>
                  <td className="px-1 py-1.5">
                    <button type="button" aria-label={`Quitar línea ${i + 1}`} onClick={() => { setBorrada({ item: it, indice: i }); cambiar({ items: cot.items.filter((x) => x.id !== it.id) }) }} className="grid size-10 place-items-center rounded-[8px] text-zinc-400 hover:bg-mal-bg hover:text-mal">
                      <TrashIcon className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="precios-lista">
            {precios.map((p) => <option key={p.id} value={p.descripcion} />)}
          </datalist>
        </div>
        {borrada && (
          <div className="flex items-center justify-between gap-3 rounded-[10px] bg-zinc-900 px-4 py-2.5 text-[15px] text-white" role="status">
            <span className="truncate">Línea eliminada: {borrada.item.descripcion || 'sin descripción'}</span>
            <button type="button" className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline" onClick={() => { const items = [...cot.items]; items.splice(borrada.indice, 0, borrada.item); cambiar({ items }); setBorrada(null) }}>Deshacer</button>
          </div>
        )}
        <dl className="num ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1.5 text-[15px]">
          <dt className="text-zinc-600">Subtotal</dt><dd className="text-right">{fmtCOP(t.subtotal)}</dd>
          <dt className="flex items-center gap-2 text-zinc-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!cot.iva} onChange={(e) => cambiar({ iva: e.target.checked })} className="size-5 accent-zinc-900" />
              IVA 19 %
            </label>
          </dt>
          <dd className="text-right">{fmtCOP(t.iva)}</dd>
          <dt className="border-t border-zinc-200 pt-1.5 font-semibold">Total</dt><dd className="border-t border-zinc-200 pt-1.5 text-right font-semibold">{fmtCOP(t.total)}</dd>
        </dl>
        <p className="text-xs text-zinc-500">Los valores salen de la lista de precios (menú Precios). Al elegir una descripción conocida no se cambia el valor: ajústalo si hace falta. {fmtNum(cot.items.length)} línea{cot.items.length === 1 ? '' : 's'}.</p>
      </Seccion>

      <AreaTexto label="Condiciones y notas" value={cot.notas || ''} onChange={(e) => cambiar({ notas: e.target.value })} rows={3} />
      <ErrorCaja error={error} />

      <div className={cx('no-print sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap gap-2 rounded-[14px] bg-white/95 p-3 ring-1 ring-zinc-200 backdrop-blur md:bottom-4')}>
        <Boton icono={FloppyDiskIcon} cargando={guardando} disabled={!sucio} onClick={() => guardar()}>{sucio ? 'Guardar cambios' : 'Guardado'}</Boton>
        <Boton variante="secundario" icono={FileXlsIcon} onClick={() => exportarCotizacion({ cot, orden, items: cot.items, ...t })}>Excel</Boton>
        <Enlace href={`#/orden/${orden.id}/informe?tipo=cotizacion`} icono={PrinterIcon}>PDF</Enlace>
        <Boton variante="secundario" icono={WhatsappLogoIcon} onClick={whatsapp} disabled={sucio} title={sucio ? 'Guarda antes de enviar' : undefined}>WhatsApp</Boton>
        {cot.estado === 'aprobada' && ['cotizacion', 'aprobacion'].includes(orden.estado) && (
          <Boton variante="cobre" icono={ArrowRightIcon} disabled={sucio} onClick={() => onMoverOrden('reparacion')}>Pasar a reparación</Boton>
        )}
      </div>
    </div>
  )
}
