import { Suspense, useRef, useState } from 'react'
import {
  ArrowLeftIcon, ArrowRightIcon, LightningIcon, PrinterIcon, WarningIcon, CheckIcon, SignatureIcon, UserSwitchIcon,
} from '@phosphor-icons/react'
import { pb, useCarga, useEnVivo, esAdmin, mensajeError } from '../lib/pb.js'
import { ESTADOS, ETAPA, TIPOS, siguiente, tecnicoPuedeAvanzar, indice } from '../lib/flujo.js'
import { diasDesde, fmtDuracion, fmtFecha, fmtFechaHora, fmtNum, motorCorto } from '../lib/fmt.js'
import { voltajeNominal, fallasPruebas } from '../lib/calc.js'
import { useRuta, lazyConRecarga } from '../lib/ruta.js'
import { Boton, Enlace, Etiqueta, Cargando, ErrorCaja, Dialogo, Seccion, Texto, Selector, useAviso, cx } from '../ui.jsx'
import { Firma } from '../components/Firma.jsx'

const Diagnostico = lazyConRecarga(() => import('../components/Diagnostico.jsx'))
const Bobinado = lazyConRecarga(() => import('../components/Bobinado.jsx'))
const Pruebas = lazyConRecarga(() => import('../components/Pruebas.jsx'))
const Cotizacion = lazyConRecarga(() => import('../components/Cotizacion.jsx'))
const FotosOrden = lazyConRecarga(() => import('../components/FotosOrden.jsx'))

const PESTANAS = [
  { k: 'resumen', l: 'Resumen' },
  { k: 'fotos', l: 'Fotos' },
  { k: 'diagnostico', l: 'Diagnóstico' },
  { k: 'bobinado', l: 'Bobinado' },
  { k: 'pruebas', l: 'Pruebas' },
  { k: 'cotizacion', l: 'Cotización', admin: true },
  { k: 'historial', l: 'Historial' },
]

// Pestaña sugerida segun la etapa: el tecnico cae directo donde tiene que trabajar.
const PESTANA_ETAPA = { recibido: 'fotos', diagnostico: 'diagnostico', cotizacion: 'cotizacion', aprobacion: 'cotizacion', reparacion: 'bobinado', pruebas: 'pruebas', listo: 'resumen', entregado: 'resumen' }

function avisosAntesDeAvanzar(o) {
  const a = []
  const d = o.diagnostico || {}
  if (o.estado === 'diagnostico') {
    if (!(d.trabajos || []).length) a.push('No hay trabajos requeridos marcados: la cotización saldrá vacía.')
    if (!d.megger_r1) a.push('Falta la lectura de aislamiento (megger 1 min).')
  }
  if (o.estado === 'reparacion' && o.tipo === 'bobinado' && !o.bobinado?.ranuras) a.push('La ficha de bobinado está vacía.')
  if (o.estado === 'pruebas') {
    if (!o.pruebas?.pf_conforme) a.push('No se marcó “Conforme para entregar”.')
    a.push(...fallasPruebas(o.pruebas || {}, voltajeNominal(o.expand?.motor?.voltaje)))
  }
  return a
}

