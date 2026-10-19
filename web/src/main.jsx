import { Component, StrictMode, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  KanbanIcon, ListChecksIcon, PlusIcon, SpiralIcon, TagIcon, UsersThreeIcon, SignOutIcon, CloudSlashIcon,
} from '@phosphor-icons/react'
import './app.css'
import { pb, useUsuario, esAdmin, useEnLinea } from './lib/pb.js'
import { Logo, ProveedorAvisos, Cargando, cx } from './ui.jsx'
import Login from './pages/Login.jsx'
import { useRuta, ir, lazyConRecarga } from './lib/ruta.js'

const Tablero = lazyConRecarga(() => import('./pages/Tablero.jsx'))
const MisOrdenes = lazyConRecarga(() => import('./pages/MisOrdenes.jsx'))
const Recepcion = lazyConRecarga(() => import('./pages/Recepcion.jsx'))
const Orden = lazyConRecarga(() => import('./pages/Orden.jsx'))
const Informe = lazyConRecarga(() => import('./pages/Informe.jsx'))
const Recetas = lazyConRecarga(() => import('./pages/Recetas.jsx'))
const Precios = lazyConRecarga(() => import('./pages/Precios.jsx'))
const Equipo = lazyConRecarga(() => import('./pages/Equipo.jsx'))

function resolver(path, admin) {
  let m
  if ((m = path.match(/^\/orden\/([a-z0-9]+)\/informe$/))) return { vista: <Informe id={m[1]} />, sinMarco: true }
  if ((m = path.match(/^\/orden\/([a-z0-9]+)$/))) return { vista: <Orden id={m[1]} />, nav: '/ordenes' }
  if (path === '/nueva') return { vista: <Recepcion />, nav: '/nueva' }
  if (path === '/recetas') return { vista: <Recetas />, nav: '/recetas' }
  if (admin && path === '/precios') return { vista: <Precios />, nav: '/precios' }
  if (admin && path === '/equipo') return { vista: <Equipo />, nav: '/equipo' }
  if (admin && path === '/ordenes') return { vista: <MisOrdenes />, nav: '/ordenes' }
  if (admin) return { vista: <Tablero />, nav: '/' }
  return { vista: <MisOrdenes />, nav: '/ordenes' }
}

const NAV_ADMIN = [
  { h: '/', l: 'Tablero', i: KanbanIcon },
  { h: '/ordenes', l: 'Órdenes', i: ListChecksIcon },
  { h: '/nueva', l: 'Recepción', i: PlusIcon },
  { h: '/recetas', l: 'Recetas', i: SpiralIcon },
  { h: '/precios', l: 'Precios', i: TagIcon },
  { h: '/equipo', l: 'Equipo', i: UsersThreeIcon },
]
const NAV_TECNICO = [
  { h: '/ordenes', l: 'Mis órdenes', i: ListChecksIcon },
  { h: '/nueva', l: 'Recepción', i: PlusIcon },
  { h: '/recetas', l: 'Recetas', i: SpiralIcon },
]

