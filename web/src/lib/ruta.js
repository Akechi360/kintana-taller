import { useSyncExternalStore, lazy } from 'react'

// Router por hash: funciona sin configurar el servidor y con la app instalada.
function leerRuta() {
  const h = window.location.hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = h.split('?')
  return { path, query: new URLSearchParams(qs) }
}
let rutaActual = leerRuta()
window.addEventListener('hashchange', () => { rutaActual = leerRuta() })

export function useRuta() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) },
    () => rutaActual,
  )
}
export const ir = (h) => { window.location.hash = h }
export const irReemplazar = (h) => { window.location.replace('#' + h) }

// lazy() que sobrevive a una actualizacion: si el archivo de la pantalla ya no existe
// (se publico una version nueva con la app abierta), recarga una sola vez.

export function lazyConRecarga(cargar) {
  return lazy(() =>
    cargar().then(
      (m) => { try { sessionStorage.removeItem('kintana:recarga') } catch { /* sin acceso */ } return m },
      (err) => {
        let yaRecargo = false
        try { yaRecargo = sessionStorage.getItem('kintana:recarga') === '1'; sessionStorage.setItem('kintana:recarga', '1') } catch { /* sin acceso */ }
        if (!yaRecargo) { window.location.reload(); return new Promise(() => {}) }
        throw err
      },
    ),
  )
}
