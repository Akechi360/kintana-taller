import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { CheckIcon, CloudSlashIcon, CircleNotchIcon, WarningIcon, XIcon } from '@phosphor-icons/react'

export const cx = (...c) => c.filter(Boolean).join(' ')
const nombreCampo = (l) => (typeof l === 'string' ? l.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : undefined)

// Marca de la empresa (fabrica con chimenea), tomada de public/logo-kintana.svg.
export function MarcaKintana({ className = '' }) {
  const id = 'k' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox="58 28 520 352" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {[['0', '#8b5ca0'], ['0.14', '#8b5ca0'], ['0.141', '#765898'], ['0.28', '#765898'], ['0.281', '#8d5b9e'], ['0.42', '#8d5b9e'], ['0.421', '#695a96'], ['0.57', '#695a96'], ['0.571', '#8d5b9e'], ['0.71', '#8d5b9e'], ['0.711', '#625894'], ['0.85', '#625894'], ['0.851', '#8b5ca0'], ['1', '#8b5ca0']]
            .map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
      </defs>
      <path d="M162 142C188 92 235 88 295 82C340 77 372 60 402 36C396 76 368 102 312 108C252 114 205 116 162 142Z" fill="#5a4946" stroke="#3e312f" strokeWidth="3" strokeLinejoin="round" />
      <path fillRule="evenodd" fill={`url(#${id})`} stroke="#52437a" strokeWidth="3.5" d="M68 350L104 350L116 155L172 155L164 350L216 350L234 226L348 152L345 186L458 112L455 148L562 76L542 350L572 350L572 372L68 372ZM258 350L270 250L322 215L310 350ZM366 350L378 210L432 174L420 350ZM474 350L486 170L534 136L522 350Z" />
    </svg>
  )
}

export function Logo({ className = '', sub = true }) {
  return (
    <span className={cx('inline-flex select-none items-center gap-2.5 leading-none', className)} translate="no">
      <MarcaKintana className="h-[1.9em] w-auto shrink-0" />
      <span className="flex flex-col">
        <span className="font-black italic tracking-[0.04em] text-marca-700">KINTANA</span>
        {sub && <span className="mt-1 text-[10px] font-semibold tracking-[0.02em] text-zinc-600">Electro-Automatización Industrial S.A.S</span>}
      </span>
    </span>
  )
}

const VARIANTES = {
  primario: 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-400',
  marca: 'bg-marca-600 text-white hover:bg-marca-700 disabled:bg-marca-100 disabled:text-marca-600',
  secundario: 'bg-white text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 hover:ring-zinc-400 disabled:text-zinc-400',
  fantasma: 'text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-900 disabled:text-zinc-400',
  peligro: 'bg-white text-mal ring-1 ring-inset ring-mal/30 hover:bg-mal-bg',
}
const TAMANOS = { sm: 'h-9 px-3 text-sm gap-1.5', md: 'h-11 px-4 text-[15px] gap-2', lg: 'h-14 px-5 text-base gap-2.5' }

export function Boton({ variante = 'primario', tam = 'md', icono: Icono, cargando, children, className = '', type = 'button', ...p }) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-[10px] font-medium transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTES[variante], TAMANOS[tam], className,
      )}
      disabled={cargando || p.disabled}
      aria-busy={cargando || undefined}
      {...p}
    >
      {cargando ? <CircleNotchIcon className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : Icono && <Icono className="size-5" weight="bold" aria-hidden />}
      {children}
    </button>
  )
}

export function Enlace({ href, children, className = '', variante = 'secundario', tam = 'md', icono: Icono }) {
  return (
    <a href={href} className={cx('inline-flex shrink-0 items-center justify-center rounded-[10px] font-medium transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98]', VARIANTES[variante], TAMANOS[tam], className)}>
      {Icono && <Icono className="size-5" weight="bold" aria-hidden />}
      {children}
    </a>
  )
}

const inputBase =
  'w-full rounded-[10px] bg-white px-3.5 text-base text-zinc-900 ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 transition-[box-shadow] duration-150 hover:ring-zinc-400 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-marca-500 aria-[invalid=true]:ring-mal'

export function Campo({ label, ayuda, error, children, className = '', unidad }) {
  const id = useId()
  const hijo = typeof children === 'function' ? children({ id, invalid: !!error, describedBy: ayuda || error ? `${id}-a` : undefined }) : children
  return (
    <div className={cx('flex min-w-0 flex-col gap-2', className)}>
      {label && (
        <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-zinc-700">
          <span className="truncate">{label}</span>
          {unidad && <span className="num text-xs font-normal text-zinc-500">{unidad}</span>}
        </label>
      )}
      {hijo}
      {(error || ayuda) && (
        <p id={`${id}-a`} className={cx('text-[13px] leading-snug', error ? 'text-mal' : 'text-zinc-500')}>
          {error || ayuda}
        </p>
      )}
    </div>
  )
}