export default function Orden({ id }) {
  const admin = esAdmin()
  const aviso = useAviso()
  const { query } = useRuta()
  const carga = useCarga(() => pb.collection('ordenes').getOne(id, { expand: 'cliente,motor,tecnico' }), [id])
  const [local, setLocal] = useState(null)
  useEnVivo('ordenes', () => carga.recargar(true))
  const orden = local && carga.data && local.id === carga.data.id && local.updated > carga.data.updated ? local : carga.data
  const [mover, setMover] = useState(null) // estado destino a confirmar
  const [moviendo, setMoviendo] = useState(false)
  const [errorMover, setErrorMover] = useState('')

  if (carga.cargando && !carga.data) return <div className="mx-auto max-w-4xl px-4 py-6 md:px-8"><Cargando filas={5} /></div>
  if (carga.error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        <ErrorCaja error={mensajeError(carga.error)} onReintentar={() => carga.recargar()} />
        <Enlace href="#/ordenes" variante="fantasma" icono={ArrowLeftIcon} className="mt-4">Volver a órdenes</Enlace>
      </div>
    )
  }

  const onGuardado = (rec) => setLocal((prev) => ({ ...(prev?.id === rec.id ? prev : orden), ...rec, expand: orden.expand }))
  const tab = query.get('tab') || PESTANA_ETAPA[orden.estado] || 'resumen'
  const pestanas = PESTANAS.filter((p) => !p.admin || admin)
  const sig = siguiente(orden.estado)
  const puedeAvanzar = sig && (admin || tecnicoPuedeAvanzar(orden.estado)) && orden.estado !== 'listo'
  const m = orden.expand?.motor || {}
  const c = orden.expand?.cliente || {}

  async function confirmarMover() {
    setMoviendo(true)
    setErrorMover('')
    try {
      const rec = await pb.collection('ordenes').update(orden.id, { estado: mover })
      onGuardado(rec)
      aviso(`OT ${orden.numero}: ${ETAPA[mover].nombre}`)
      setMover(null)
      window.location.hash = `/orden/${orden.id}?tab=${PESTANA_ETAPA[mover]}`
    } catch (e) {
      setErrorMover(mensajeError(e))
    } finally {
      setMoviendo(false)
    }
  }

  const advertencias = mover && indice(mover) > indice(orden.estado) ? avisosAntesDeAvanzar(orden) : []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <a href={admin ? '#/' : '#/ordenes'} className="no-print inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900">
        <ArrowLeftIcon className="size-4" aria-hidden />
        {admin ? 'Tablero' : 'Mis órdenes'}
      </a>

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="num text-3xl font-semibold tracking-tight">OT {orden.numero}</h1>
              <Etiqueta nivel={orden.estado === 'entregado' ? 'ok' : 'cobre'}>{ETAPA[orden.estado].nombre}</Etiqueta>
              {orden.prioridad === 'urgente' && <Etiqueta nivel="mal"><LightningIcon className="size-3.5" weight="fill" aria-hidden />Urgente</Etiqueta>}
            </div>
            <p className="mt-1.5 truncate text-lg font-medium text-zinc-900">{c.nombre}</p>
            <p className="truncate text-[15px] text-zinc-600">{motorCorto(m)}{m.voltaje ? ` · ${m.voltaje} V` : ''} · {TIPOS[orden.tipo] || 'Servicio'}</p>
          </div>
          <div className="text-right text-sm text-zinc-500">
            <p>Técnico: <span className="font-medium text-zinc-800">{orden.expand?.tecnico?.name || 'Sin asignar'}</span></p>
            <p mono>{fmtDuracion(diasDesde(orden.estado_desde))} en esta etapa</p>
          </div>
        </div>
        <Pasos estado={orden.estado} />
      </header>

      {orden.estado !== 'entregado' && (
        <div className="no-print flex flex-wrap items-center gap-2">
          {puedeAvanzar && (
            <Boton variante="cobre" tam="lg" icono={ArrowRightIcon} onClick={() => setMover(sig)} className="flex-1 sm:flex-none">
              {ETAPA[orden.estado].accion}
            </Boton>
          )}
          {!admin && !tecnicoPuedeAvanzar(orden.estado) && (
            <p className="rounded-[10px] bg-zinc-200/70 px-4 py-3 text-[15px] text-zinc-700">
              {orden.estado === 'listo' ? 'Administración registra la entrega al cliente.' : 'Esta etapa la mueve administración. Te avisa el tablero cuando vuelva a ti.'}
            </p>
          )}
          {admin && <MoverA orden={orden} onElegir={setMover} />}
          {admin && <Reasignar orden={orden} onGuardado={onGuardado} />}
        </div>
      )}

      <nav className="no-print -mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0" aria-label="Secciones de la orden">
        <div className="flex w-max gap-1 rounded-[12px] bg-zinc-200/70 p-1">
          {pestanas.map((p) => (
            <a
              key={p.k}
              href={`#/orden/${orden.id}?tab=${p.k}`}
              aria-current={tab === p.k ? 'page' : undefined}
              className={cx(
                'flex h-10 items-center rounded-[9px] px-3.5 text-[15px] font-medium transition-[background-color,color] duration-150',
                tab === p.k ? 'bg-white text-zinc-900 shadow-[0_1px_2px_rgb(24_24_27/0.12)]' : 'text-zinc-600 hover:text-zinc-900',
              )}
            >
              {p.l}
            </a>
          ))}
        </div>
      </nav>

      <Suspense fallback={<Cargando />}>
        {tab === 'resumen' && <Resumen orden={orden} admin={admin} onGuardado={onGuardado} />}
        {tab === 'fotos' && <FotosOrden orden={orden} />}
        {tab === 'diagnostico' && <Diagnostico key={orden.id} orden={orden} onGuardado={onGuardado} />}
        {tab === 'bobinado' && <Bobinado key={orden.id} orden={orden} onGuardado={onGuardado} />}
        {tab === 'pruebas' && <Pruebas key={orden.id} orden={orden} onGuardado={onGuardado} />}
        {tab === 'cotizacion' && admin && <Cotizacion orden={orden} onMoverOrden={(e) => setMover(e)} />}
        {tab === 'historial' && <Historial orden={orden} />}
      </Suspense>

      <Dialogo abierto={!!mover} onCerrar={() => { setMover(null); setErrorMover('') }} titulo={mover ? `Pasar a ${ETAPA[mover].nombre.toLowerCase()}` : ''}>
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-relaxed text-zinc-600">
            La OT <span className="num font-semibold text-zinc-900">{orden.numero}</span> pasa de <strong>{ETAPA[orden.estado].nombre}</strong> a <strong>{mover && ETAPA[mover].nombre}</strong>.
            {!admin && ' Después no podrás devolverla; si te equivocas, avisa a administración.'}
          </p>
          {advertencias.length > 0 && (
            <ul className="flex flex-col gap-2">
              {advertencias.map((a) => (
                <li key={a} className="flex items-start gap-2 rounded-[10px] bg-alerta-bg px-3.5 py-2.5 text-[15px] text-alerta">
                  <WarningIcon className="mt-0.5 size-5 shrink-0" weight="bold" aria-hidden />{a}
                </li>
              ))}
            </ul>
          )}
          <ErrorCaja error={errorMover} />
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="secundario" tam="lg" onClick={() => setMover(null)}>Cancelar</Boton>
            <Boton variante="cobre" tam="lg" icono={CheckIcon} cargando={moviendo} onClick={confirmarMover}>
              {advertencias.length ? 'Pasar igual' : 'Confirmar'}
            </Boton>
          </div>
        </div>
      </Dialogo>
    </div>
  )
}

