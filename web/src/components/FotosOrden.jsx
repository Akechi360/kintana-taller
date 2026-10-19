import { useState } from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import { pb, useCarga, useEnVivo, fotoUrl, subirFoto, mensajeError, esAdmin } from '../lib/pb.js'
import { ETAPA, ESTADOS } from '../lib/flujo.js'
import { fmtFechaHora } from '../lib/fmt.js'
import { Boton, Cargando, Dialogo, ErrorCaja, Seccion, useAviso } from '../ui.jsx'
import { SelectorFotos, FotosLocales, GaleriaVacia } from './Fotos.jsx'

const uid = () => Math.random().toString(36).slice(2, 10)

export default function FotosOrden({ orden }) {
  const aviso = useAviso()
  const carga = useCarga(() => pb.collection('fotos').getFullList({ filter: pb.filter('orden = {:o}', { o: orden.id }), sort: 'created', expand: 'autor' }), [orden.id])
  useEnVivo('fotos', () => carga.recargar(true))
  const [pendientes, setPendientes] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [ver, setVer] = useState(null)
  const [borrar, setBorrar] = useState(null)
  const [error, setError] = useState('')
  const yo = pb.authStore.record?.id

  async function subir(lista) {
    setSubiendo(true)
    let fallas = 0
    for (const f of lista) {
      setPendientes((ps) => ps.map((x) => (x.id === f.id ? { ...x, estado: 'subiendo' } : x)))
      try {
        await subirFoto(orden.id, f.file, f.nota)
        setPendientes((ps) => ps.filter((x) => x.id !== f.id))
      } catch {
        fallas++
        setPendientes((ps) => ps.map((x) => (x.id === f.id ? { ...x, estado: 'error' } : x)))
      }
    }
    setSubiendo(false)
    carga.recargar(true)
    if (fallas) aviso(`${fallas} foto${fallas > 1 ? 's' : ''} sin subir. Toca Reintentar.`, 'mal')
    else aviso('Fotos guardadas')
  }

  async function confirmarBorrado() {
    try {
      await pb.collection('fotos').delete(borrar.id)
      setBorrar(null)
      carga.recargar(true)
      aviso('Foto eliminada')
    } catch (e) {
      setError(mensajeError(e))
      setBorrar(null)
    }
  }

  const porEtapa = ESTADOS.map((e) => ({ e, fotos: (carga.data || []).filter((f) => f.etapa === e) })).filter((g) => g.fotos.length)

  return (
    <div className="flex flex-col gap-8">
      <Seccion titulo="Agregar fotos" descripcion={`Quedan en la etapa actual: ${ETAPA[orden.estado]?.nombre}.`}>
        <SelectorFotos
          ocupado={subiendo}
          onAgregar={(files) => {
            const nuevas = files.map((file) => ({ id: uid(), file, nota: '' }))
            setPendientes((ps) => [...ps, ...nuevas])
          }}
        />
        {pendientes.length > 0 && (
          <>
            <FotosLocales
              fotos={pendientes}
              onCambiar={(id, nota) => setPendientes((ps) => ps.map((f) => (f.id === id ? { ...f, nota } : f)))}
              onQuitar={(id) => setPendientes((ps) => ps.filter((f) => f.id !== id))}
            />
            <Boton variante="marca" tam="lg" cargando={subiendo} onClick={() => subir(pendientes)}>
              {subiendo ? 'Subiendo…' : pendientes.some((p) => p.estado === 'error') ? 'Reintentar' : `Subir ${pendientes.length} foto${pendientes.length > 1 ? 's' : ''}`}
            </Boton>
          </>
        )}
      </Seccion>

      <ErrorCaja error={error} />
      <ErrorCaja error={carga.error && mensajeError(carga.error)} onReintentar={() => carga.recargar()} />
      {carga.cargando && !carga.data && <Cargando filas={2} />}
      {carga.data && carga.data.length === 0 && pendientes.length === 0 && <GaleriaVacia texto="Esta orden no tiene fotos. Toma la de la placa primero." />}

      {porEtapa.map((g) => (
        <Seccion key={g.e} titulo={`${ETAPA[g.e].nombre}`} descripcion={`${g.fotos.length} foto${g.fotos.length > 1 ? 's' : ''}`}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.fotos.map((f) => (
              <li key={f.id} className="flex flex-col gap-1.5">
                <button type="button" onClick={() => setVer(f)} className="overflow-hidden rounded-[12px] bg-zinc-200 ring-1 ring-zinc-200 transition-[box-shadow] duration-150 hover:ring-zinc-400" aria-label={`Ver foto ${f.nota || ''} en grande`}>
                  <img src={fotoUrl(f, '480x360')} alt={f.nota || 'Foto de la orden'} width={480} height={360} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                </button>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.nota || 'Sin etiqueta'}</p>
                    <p className="truncate text-xs text-zinc-500">{f.expand?.autor?.name || '—'} · {fmtFechaHora(f.created)}</p>
                  </div>
                  {(f.autor === yo || esAdmin()) && (
                    <button type="button" onClick={() => setBorrar(f)} aria-label="Eliminar foto" className="grid size-9 shrink-0 place-items-center rounded-[8px] text-zinc-400 hover:bg-mal-bg hover:text-mal">
                      <TrashIcon className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Seccion>
      ))}

      <Dialogo abierto={!!ver} onCerrar={() => setVer(null)} titulo={ver?.nota || 'Foto'} ancho="max-w-4xl">
        {ver && <img src={fotoUrl(ver)} alt={ver.nota || 'Foto de la orden'} width={1600} height={1200} className="h-auto w-full rounded-[10px]" />}
      </Dialogo>
      <Dialogo abierto={!!borrar} onCerrar={() => setBorrar(null)} titulo="¿Eliminar esta foto?">
        <p className="text-[15px] text-zinc-600">La foto se borra de la orden y no se puede recuperar.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Boton variante="secundario" onClick={() => setBorrar(null)}>Cancelar</Boton>
          <Boton variante="peligro" icono={TrashIcon} onClick={confirmarBorrado}>Eliminar foto</Boton>
        </div>
      </Dialogo>
    </div>
  )
}
