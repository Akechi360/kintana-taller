import { useEffect, useRef, useState } from 'react'
import { CameraIcon, ImagesIcon, TrashIcon, ImageIcon } from '@phosphor-icons/react'
import { comprimir } from '../lib/img.js'
import { cx, Boton } from '../ui.jsx'

export const TIPOS_FOTO = ['Placa', 'Vista general', 'Bornera', 'Eje / acople', 'Rodamientos', 'Devanado', 'Daño', 'Megger', 'Otra']

// Toma o elige fotos, las comprime en el telefono y las entrega con su etiqueta.
export function SelectorFotos({ onAgregar, ocupado }) {
  const camara = useRef(null)
  const galeria = useRef(null)
  const [procesando, setProcesando] = useState(false)

  async function alElegir(e) {
    const archivos = Array.from(e.target.files || [])
    e.target.value = ''
    if (!archivos.length) return
    setProcesando(true)
    try {
      const listas = []
      for (const f of archivos) listas.push(await comprimir(f))
      onAgregar(listas)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <input ref={camara} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={alElegir} aria-hidden />
      <input ref={galeria} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={alElegir} aria-hidden />
      <Boton variante="primario" tam="lg" icono={CameraIcon} cargando={procesando} disabled={ocupado} onClick={() => camara.current.click()}>
        {procesando ? 'Preparando…' : 'Tomar foto'}
      </Boton>
      <Boton variante="secundario" tam="lg" icono={ImagesIcon} disabled={procesando || ocupado} onClick={() => galeria.current.click()}>
        Galería
      </Boton>
    </div>
  )
}

// Vista previa de fotos locales (aun no subidas) con etiqueta editable.
export function FotosLocales({ fotos, onCambiar, onQuitar }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fotos.map((f, i) => (
        <li key={f.id} className="flex flex-col gap-2">
          <div className="relative overflow-hidden rounded-[12px] bg-zinc-200 ring-1 ring-zinc-200">
            <Miniatura file={f.file} alt={`Foto ${i + 1}: ${f.nota || 'sin etiqueta'}`} />
            {f.estado === 'error' && <span className="absolute inset-x-0 bottom-0 bg-mal px-2 py-1 text-xs font-semibold text-white">No se subió</span>}
            {f.estado === 'subiendo' && <span className="absolute inset-x-0 bottom-0 bg-zinc-900/80 px-2 py-1 text-xs font-semibold text-white">Subiendo…</span>}
            {f.estado === 'ok' && <span className="absolute inset-x-0 bottom-0 bg-ok px-2 py-1 text-xs font-semibold text-white">Subida</span>}
            {!f.estado && (
              <button
                type="button"
                onClick={() => onQuitar(f.id)}
                aria-label={`Quitar foto ${i + 1}`}
                className="absolute right-1.5 top-1.5 grid size-10 place-items-center rounded-[10px] bg-white/90 text-zinc-700 shadow-sm hover:bg-white hover:text-mal"
              >
                <TrashIcon className="size-5" aria-hidden />
              </button>
            )}
          </div>
          <label className="sr-only" htmlFor={`nota-${f.id}`}>Etiqueta de la foto {i + 1}</label>
          <select
            id={`nota-${f.id}`}
            value={f.nota}
            onChange={(e) => onCambiar(f.id, e.target.value)}
            className="h-11 w-full rounded-[10px] bg-white px-2.5 text-[15px] ring-1 ring-inset ring-zinc-300 focus:outline-none focus:ring-2 focus:ring-cobre-500"
          >
            <option value="">Etiqueta…</option>
            {TIPOS_FOTO.map((t) => <option key={t}>{t}</option>)}
          </select>
        </li>
      ))}
    </ul>
  )
}

function Miniatura({ file, alt }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
    ? <img src={url} alt={alt} width={480} height={360} className="aspect-[4/3] w-full object-cover" />
    : <div className="grid aspect-[4/3] place-items-center text-zinc-400"><ImageIcon className="size-8" aria-hidden /></div>
}

export function GaleriaVacia({ texto }) {
  return (
    <div className={cx('flex items-center gap-3 rounded-[12px] border border-dashed border-zinc-300 bg-white/60 px-4 py-5 text-[15px] text-zinc-600')}>
      <ImageIcon className="size-6 shrink-0 text-zinc-400" aria-hidden />
      {texto}
    </div>
  )
}