function Pasos({ estado }) {
  const i = indice(estado)
  return (
    <ol className="no-print grid grid-cols-8 gap-1" aria-label="Avance de la orden">
      {ESTADOS.map((e, n) => (
        <li key={e} className="flex min-w-0 flex-col gap-1.5" aria-current={n === i ? 'step' : undefined}>
          <span className={cx('h-1.5 rounded-full', n < i ? 'bg-zinc-900' : n === i ? 'bg-cobre-500' : 'bg-zinc-300')} />
          <span className={cx('hidden truncate text-xs sm:block', n === i ? 'font-semibold text-zinc-900' : 'text-zinc-500')}>{ETAPA[e].corto}</span>
        </li>
      ))}
    </ol>
  )
}

function MoverA({ orden, onElegir }) {
  const [v, setV] = useState('')
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="mover-a">Mover a otra etapa</label>
      <select id="mover-a" value={v} onChange={(e) => setV(e.target.value)} className="h-11 rounded-[10px] bg-white px-3 text-[15px] ring-1 ring-inset ring-zinc-300 focus:outline-none focus:ring-2 focus:ring-cobre-500">
        <option value="">Mover a…</option>
        {ESTADOS.filter((e) => e !== orden.estado && e !== 'entregado').map((e) => <option key={e} value={e}>{ETAPA[e].nombre}</option>)}
      </select>
      <Boton variante="secundario" disabled={!v} onClick={() => { onElegir(v); setV('') }}>Mover</Boton>
    </div>
  )
}

