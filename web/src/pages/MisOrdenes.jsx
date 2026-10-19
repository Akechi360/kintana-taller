import { useMemo } from 'react'
import { ClipboardTextIcon, FileXlsIcon, MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react'
import { pb, useCarga, useEnVivo, esAdmin, mensajeError } from '../lib/pb.js'
import { ETAPA, ESTADOS, tecnicoPuedeAvanzar } from '../lib/flujo.js'
import { exportarOrdenes } from '../lib/excel.js'
import { useRuta, irReemplazar } from '../lib/ruta.js'
import { Boton, Enlace, Cargando, Vacio, ErrorCaja, cx } from '../ui.jsx'
import { FilaOrden } from '../components/FilaOrden.jsx'

const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function MisOrdenes() {
  const admin = esAdmin()
  const { query } = useRuta()
  const q = query.get('q') || ''
  const estado = query.get('estado') || ''
  const { data, error, cargando, recargar } = useCarga(() =>
    pb.collection('ordenes').getFullList({ sort: '-updated', expand: 'cliente,motor,tecnico' }),
  )
  useEnVivo('ordenes', () => recargar(true))

  const filtradas = useMemo(() => {
    const t = normal(q)
    return (data || []).filter((o) => {
      if (estado && o.estado !== estado) return false
      if (!t) return true
      const m = o.expand?.motor || {}
      return normal([o.numero, o.expand?.cliente?.nombre, m.marca, m.serial, m.hp, o.expand?.tecnico?.name].join(' ')).includes(t)
    })
  }, [data, q, estado])

  const setFiltro = (k, v) => {
    const p = new URLSearchParams(query)
    v ? p.set(k, v) : p.delete(k)
    irReemplazar(`/ordenes${p.toString() ? `?${p}` : ''}`)
  }

  const grupos = admin
    ? [{ t: '', items: filtradas }]
    : [
        { t: 'Te toca', d: 'Órdenes que puedes avanzar ahora', items: filtradas.filter((o) => tecnicoPuedeAvanzar(o.estado)) },
        { t: 'En administración', d: 'Cotización, aprobación del cliente o entrega', items: filtradas.filter((o) => ['cotizacion', 'aprobacion', 'listo'].includes(o.estado)) },
        { t: 'Entregadas', items: filtradas.filter((o) => o.estado === 'entregado').slice(0, 15) },
      ]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{admin ? 'Órdenes de trabajo' : 'Mis órdenes'}</h1>
          <p className="mt-1 text-[15px] text-zinc-600">
            {data ? `${data.filter((o) => o.estado !== 'entregado').length} abiertas` : 'Cargando…'}
          </p>
        </div>
        <div className="flex gap-2">
          {admin && (
            <Boton variante="secundario" icono={FileXlsIcon} disabled={!filtradas.length} onClick={() => exportarOrdenes(filtradas)}>
              Exportar a Excel
            </Boton>
          )}
          <Enlace href="#/nueva" variante="cobre" icono={PlusIcon} className="max-sm:hidden">
            Nueva recepción
          </Enlace>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
        <label className="relative">
          <span className="sr-only">Buscar órdenes</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            defaultValue={q}
            onChange={(e) => setFiltro('q', e.target.value)}
            placeholder="OT, cliente, marca, serial…"
            autoComplete="off"
            className="h-12 w-full rounded-[10px] bg-white pl-11 pr-3 text-base ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:outline-none focus:ring-2 focus:ring-cobre-500"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por etapa</span>
          <select
            value={estado}
            onChange={(e) => setFiltro('estado', e.target.value)}
            className="h-12 w-full rounded-[10px] bg-white px-3 text-base ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:outline-none focus:ring-2 focus:ring-cobre-500"
          >
            <option value="">Todas las etapas</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{ETAPA[e].nombre}</option>)}
          </select>
        </label>
      </div>

      <ErrorCaja error={error && mensajeError(error)} onReintentar={() => recargar()} />
      {cargando && !data && <Cargando />}

      {data && data.length === 0 && (
        <Vacio icono={ClipboardTextIcon} titulo="Todavía no hay órdenes" texto="Cuando llegue un motor, regístralo con sus fotos y datos de placa. La orden aparecerá aquí con su consecutivo.">
          <Enlace href="#/nueva" variante="cobre" icono={PlusIcon}>Registrar primer motor</Enlace>
        </Vacio>
      )}
      {data && data.length > 0 && filtradas.length === 0 && (
        <Vacio icono={MagnifyingGlassIcon} titulo="Sin resultados" texto="Prueba con otro número de OT, nombre de cliente o marca." />
      )}

      {data && filtradas.length > 0 && grupos.map((g) => (g.items.length > 0 || !g.t) && (
        <section key={g.t || 'todas'} className="flex flex-col gap-3">
          {g.t && (
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-zinc-900">{g.t} <span className="num ml-1 text-zinc-500">{g.items.length}</span></h2>
              {g.d && <p className="truncate text-sm text-zinc-500">{g.d}</p>}
            </div>
          )}
          <div className={cx('overflow-hidden rounded-[14px] ring-1 ring-zinc-200 divide-y divide-zinc-200')}>
            {g.items.map((o) => <FilaOrden key={o.id} o={o} />)}
          </div>
        </section>
      ))}

    </div>
  )
}