export function Texto({ label, ayuda, error, unidad, className = '', alto = 'h-12', mono, ...p }) {
  return (
    <Campo label={label} ayuda={ayuda} error={error} unidad={unidad} className={className}>
      {({ id, invalid, describedBy }) => (
        <input id={id} name={nombreCampo(label)} aria-invalid={invalid} aria-describedby={describedBy} autoComplete="off" className={cx(inputBase, alto, mono && 'num')} {...p} />
      )}
    </Campo>
  )
}

// Campo numerico tolerante a coma decimal (teclado colombiano).
export function Numero({ valor, onValor, decimales = true, ...p }) {
  return (
    <Texto
      inputMode={decimales ? 'decimal' : 'numeric'}
      value={valor ?? ''}
      onChange={(e) => onValor(e.target.value.replace(/[^0-9.,-]/g, ''))}
      mono
      {...p}
    />
  )
}

export function AreaTexto({ label, ayuda, error, className = '', ...p }) {
  return (
    <Campo label={label} ayuda={ayuda} error={error} className={className}>
      {({ id, invalid, describedBy }) => (
        <textarea id={id} name={nombreCampo(label)} aria-invalid={invalid} aria-describedby={describedBy} autoComplete="off" rows={4} className={cx(inputBase, 'min-h-28 py-3 leading-relaxed')} {...p} />
      )}
    </Campo>
  )
}

export function Selector({ label, ayuda, error, className = '', children, ...p }) {
  return (
    <Campo label={label} ayuda={ayuda} error={error} className={className}>
      {({ id, invalid, describedBy }) => (
        <select id={id} name={nombreCampo(label)} aria-invalid={invalid} aria-describedby={describedBy} className={cx(inputBase, 'h-12 pr-8')} {...p}>
          {children}
        </select>
      )}
    </Campo>
  )
}

const TONO_SEL = {
  ok: 'bg-ok text-white ring-ok',
  alerta: 'bg-alerta text-white ring-alerta',
  mal: 'bg-mal text-white ring-mal',
  neutro: 'bg-zinc-900 text-white ring-zinc-900',
}

