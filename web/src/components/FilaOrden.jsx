import { CaretRightIcon, LightningIcon } from '@phosphor-icons/react'
import { ETAPA } from '../lib/flujo.js'
import { diasDesde, fmtDuracion, motorCorto } from '../lib/fmt.js'
import { Etiqueta, cx } from '../ui.jsx'

export const nivelDias = (d) => (d > 7 ? 'mal' : d > 3 ? 'alerta' : null)

export function FilaOrden({ o }) {
  const dias = diasDesde(o.estado_desde)
  return (
    <a
      href={`#/orden/${o.id}`}
      className="group flex items-center gap-4 bg-white px-4 py-4 [contain-intrinsic-size:auto_104px] [content-visibility:auto] transition-[background-color] duration-150 hover:bg-zinc-50 active:bg-zinc-100"
    >
      <div className="flex w-16 shrink-0 flex-col items-start gap-1">
        <span className="num text-[17px] font-semibold text-zinc-900">{o.numero}</span>
        {o.prioridad === 'urgente' && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wide text-mal">
            <LightningIcon className="size-3" weight="fill" aria-hidden />
            Urgente
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-zinc-900">{o.expand?.cliente?.nombre || 'Sin cliente'}</p>
        <p className="truncate text-sm text-zinc-600">{motorCorto(o.expand?.motor)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Etiqueta nivel={o.estado === 'entregado' ? 'ok' : 'neutro'}>{ETAPA[o.estado]?.nombre}</Etiqueta>
          {o.estado !== 'entregado' && (
            <span className={cx('num text-xs', nivelDias(dias) === 'mal' ? 'text-mal' : nivelDias(dias) === 'alerta' ? 'text-alerta' : 'text-zinc-500')}>
              {fmtDuracion(dias)} en etapa
            </span>
          )}
        </div>
      </div>
      <CaretRightIcon className="size-5 shrink-0 text-zinc-400 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
    </a>
  )
}
