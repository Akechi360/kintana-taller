import { useState } from 'react'
import { UserPlusIcon, KeyIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { pb, useCarga, mensajeError } from '../lib/pb.js'
import { fmtFechaHora, iniciales } from '../lib/fmt.js'
import { Boton, Cargando, ErrorCaja, Vacio, Dialogo, Texto, Segmentado, useAviso } from '../ui.jsx'

const vacio = { name: '', usuario: '', rol: 'tecnico', password: '' }

export default function Equipo() {
  const aviso = useAviso()
  const { data, error, cargando, recargar } = useCarga(async () => {
    const [usuarios, fotos, ordenes] = await Promise.all([
      pb.collection('users').getFullList({ sort: 'rol,name' }),
      pb.collection('fotos').getFullList({ fields: 'autor' }),
      pb.collection('ordenes').getFullList({ fields: 'tecnico,estado,updated' }),
    ])
    return { usuarios, fotos, ordenes }
  })
  const [form, setForm] = useState(null)
  const [err, setErr] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setErr('')
    const nuevo = !form.id
    if (!form.name.trim() || (nuevo && !form.usuario.trim())) return setErr('Nombre y usuario son obligatorios.')
    if ((nuevo || form.password) && form.password.length < 8) return setErr('La contraseña debe tener al menos 8 caracteres.')
    setGuardando(true)
    try {
      const datos = { name: form.name.trim(), rol: form.rol }
      if (nuevo) Object.assign(datos, { usuario: form.usuario.trim().toLowerCase() })
      if (form.password) Object.assign(datos, { password: form.password, passwordConfirm: form.password })
      if (nuevo) await pb.collection('users').create(datos)
      else await pb.collection('users').update(form.id, datos)
      setForm(null)
      recargar(true)
      aviso(nuevo ? `Usuario ${datos.usuario} creado` : 'Usuario actualizado')
    } catch (e2) {
      setErr(mensajeError(e2))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
          <p className="mt-1 text-[15px] text-zinc-600">Cada técnico entra con su usuario y solo ve las órdenes que tiene asignadas.</p>
        </div>
        <Boton variante="marca" icono={UserPlusIcon} onClick={() => { setErr(''); setForm({ ...vacio }) }}>Nuevo usuario</Boton>
      </div>
      <ErrorCaja error={error && mensajeError(error)} onReintentar={() => recargar()} />
      {cargando && !data && <Cargando />}
      {data?.usuarios.length === 0 && <Vacio icono={UsersThreeIcon} titulo="Sin usuarios" />}
      {data?.usuarios.length > 0 && (
        <ul className="divide-y divide-zinc-200 border-y border-zinc-200">
          {data.usuarios.map((u) => {
            const mias = data.ordenes.filter((o) => o.tecnico === u.id)
            const ultima = mias.map((o) => o.updated).sort().at(-1)
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-4 py-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-zinc-900 text-sm font-semibold text-white">{iniciales(u.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.name}</p>
                  <p className="num truncate text-sm text-zinc-500">{u.usuario} · {u.rol === 'admin' ? 'Administración' : 'Técnico'}</p>
                </div>
                {u.rol === 'tecnico' && (
                  <dl className="num grid grid-cols-3 gap-6 text-right text-sm">
                    <div><dt className="font-sans text-xs text-zinc-500">Activas</dt><dd className="font-semibold">{mias.filter((o) => o.estado !== 'entregado').length}</dd></div>
                    <div><dt className="font-sans text-xs text-zinc-500">Fotos</dt><dd className="font-semibold">{data.fotos.filter((f) => f.autor === u.id).length}</dd></div>
                    <div><dt className="font-sans text-xs text-zinc-500">Último mov.</dt><dd className="font-sans text-zinc-700">{ultima ? fmtFechaHora(ultima) : '—'}</dd></div>
                  </dl>
                )}
                <Boton variante="secundario" tam="sm" icono={KeyIcon} onClick={() => { setErr(''); setForm({ id: u.id, name: u.name, usuario: u.usuario, rol: u.rol, password: '' }) }}>Editar</Boton>
              </li>
            )
          })}
        </ul>
      )}

      <Dialogo abierto={!!form} onCerrar={() => setForm(null)} titulo={form?.id ? `Editar ${form.usuario}` : 'Nuevo usuario'}>
        {form && (
          <form onSubmit={guardar} className="flex flex-col gap-4" noValidate>
            <Texto label="Nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
            {!form.id && <Texto label="Usuario" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value.replace(/[^a-z0-9._-]/gi, '').toLowerCase() })} spellCheck={false} autoCapitalize="none" mono ayuda="Minúsculas, sin espacios. Ej. ycastillo" />}
            <Segmentado label="Rol" valor={form.rol} onChange={(v) => setForm({ ...form, rol: v || form.rol })} opciones={[{ v: 'tecnico', l: 'Técnico' }, { v: 'admin', l: 'Administración' }]} />
            <Texto label={form.id ? 'Nueva contraseña (opcional)' : 'Contraseña'} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} spellCheck={false} autoComplete="new-password" mono ayuda="Mínimo 8 caracteres. Entrégala al técnico en persona." />
            <ErrorCaja error={err} />
            <Boton type="submit" tam="lg" cargando={guardando}>{form.id ? 'Guardar cambios' : 'Crear usuario'}</Boton>
          </form>
        )}
      </Dialogo>
    </div>
  )
}