function Reasignar({ orden, onGuardado }) {
  const aviso = useAviso()
  const tecnicos = useCarga(() => pb.collection('users').getFullList({ filter: "rol = 'tecnico'", sort: 'name' }))
  const [guardando, setGuardando] = useState(false)
  async function cambiar(e) {
    setGuardando(true)
    try {
      const rec = await pb.collection('ordenes').update(orden.id, { tecnico: e.target.value }, { expand: 'cliente,motor,tecnico' })
      onGuardado(rec)
      aviso(`Asignada a ${rec.expand?.tecnico?.name || 'técnico'}`)
    } catch (err) {
      aviso(mensajeError(err), 'mal')
    } finally {
      setGuardando(false)
    }
  }
  return (
    <div className="flex items-center gap-2 sm:ml-auto">
      <UserSwitchIcon className="size-5 text-zinc-500" aria-hidden />
      <label className="sr-only" htmlFor="reasignar">Técnico asignado</label>
      <select id="reasignar" value={orden.tecnico || ''} disabled={guardando || !tecnicos.data} onChange={cambiar} className="h-11 rounded-[10px] bg-white px-3 text-[15px] ring-1 ring-inset ring-zinc-300 focus:outline-none focus:ring-2 focus:ring-cobre-500">
        <option value="">Sin asignar</option>
        {(tecnicos.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  )
}

function Dato({ k, v, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500">{k}</dt>
      <dd className={cx('truncate font-medium text-zinc-900', mono && 'num')}>{v || '—'}</dd>
    </div>
  )
}

function Resumen({ orden, admin, onGuardado }) {
  const c = orden.expand?.cliente || {}
  const m = orden.expand?.motor || {}
  const r = orden.recepcion || {}
  return (
    <div className="flex flex-col gap-8">
      <div className="no-print flex flex-wrap gap-2">
        <Enlace href={`#/orden/${orden.id}/informe?tipo=recepcion`} icono={PrinterIcon}>Acta de recepción</Enlace>
        <Enlace href={`#/orden/${orden.id}/informe?tipo=tecnico`} icono={PrinterIcon}>Informe técnico</Enlace>
      </div>

      {orden.estado === 'listo' && admin && <Entrega orden={orden} onGuardado={onGuardado} />}

      <Seccion titulo="Cliente">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Dato k="Nombre" v={c.nombre} />
          <Dato k="NIT" v={c.nit} mono />
          <Dato k="Ciudad" v={c.ciudad} />
          <Dato k="Contacto" v={c.contacto} />
          <Dato k="Celular" v={c.telefono} mono />
        </dl>
      </Seccion>

      <Seccion titulo="Datos de placa">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Dato k="Marca" v={m.marca} />
          <Dato k="Serial" v={m.serial} mono />
          <Dato k="Potencia" v={m.hp ? `${fmtNum(m.hp)} HP · ${fmtNum(m.kw)} kW` : ''} mono />
          <Dato k="Velocidad" v={m.rpm ? `${m.rpm} rpm` : ''} mono />
          <Dato k="Voltaje" v={m.voltaje ? `${m.voltaje} V` : ''} mono />
          <Dato k="Corriente" v={m.amperaje ? `${fmtNum(m.amperaje)} A` : ''} mono />
          <Dato k="Conexión" v={m.conexion} mono />
          <Dato k="Fases" v={m.fases === 'trifasico' ? 'Trifásico' : m.fases === 'monofasico' ? 'Monofásico' : m.fases} />
          <Dato k="Rodamiento LA" v={m.rodamiento_la} mono />
          <Dato k="Rodamiento LOA" v={m.rodamiento_loa} mono />
          <Dato k="Frame" v={m.frame} mono />
        </dl>
      </Seccion>

      <Seccion titulo="Recepción">
        <dl className="grid gap-4">
          <Dato k="Fecha de ingreso" v={fmtFechaHora(orden.created)} />
          <div>
            <dt className="text-xs text-zinc-500">Motivo reportado</dt>
            <dd className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed">{orden.falla_reportada || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Accesorios recibidos</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">{(r.accesorios || []).length ? r.accesorios.map((a) => <Etiqueta key={a}>{a}</Etiqueta>) : '—'}</dd>
          </div>
          {r.estado_fisico && (
            <div>
              <dt className="text-xs text-zinc-500">Estado físico</dt>
              <dd className="mt-0.5 text-[15px] leading-relaxed">{r.estado_fisico}</dd>
            </div>
          )}
        </dl>
      </Seccion>

      {orden.estado === 'entregado' && (
        <Seccion titulo="Entrega">
          <dl className="grid grid-cols-2 gap-4">
            <Dato k="Recibió" v={orden.recibe_nombre} />
            <Dato k="Documento" v={orden.recibe_documento} mono />
            <Dato k="Fecha" v={fmtFecha(orden.estado_desde)} />
          </dl>
          {orden.firma && <img src={pb.files.getURL(orden, orden.firma)} alt={`Firma de ${orden.recibe_nombre}`} width={480} height={176} className="h-28 w-auto rounded-[10px] bg-white ring-1 ring-zinc-200" />}
        </Seccion>
      )}
    </div>
  )
}

function Entrega({ orden, onGuardado }) {
  const aviso = useAviso()
  const firma = useRef(null)
  const [nombre, setNombre] = useState(orden.expand?.cliente?.contacto || '')
  const [doc, setDoc] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const conforme = !!orden.pruebas?.pf_conforme

  async function entregar(e) {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre de quien recibe.')
    const blob = await firma.current.blob()
    if (!blob) return setError('Falta la firma de quien recibe.')
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.append('recibe_nombre', nombre.trim())
      fd.append('recibe_documento', doc.trim())
      fd.append('firma', new File([blob], 'firma.png', { type: 'image/png' }))
      fd.append('estado', 'entregado')
      const rec = await pb.collection('ordenes').update(orden.id, fd)
      onGuardado(rec)
      aviso(`OT ${orden.numero} entregada`)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={entregar} noValidate className="flex flex-col gap-4 rounded-[16px] bg-white p-5 ring-1 ring-zinc-200">
      <div className="flex items-start gap-3">
        <SignatureIcon className="mt-0.5 size-6 shrink-0 text-cobre-600" aria-hidden />
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Registrar entrega al cliente</h2>
          <p className="mt-0.5 text-sm text-zinc-500">{conforme ? 'Pruebas marcadas como conformes.' : 'Ojo: las pruebas no están marcadas como conformes.'}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Texto label="Nombre de quien recibe" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
        <Texto label="Cédula" inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} mono />
      </div>
      <Firma ref={firma} />
      <ErrorCaja error={error} />
      <Boton type="submit" variante="cobre" tam="lg" icono={CheckIcon} cargando={enviando}>Confirmar entrega</Boton>
    </form>
  )
}

function Historial({ orden }) {
  const carga = useCarga(() => pb.collection('eventos').getFullList({ filter: pb.filter('orden = {:o}', { o: orden.id }), sort: 'created', expand: 'usuario' }), [orden.id, orden.estado])
  if (carga.cargando && !carga.data) return <Cargando filas={3} />
  if (carga.error) return <ErrorCaja error={mensajeError(carga.error)} onReintentar={() => carga.recargar()} />
  const ev = carga.data
  return (
    <ol className="flex flex-col">
      {ev.map((e, i) => {
        const fin = ev[i + 1]?.created
        const dur = fin ? diasDesde(e.created) - diasDesde(fin) : diasDesde(e.created)
        return (
          <li key={e.id} className="relative flex gap-4 pb-6 pl-1 last:pb-0">
            <span className={cx('relative z-[1] mt-1 size-3 shrink-0 rounded-full ring-4 ring-zinc-100', i === ev.length - 1 ? 'bg-cobre-500' : 'bg-zinc-900')} aria-hidden />
            {i < ev.length - 1 && <span className="absolute left-[9px] top-4 h-full w-px bg-zinc-300" aria-hidden />}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{ETAPA[e.a]?.nombre || e.a}</p>
              <p className="text-sm text-zinc-500">
                {e.expand?.usuario?.name || 'Sistema'} · {fmtFechaHora(e.created)}
                {e.a !== 'entregado' && <span mono> · {fmtDuracion(dur)}{fin ? '' : ' y contando'}</span>}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
