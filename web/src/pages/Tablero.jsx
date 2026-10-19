import { useMemo } from 'react'
import { FileXlsIcon, LightningIcon, PlusIcon, KanbanIcon } from '@phosphor-icons/react'
import { pb, useCarga, useEnVivo, mensajeError } from '../lib/pb.js'
import { ESTADOS, ETAPA } from '../lib/flujo.js'
import { diasDesde, fmtDuracion, fmtNum, iniciales } from '../lib/fmt.js'
import { exportarOrdenes } from '../lib/excel.js'
import { useRuta, irReemplazar } from '../lib/ruta.js'
import { Boton, Enlace, Esqueleto, ErrorCaja, Vacio, cx } from '../ui.jsx'
import { nivelDias } from '../components/FilaOrden.jsx'

const inicioMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime() }
const t = (v) => new Date(String(v).replace(' ', 'T')).getTime()

export default function Tablero() {
  const { query } = useRuta()
  const tecnico = query.get('tecnico') || ''
  const { data, error, cargando, recargar } = useCarga(async () => {
    const [ordenes, tecnicos] = await Promise.all([
      pb.collection('ordenes').getFullList({ sort: 'estado_desde', expand: 'cliente,motor,tecnico' }),
      pb.collection('users').getFullList({ filter: "rol = 'tecnico'", sort: 'name' }),
    ])
    return { ordenes, tecnicos }
  })
  const enVivo = useEnVivo('ordenes', () => recargar(true))

  const vista = useMemo(() => {
    if (!data) return null
    const todas = data.ordenes.filter((o) => !tecnico || o.tecnico === tecnico)
    const abiertas = todas.filter((o) => o.estado !== 'entregado')
    const mes = inicioMes()
    const entregadasMes = todas.filter((o) => o.estado === 'entregado' && t(o.estado_desde) >= mes)
    const prom = entregadasMes.length
      ? entregadasMes.reduce((s, o) => s + (t(o.estado_desde) - t(o.created)) / 86400000, 0) / entregadasMes.length
      : NaN
    const columnas = ESTADOS.map((e) => ({
      e,
      items: e === 'entregado'
        ? todas.filter((o) => o.estado === e).sort((a, b) => t(b.estado_desde) - t(a.estado_desde)).slice(0, 8)
        : todas.filter((o) => o.estado === e).sort((a, b) => (b.prioridad === 'urgente') - (a.prioridad === 'urgente') || t(a.estado_desde) - t(b.estado_desde)),
    }))
    const porTecnico = data.tecnicos.map((u) => {
      const mias = data.ordenes.filter((o) => o.tecnico === u.id)
      return {
        u,
        activas: mias.filter((o) => o.estado !== 'entregado').length,
        porHacer: mias.filter((o) => ['recibido', 'diagnostico', 'reparacion', 'pruebas'].includes(o.estado)).length,
        atrasadas: mias.filter((o) => o.estado !== 'entregado' && diasDesde(o.estado_desde) > 3).length,
        entregadasMes: mias.filter((o) => o.estado === 'entregado' && t(o.estado_desde) >= mes).length,
      }
    })
    return {
      todas,
      columnas,
      porTecnico,
      kpi: [
        ['Abiertas', abiertas.length],
        ['Urgentes', abiertas.filter((o) => o.prioridad === 'urgente').length, 'mal'],
        ['Más de 3 días quietas', abiertas.filter((o) => diasDesde(o.estado_desde) > 3).length, 'alerta'],
        ['Esperando cliente', abiertas.filter((o) => o.estado === 'aprobacion').length],
        ['Listas para entregar', abiertas.filter((o) => o.estado === 'listo').length],
        ['Entregadas este mes', entregadasMes.length],
        ['Días promedio en taller', Number.isFinite(prom) ? fmtNum(Math.round(prom * 10) / 10) : '—'],
      ],
    }
  }, [data, tecnico])

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tablero del taller</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500" aria-live="polite">
            <span className={cx('size-2 rounded-full', enVivo ? 'bg-ok' : 'bg-zinc-400')} aria-hidden />
            {enVivo ? 'En vivo: se actualiza cuando un técnico avanza una orden' : 'Conectando…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="f-tecnico">Filtrar por técnico</label>
          <select
            id="f-tecnico"
            value={tecnico}
            onChange={(e) => irReemplazar(e.target.value ? `/?tecnico=${e.target.value}` : '/')}
            className="h-10 rounded-[9px] bg-white px-3 text-sm ring-1 ring-inset ring-zinc-300 focus:outline-none focus:ring-2 focus:ring-cobre-500"
          >
            <option value="">Todos los técnicos</option>
            {(data?.tecnicos || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Boton variante="secundario" tam="sm" icono={FileXlsIcon} disabled={!vista?.todas.length} onClick={() => exportarOrdenes(vista.todas)}>Excel</Boton>
          <Enlace href="#/nueva" variante="cobre" tam="sm" icono={PlusIcon}>Recepción</Enlace>
        </div>
      </div>

      <ErrorCaja error={error && mensajeError(error)} onReintentar={() => recargar()} />

      {/* KPIs: cockpit, sin tarjetas, separados por lineas */}
      <dl className="grid grid-cols-2 divide-zinc-200 border-y border-zinc-200 sm:grid-cols-4 lg:grid-cols-7 lg:divide-x">
        {(vista?.kpi || Array.from({ length: 7 }, (_, i) => [i])).map(([k, v, nivel]) => (
          <div key={k} className="flex flex-col gap-1 px-3 py-3 lg:px-4">
            {vista ? (
              <>
                <dt className="truncate text-xs text-zinc-500">{k}</dt>
                <dd className={cx('num text-2xl font-semibold leading-none', nivel && v > 0 ? (nivel === 'mal' ? 'text-mal' : 'text-alerta') : 'text-zinc-900')}>{v}</dd>
              </>
            ) : (
              <>
                <Esqueleto className="h-3 w-20" />
                <Esqueleto className="h-6 w-10" />
              </>
            )}
          </div>
        ))}
      </dl>

      {cargando && !data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Esqueleto key={i} className="h-64" />)}
        </div>
      )}

      {vista && vista.todas.length === 0 && (
        <Vacio icono={KanbanIcon} titulo="El tablero está vacío" texto="Cada motor que se reciba aparece en la columna Recibido y avanza solo cuando el técnico termina su etapa.">
          <Enlace href="#/nueva" variante="cobre" icono={PlusIcon}>Registrar un motor</Enlace>
        </Vacio>
      )}

      {vista && vista.todas.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
          <div className="grid w-max auto-cols-[248px] grid-flow-col gap-4">
            {vista.columnas.map(({ e, items }) => (
              <section key={e} className="flex min-w-0 flex-col" aria-label={ETAPA[e].nombre}>
                <h2 className="flex items-center justify-between border-b-2 border-zinc-900 pb-2 text-sm font-semibold">
                  <span>{ETAPA[e].nombre}</span>
                  <span className="num text-zinc-500">{e === 'entregado' ? `${items.length} recientes` : items.length}</span>
                </h2>
                {items.length === 0 ? (
                  <p className="py-4 text-sm text-zinc-400">Sin órdenes</p>
                ) : (
                  <ul className="divide-y divide-zinc-200">
                    {items.map((o) => {
                      const d = diasDesde(o.estado_desde)
                      const n = e === 'entregado' ? null : nivelDias(d)
                      const m = o.expand?.motor || {}
                      return (
                        <li key={o.id}>
                          <a href={`#/orden/${o.id}`} className="group -mx-2 flex flex-col gap-1 rounded-[8px] px-2 py-2.5 transition-[background-color] duration-150 hover:bg-white">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5">
                                <span className="num text-[15px] font-semibold">{o.numero}</span>
                                {o.prioridad === 'urgente' && <LightningIcon className="size-3.5 text-mal" weight="fill" aria-label="Urgente" />}
                              </span>
                              <span className={cx('num text-xs', n === 'mal' ? 'font-semibold text-mal' : n === 'alerta' ? 'font-semibold text-alerta' : 'text-zinc-500')}>
                                {fmtDuracion(d)}
                              </span>
                            </div>
                            <span className="truncate text-sm font-medium text-zinc-800">{o.expand?.cliente?.nombre}</span>
                            <span className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                              <span className="num truncate">{[m.marca, m.hp && `${fmtNum(m.hp)} HP`, m.rpm].filter(Boolean).join(' · ')}</span>
                              <span title={o.expand?.tecnico?.name} className="grid size-6 shrink-0 place-items-center rounded-md bg-zinc-200 text-[10px] font-semibold text-zinc-700">
                                {iniciales(o.expand?.tecnico?.name) || '—'}
                              </span>
                            </span>
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      )}

      {vista && vista.porTecnico.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Carga por técnico</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-zinc-300 text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Técnico</th>
                  <th className="py-2 pr-4 text-right font-medium">Activas</th>
                  <th className="py-2 pr-4 text-right font-medium">Le toca avanzar</th>
                  <th className="py-2 pr-4 text-right font-medium">Más de 3 días</th>
                  <th className="py-2 text-right font-medium">Entregadas este mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {vista.porTecnico.map(({ u, activas, porHacer, atrasadas, entregadasMes }) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-4">
                      <a href={`#/?tecnico=${u.id}`} className="font-medium hover:underline">{u.name}</a>
                    </td>
                    <td className="num py-2.5 pr-4 text-right">{activas}</td>
                    <td className="num py-2.5 pr-4 text-right">{porHacer}</td>
                    <td className={cx('num py-2.5 pr-4 text-right', atrasadas && 'font-semibold text-alerta')}>{atrasadas}</td>
                    <td className="num py-2.5 text-right">{entregadasMes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
