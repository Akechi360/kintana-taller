import { SpiralIcon } from '@phosphor-icons/react'
import { fmtFecha, fmtNum } from '../lib/fmt.js'
import { Boton, Vacio } from '../ui.jsx'

export async function buscarRecetas(pb, { ranuras, di, largo }) {
  const p = new URLSearchParams()
  if (ranuras) p.set('ranuras', String(ranuras).replace(',', '.'))
  if (di) p.set('di', String(di).replace(',', '.'))
  if (largo) p.set('largo', String(largo).replace(',', '.'))
  return pb.send(`/api/kintana/recetas?${p}`, { method: 'GET' })
}

export function ListaRecetas({ recetas, onUsar, excluirOrden }) {
  const lista = (recetas || []).filter((r) => r.orden !== excluirOrden)
  if (!lista.length) {
    return <Vacio icono={SpiralIcon} titulo="No hay recetas con esas medidas" texto="Cada ficha de bobinado que se llene queda guardada aquí para el próximo motor igual." />
  }
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-[12px] ring-1 ring-zinc-200">
      {lista.map((r) => {
        const b = r.bobinado
        return (
          <li key={r.orden} className="flex flex-col gap-3 bg-white px-4 py-4">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <p className="font-semibold">
                {[r.motor.marca, r.motor.hp && `${fmtNum(r.motor.hp)} HP`, r.motor.rpm && `${r.motor.rpm} rpm`].filter(Boolean).join(' · ') || 'Motor sin datos'}
              </p>
              <span className="num text-sm text-zinc-500 sm:shrink-0">OT {r.orden} · {fmtFecha(r.fecha)}</span>
            </div>
            <dl className="num grid grid-cols-3 gap-x-4 gap-y-2 text-sm sm:grid-cols-6">
              {[
                ['Ranuras', b.ranuras], ['Paso', b.paso], ['Espiras', b.espiras], ['Hilos', b.hilos], ['Calibre', b.calibre], ['Conexión', b.conexion],
                ['Ø int.', b.diametro_interno && `${b.diametro_interno} cm`], ['Largo', b.largo && `${b.largo} cm`], ['Alambre', b.peso_kg && `${b.peso_kg} kg`],
              ].map(([k, val]) => (
                <div key={k} className="min-w-0">
                  <dt className="font-sans text-xs text-zinc-500">{k}</dt>
                  <dd className="truncate font-medium text-zinc-900">{val || '—'}</dd>
                </div>
              ))}
            </dl>
            {onUsar && <Boton variante="secundario" tam="sm" className="self-start" onClick={() => onUsar(r)}>Copiar a esta ficha</Boton>}
          </li>
        )
      })}
    </ul>
  )
}