// Control de un toque: [{ v, l, tono }]. Tocar la opcion activa la desmarca.
export function Segmentado({ label, opciones, valor, onChange, className = '', tam = 'md', columnas }) {
  const id = useId()
  return (
    <div className={cx('flex min-w-0 flex-col gap-2', className)} role="radiogroup" aria-labelledby={label ? id : undefined}>
      {label && <span id={id} className="text-sm font-medium text-zinc-700">{label}</span>}
      <div className={cx('grid gap-1 rounded-[12px] bg-zinc-200/70 p-1', columnas === 2 ? 'grid-cols-2 sm:grid-cols-4' : 'auto-cols-fr grid-flow-col')}>
        {opciones.map((o) => {
          const activo = valor === o.v
          return (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onChange(activo ? '' : o.v)}
              className={cx(
                'min-w-0 truncate rounded-[9px] px-2 font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97]',
                tam === 'sm' ? 'h-9 text-sm' : 'h-11 text-[15px]',
                activo ? TONO_SEL[o.tono || 'neutro'] + ' shadow-[0_1px_2px_rgb(24_24_27/0.18)]' : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900',
              )}
            >
              {o.l}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Chips({ label, opciones, valores = [], onChange, className = '' }) {
  const id = useId()
  const toggle = (v) => onChange(valores.includes(v) ? valores.filter((x) => x !== v) : [...valores, v])
  return (
    <fieldset className={cx('flex min-w-0 flex-col gap-2', className)} aria-labelledby={id}>
      {label && <legend id={id} className="mb-2 text-sm font-medium text-zinc-700">{label}</legend>}
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const activo = valores.includes(o.v)
          return (
            <button
              key={o.v}
              type="button"
              aria-pressed={activo}
              onClick={() => toggle(o.v)}
              className={cx(
                'inline-flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 text-[15px] font-medium ring-1 ring-inset transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97]',
                activo ? 'bg-marca-50 text-marca-700 ring-marca-500' : 'bg-white text-zinc-700 ring-zinc-300 hover:ring-zinc-400',
              )}
            >
              {activo && <CheckIcon className="size-4" weight="bold" aria-hidden />}
              {o.l}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const NIVEL = {
  ok: 'bg-ok-bg text-ok',
  alerta: 'bg-alerta-bg text-alerta',
  mal: 'bg-mal-bg text-mal',
  neutro: 'bg-zinc-200/70 text-zinc-700',
  marca: 'bg-marca-50 text-marca-700',
}
export function Etiqueta({ nivel = 'neutro', children, className = '' }) {
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold', NIVEL[nivel || 'neutro'], className)}>
      {children}
    </span>
  )
}

// Resultado de un calculo con semaforo.
export function Lectura({ titulo, valor, unidad, nivel, detalle }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1 rounded-[10px] px-3 py-2.5', nivel ? NIVEL[nivel] : 'bg-zinc-100 text-zinc-700')}>
      <span className="truncate text-xs font-medium opacity-80">{titulo}</span>
      <span className="num text-lg font-semibold leading-none">
        {valor}
        {unidad && <span className="ml-1 text-xs font-medium opacity-70">{unidad}</span>}
      </span>
      {detalle && <span className="text-xs leading-snug opacity-80">{detalle}</span>}
    </div>
  )
}

export function Esqueleto({ className = '' }) {
  return <div className={cx('skeleton', className)} aria-hidden />
}

export function Cargando({ filas = 4 }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Cargando…">
      {Array.from({ length: filas }, (_, i) => <Esqueleto key={i} className="h-16 w-full" />)}
    </div>
  )
}

export function Vacio({ icono: Icono, titulo, texto, children }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] border border-dashed border-zinc-300 bg-white/60 px-5 py-8">
      {Icono && (
        <span className="grid size-11 place-items-center rounded-[10px] bg-zinc-200/70 text-zinc-600">
          <Icono className="size-6" aria-hidden />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-zinc-900">{titulo}</p>
        {texto && <p className="max-w-[52ch] text-[15px] leading-relaxed text-zinc-600">{texto}</p>}
      </div>
      {children}
    </div>
  )
}

export function ErrorCaja({ error, onReintentar }) {
  if (!error) return null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-[12px] bg-mal-bg px-4 py-3 text-mal">
      <WarningIcon className="mt-0.5 size-5 shrink-0" weight="bold" aria-hidden />
      <p className="flex-1 text-[15px] leading-snug">{error}</p>
      {onReintentar && (
        <button type="button" onClick={onReintentar} className="shrink-0 text-sm font-semibold underline underline-offset-2 hover:no-underline">
          Reintentar
        </button>
      )}
    </div>
  )
}

export function EstadoGuardado({ estado }) {
  const mapa = {
    guardado: { t: 'Guardado', i: CheckIcon, c: 'text-ok' },
    escribiendo: { t: 'Guardando…', i: CircleNotchIcon, c: 'text-zinc-500', spin: true },
    guardando: { t: 'Guardando…', i: CircleNotchIcon, c: 'text-zinc-500', spin: true },
    pendiente: { t: 'Sin conexión: guardado en este teléfono, reintentando', i: CloudSlashIcon, c: 'text-alerta' },
  }
  const m = mapa[estado] || mapa.guardado
  const I = m.i
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-right text-[13px] font-medium', m.c)} aria-live="polite">
      <I className={cx('size-4 shrink-0', m.spin && 'animate-spin motion-reduce:animate-none')} weight="bold" aria-hidden />
      {m.t}
    </span>
  )
}

export function Seccion({ titulo, descripcion, accion, children, className = '' }) {
  return (
    <section className={cx('flex flex-col gap-4 border-t border-zinc-200 pt-6 first:border-t-0 first:pt-0', className)}>
      {(titulo || accion) && (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {titulo && <h2 className="text-[17px] font-semibold tracking-tight text-zinc-900">{titulo}</h2>}
            {descripcion && <p className="mt-1 text-sm leading-snug text-zinc-500">{descripcion}</p>}
          </div>
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

// Dialogo nativo: foco atrapado, Esc para cerrar.
export function Dialogo({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])
  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()}
      className={cx('m-auto w-[calc(100%-2rem)] rounded-[16px] bg-white p-0 text-zinc-900 shadow-[0_24px_60px_-20px_rgb(24_24_27/0.35)] backdrop:bg-zinc-900/50 overscroll-contain', ancho)}
    >
      {abierto && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <h2 className="text-[17px] font-semibold tracking-tight">{titulo}</h2>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-10 place-items-center rounded-[10px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              <XIcon className="size-5" weight="bold" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}

const ToastCtx = createContext(() => {})
export const useAviso = () => useContext(ToastCtx)

export function ProveedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([])
  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setAvisos((a) => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'mal' ? 7000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {avisos.map((a) => (
          <div
            key={a.id}
            className={cx(
              'pointer-events-auto flex max-w-md items-center gap-2 rounded-[12px] px-4 py-3 text-[15px] font-medium shadow-[0_12px_32px_-12px_rgb(24_24_27/0.45)]',
              a.tipo === 'mal' ? 'bg-mal text-white' : 'bg-zinc-900 text-white',
            )}
          >
            {a.tipo === 'mal' ? <WarningIcon className="size-5 shrink-0" weight="bold" aria-hidden /> : <CheckIcon className="size-5 shrink-0" weight="bold" aria-hidden />}
            {a.texto}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
