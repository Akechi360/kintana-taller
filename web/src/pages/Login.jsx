import { useState } from 'react'
import { EyeIcon, EyeSlashIcon, SignInIcon } from '@phosphor-icons/react'
import { pb } from '../lib/pb.js'
import { Boton, Campo, Logo, ErrorCaja } from '../ui.jsx'

export default function Login() {
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const usuario = String(f.get('usuario') || '').trim().toLowerCase()
    const clave = String(f.get('clave') || '')
    if (!usuario || !clave) {
      setError('Escribe tu usuario y tu contraseña.')
      e.currentTarget.querySelector(usuario ? '[name=clave]' : '[name=usuario]')?.focus()
      return
    }
    setEnviando(true)
    setError('')
    try {
      await pb.collection('users').authWithPassword(usuario, clave)
    } catch (err) {
      setError(
        err.status === 0
          ? 'No hay conexión con el servidor del taller. Revisa los datos móviles e intenta de nuevo.'
          : 'Usuario o contraseña incorrectos. Si no recuerdas tu clave, pídela a administración.',
      )
      setEnviando(false)
    }
  }

  const input = 'h-14 w-full rounded-[12px] bg-white px-4 text-[17px] ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:outline-none focus:ring-2 focus:ring-cobre-500'

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Logo className="text-xl" />
        <div className="my-auto w-full max-w-sm py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Entrar al taller</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">Usa el usuario que te entregó administración.</p>
          <form onSubmit={entrar} className="mt-8 flex flex-col gap-5" noValidate>
            <Campo label="Usuario">
              {({ id }) => (
                <input id={id} name="usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="ej. wcastaneda…" className={input} />
              )}
            </Campo>
            <Campo label="Contraseña">
              {({ id }) => (
                <div className="relative">
                  <input id={id} name="clave" type={ver ? 'text' : 'password'} autoComplete="current-password" className={input + ' pr-14'} />
                  <button
                    type="button"
                    onClick={() => setVer((v) => !v)}
                    aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute inset-y-0 right-1 my-auto grid size-12 place-items-center rounded-[10px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    {ver ? <EyeSlashIcon className="size-5" aria-hidden /> : <EyeIcon className="size-5" aria-hidden />}
                  </button>
                </div>
              )}
            </Campo>
            <ErrorCaja error={error} />
            <Boton type="submit" tam="lg" icono={SignInIcon} cargando={enviando} className="w-full">
              {enviando ? 'Entrando…' : 'Entrar'}
            </Boton>
          </form>
        </div>
        <p className="text-xs text-zinc-500">Kintana Electricidad Industrial · Zipaquirá, Cundinamarca</p>
      </div>

      <div className="relative hidden overflow-hidden bg-zinc-900 lg:block">
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{ backgroundImage: 'repeating-linear-gradient(115deg, #b4643a 0 2px, transparent 2px 22px)' }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-end gap-10 p-12 text-zinc-100">
          <p className="max-w-md text-2xl font-medium leading-snug tracking-tight">
            Del motor que entra por la puerta al informe firmado, en una sola línea de trabajo.
          </p>
          <dl className="grid max-w-md grid-cols-2 gap-x-8 gap-y-6 border-t border-zinc-700 pt-8 text-sm">
            {[
              ['Recepción', 'Fotos y datos de placa desde el celular'],
              ['Diagnóstico', 'Megger, IP y desbalance calculados al instante'],
              ['Bobinado', 'Recetas guardadas y búsqueda por núcleo'],
              ['Entrega', 'Informe PDF y cotización a Excel o WhatsApp'],
            ].map(([t, d]) => (
              <div key={t}>
                <dt className="font-semibold text-white">{t}</dt>
                <dd className="mt-1 leading-relaxed text-zinc-400">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
