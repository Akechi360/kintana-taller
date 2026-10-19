import { useState } from 'react'
import { PlusIcon, TrashIcon, TagIcon } from '@phosphor-icons/react'
import { pb, useCarga, mensajeError } from '../lib/pb.js'
import { TRABAJOS } from '../lib/flujo.js'
import { fmtCOP } from '../lib/fmt.js'
import { Boton, Cargando, ErrorCaja, Vacio, Dialogo, Texto, Selector, Numero, useAviso } from '../ui.jsx'

const vacio = { clave: '', descripcion: '', unidad: 'und', valor: '' }

export default function Precios() {
  const aviso = useAviso()
  const { data, error, cargando, recargar } = useCarga(() => pb.collection('precios').getFullList({ sort: 'clave,descripcion' }))
  const [editar, setEditar] = useState(null)
  const [borrar, setBorrar] = useState(null)
  const [err, setErr] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setErr('')
    if (!editar.descripcion.trim() || !editar.clave.trim()) return setErr('La clave y la descripción son obligatorias.')
    setGuardando(true)
    try {
      const datos = { ...editar, valor: Number(String(editar.valor).replace(/\D/g, '')) || 0 }
      if (editar.id) await pb.collection('precios').update(editar.id, datos)
      else await pb.collection('precios').create(datos)
      setEditar(null)
      recargar(true)
      aviso('Precio guardado')
    } catch (e2) {
      setErr(mensajeError(e2))
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    try {
      await pb.collection('precios').delete(borrar.id)
      setBorrar(null)
      recargar(true)
      aviso('Precio eliminado')
    } catch (e) {
      aviso(mensajeError(e), 'mal')
    }
  }

  const nombreClave = (k) => TRABAJOS.find((t) => t.clave === k)?.nombre || (k.startsWith('rod_') ? `Rodamiento ${k.slice(4)}` : k)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lista de precios</h1>
          <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-zinc-600">
            La cotización automática toma estos valores según los trabajos que marca el técnico. Para rodamientos usa la clave <span mono>rod_6312</span>; si la unidad es HP o kg, la cantidad se toma de la placa o del peso de alambre.
          </p>
        </div>
        <Boton variante="marca" icono={PlusIcon} onClick={() => { setErr(''); setEditar({ ...vacio }) }}>Nuevo precio</Boton>
      </div>
      <ErrorCaja error={error && mensajeError(error)} onReintentar={() => recargar()} />
      {cargando && !data && <Cargando />}
      {data?.length === 0 && <Vacio icono={TagIcon} titulo="Sin precios" texto="Agrega el valor de cada trabajo para que la cotización se arme sola." />}
      {data?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-zinc-300 text-left text-xs text-zinc-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Trabajo</th>
                <th className="py-2 pr-4 font-medium">Descripción en cotización</th>
                <th className="py-2 pr-4 font-medium">Unidad</th>
                <th className="py-2 pr-4 text-right font-medium">Valor</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-white">
                  <td className="py-1 pr-4">
                    <button type="button" onClick={() => { setErr(''); setEditar({ ...p }) }} className="py-2 text-left font-medium hover:underline">{nombreClave(p.clave)}</button>
                  </td>
                  <td className="py-1 pr-4 text-zinc-700">{p.descripcion}</td>
                  <td className="num py-1 pr-4 text-zinc-600">{p.unidad}</td>
                  <td className="num py-1 pr-4 text-right font-medium">{fmtCOP(p.valor)}</td>
                  <td>
                    <button type="button" aria-label={`Eliminar ${p.descripcion}`} onClick={() => setBorrar(p)} className="grid size-9 place-items-center rounded-[8px] text-zinc-400 hover:bg-mal-bg hover:text-mal">
                      <TrashIcon className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialogo abierto={!!editar} onCerrar={() => setEditar(null)} titulo={editar?.id ? 'Editar precio' : 'Nuevo precio'}>
        {editar && (
          <form onSubmit={guardar} className="flex flex-col gap-4" noValidate>
            <Selector label="Trabajo" value={TRABAJOS.some((t) => t.clave === editar.clave) ? editar.clave : editar.clave ? '__otro' : ''} onChange={(e) => setEditar({ ...editar, clave: e.target.value === '__otro' ? 'rod_' : e.target.value })}>
              <option value="">Elegir…</option>
              {TRABAJOS.map((t) => <option key={t.clave} value={t.clave}>{t.nombre}</option>)}
              <option value="mo_rodamientos">Mano de obra cambio de rodamientos</option>
              <option value="__otro">Rodamiento por referencia / otra clave</option>
            </Selector>
            {!TRABAJOS.some((t) => t.clave === editar.clave) && editar.clave !== 'mo_rodamientos' && (
              <Texto label="Clave" value={editar.clave} onChange={(e) => setEditar({ ...editar, clave: e.target.value.trim() })} mono ayuda="Ej. rod_6312" spellCheck={false} />
            )}
            <Texto label="Descripción en la cotización" value={editar.descripcion} onChange={(e) => setEditar({ ...editar, descripcion: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Selector label="Unidad" value={editar.unidad} onChange={(e) => setEditar({ ...editar, unidad: e.target.value })}>
                {['und', 'HP', 'kg', 'hora', 'global'].map((u) => <option key={u}>{u}</option>)}
              </Selector>
              <Numero label="Valor" unidad="COP" decimales={false} valor={editar.valor} onValor={(v) => setEditar({ ...editar, valor: v })} />
            </div>
            <ErrorCaja error={err} />
            <Boton type="submit" tam="lg" cargando={guardando}>Guardar precio</Boton>
          </form>
        )}
      </Dialogo>
      <Dialogo abierto={!!borrar} onCerrar={() => setBorrar(null)} titulo="¿Eliminar este precio?">
        <p className="text-[15px] text-zinc-600">“{borrar?.descripcion}” dejará de usarse en cotizaciones nuevas. Las cotizaciones ya hechas no cambian.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Boton variante="secundario" onClick={() => setBorrar(null)}>Cancelar</Boton>
          <Boton variante="peligro" icono={TrashIcon} onClick={eliminar}>Eliminar</Boton>
        </div>
      </Dialogo>
    </div>
  )
}
