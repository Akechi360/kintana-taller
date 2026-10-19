import { useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { pb, mensajeError } from '../lib/pb.js'
import { Boton, Numero, Cargando, ErrorCaja } from '../ui.jsx'
import { ListaRecetas, buscarRecetas } from '../components/ListaRecetas.jsx'

export default function Recetas() {
  const [f, setF] = useState({ ranuras: '', di: '', largo: '' })
  const [res, setRes] = useState(null)

  async function buscar(e) {
    e?.preventDefault()
    setRes({ cargando: true })
    try {
      setRes({ data: await buscarRecetas(pb, f) })
    } catch (err) {
      setRes({ error: mensajeError(err) })
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recetas de bobinado</h1>
        <p className="mt-1 max-w-[60ch] text-[15px] leading-relaxed text-zinc-600">
          Cuando un motor llega sin placa o sin datos, mide el núcleo y busca si el taller ya bobinó uno igual.
          Diámetro interno con tolerancia de 1 cm y largo de 2 cm.
        </p>
      </div>
      <form onSubmit={buscar} className="grid grid-cols-3 items-end gap-3">
        <Numero label="Ranuras" decimales={false} valor={f.ranuras} onValor={(v) => setF({ ...f, ranuras: v })} placeholder="72…" />
        <Numero label="Ø interno" unidad="cm" valor={f.di} onValor={(v) => setF({ ...f, di: v })} placeholder="32…" />
        <Numero label="Largo" unidad="cm" valor={f.largo} onValor={(v) => setF({ ...f, largo: v })} placeholder="51…" />
        <Boton type="submit" tam="lg" icono={MagnifyingGlassIcon} cargando={res?.cargando} className="col-span-3 sm:col-span-1">Buscar</Boton>
      </form>
      {res?.cargando && <Cargando filas={3} />}
      <ErrorCaja error={res?.error} onReintentar={buscar} />
      {res?.data && <ListaRecetas recetas={res.data} />}
    </div>
  )
}