function Marco({ usuario, nav, children }) {
  const admin = esAdmin(usuario)
  const items = admin ? NAV_ADMIN : NAV_TECNICO
  const enLinea = useEnLinea()
  const salir = () => { pb.authStore.clear(); ir('/') }
  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[232px_1fr]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <aside className="no-print sticky top-0 hidden h-[100dvh] flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="px-5 pb-6 pt-6"><Logo /></div>
        <nav className="flex flex-col gap-0.5 px-3" aria-label="Principal">
          {items.map((it) => (
            <a
              key={it.h}
              href={`#${it.h}`}
              aria-current={nav === it.h ? 'page' : undefined}
              className={cx(
                'flex h-10 items-center gap-3 rounded-[9px] px-3 text-[15px] font-medium transition-[background-color,color] duration-150',
                nav === it.h ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              )}
            >
              <it.i className="size-5" weight={nav === it.h ? 'fill' : 'regular'} aria-hidden />
              {it.l}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-zinc-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{usuario.name || usuario.usuario}</p>
            <p className="text-xs text-zinc-500">{admin ? 'Administración' : 'Técnico'}</p>
          </div>
          <button type="button" onClick={salir} aria-label="Cerrar sesión" className="grid size-9 place-items-center rounded-[9px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            <SignOutIcon className="size-5" aria-hidden />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="no-print safe-t sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-zinc-100/90 px-4 backdrop-blur md:hidden">
          <Logo sub={false} className="text-[15px]" />
          <div className="flex items-center gap-1">
            <span className="max-w-[40vw] truncate text-sm text-zinc-600">{usuario.name || usuario.usuario}</span>
            <button type="button" onClick={salir} aria-label="Cerrar sesión" className="grid size-10 place-items-center rounded-[10px] text-zinc-600 hover:bg-zinc-200">
              <SignOutIcon className="size-5" aria-hidden />
            </button>
          </div>
        </header>
        {!enLinea && (
          <div className="no-print flex items-center gap-2 bg-alerta-bg px-4 py-2 text-sm font-medium text-alerta" role="status">
            <CloudSlashIcon className="size-4" weight="bold" aria-hidden />
            Sin conexión. Lo que escribas se guarda en el teléfono y se envía al volver la señal.
          </div>
        )}
        <main id="contenido" className="flex-1 pb-28 md:pb-10">
          <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-6"><Cargando /></div>}>{children}</Suspense>
        </main>
        <nav className="no-print safe-b fixed inset-x-0 bottom-0 z-20 grid border-t border-zinc-200 bg-white md:hidden" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)` }} aria-label="Principal">
          {items.slice(0, 4).map((it) => (
            <a
              key={it.h}
              href={`#${it.h}`}
              aria-current={nav === it.h ? 'page' : undefined}
              className={cx('flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium', nav === it.h ? 'text-zinc-900' : 'text-zinc-500')}
            >
              <it.i className="size-6" weight={nav === it.h ? 'fill' : 'regular'} aria-hidden />
              {it.l}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}

function App() {
  const usuario = useUsuario()
  const { path } = useRuta()
  const [listo, setListo] = useState(!pb.authStore.isValid)

  // Refresca la sesion al abrir; si el usuario fue eliminado o cambio la clave, vuelve al login.
  useEffect(() => {
    if (!pb.authStore.isValid) return
    pb.collection('users').authRefresh()
      .catch((e) => { if (e.status === 401 || e.status === 403 || e.status === 404) pb.authStore.clear() })
      .finally(() => setListo(true))
  }, [])

  if (!usuario || !pb.authStore.isValid) return <Login />
  if (!listo) return <div className="mx-auto max-w-3xl px-4 py-10"><Cargando /></div>
  const r = resolver(path, esAdmin(usuario))
  if (r.sinMarco) return <Suspense fallback={<div className="p-6"><Cargando /></div>}>{r.vista}</Suspense>
  return <Marco usuario={usuario} nav={r.nav}>{r.vista}</Marco>
}

// Si algo falla al dibujar, se muestra un aviso con opcion de recargar en vez de pantalla en blanco.
class Protector extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error(error) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 px-6">
        <Logo />
        <h1 className="text-xl font-semibold tracking-tight">Algo no cargó bien</h1>
        <p className="text-[15px] leading-relaxed text-zinc-600">Lo que ya guardaste está a salvo. Recarga la página para continuar.</p>
        <button type="button" onClick={() => window.location.reload()} className="h-12 rounded-[10px] bg-zinc-900 font-medium text-white hover:bg-zinc-800 active:scale-[0.98]">Recargar</button>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Protector>
      <ProveedorAvisos>
        <App />
      </ProveedorAvisos>
    </Protector>
  </StrictMode>,
)
