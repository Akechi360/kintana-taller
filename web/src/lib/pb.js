import PocketBase from 'pocketbase'
import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react'

// Servidor: VITE_PB_URL (ej. la app en Vercel apuntando al PC de la oficina) o el mismo origen
// (PocketBase sirviendo la app en el taller; en desarrollo Vite hace proxy de /api).
export const URL_SERVIDOR = import.meta.env.VITE_PB_URL || window.location.origin
export const pb = new PocketBase(URL_SERVIDOR)
pb.autoCancellation(false)

// authStore.record se relee de localStorage (objeto nuevo en cada acceso):
// se guarda una copia estable para useSyncExternalStore.
let usuarioActual = pb.authStore.record
pb.authStore.onChange(() => { usuarioActual = pb.authStore.record })

export function useUsuario() {
  return useSyncExternalStore(
    (cb) => pb.authStore.onChange(cb),
    () => usuarioActual,
  )
}

export const esAdmin = (u = pb.authStore.record) => u?.rol === 'admin'

export const fotoUrl = (rec, thumb) =>
  rec?.archivo ? pb.files.getURL(rec, rec.archivo, thumb ? { thumb } : undefined) : ''

// Mensaje entendible para el usuario a partir de un error del SDK.
export function mensajeError(err) {
  if (!err) return ''
  if (err.isAbort) return ''
  if (err.status === 0) return 'Sin conexión con el servidor. Revisa los datos móviles e intenta de nuevo.'
  if (err.status === 403) return err.response?.message || 'No tienes permiso para esta acción.'
  if (err.status === 404) return 'No se encontró el registro o no tienes acceso.'
  const campos = err.response?.data
  if (campos && Object.keys(campos).length) {
    const [k, v] = Object.entries(campos)[0]
    return `${k}: ${v.message}`
  }
  return err.response?.message || err.message || 'Ocurrió un error. Intenta de nuevo.'
}

// Carga de datos con estados de carga/error y recarga manual.
export function useCarga(fn, deps = []) {
  const [estado, setEstado] = useState({ data: null, error: null, cargando: true })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setEstado((s) => ({ ...s, cargando: true, error: null }))
    try {
      const data = await fnRef.current()
      setEstado({ data, error: null, cargando: false })
    } catch (error) {
      setEstado((s) => ({ ...s, error, cargando: false }))
    }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { recargar() }, deps)
  return { ...estado, recargar }
}

// Suscripcion en tiempo real: llama onCambio (con debounce) cuando cambia la coleccion.
export function useEnVivo(coleccion, onCambio) {
  const ref = useRef(onCambio)
  ref.current = onCambio
  const [conectado, setConectado] = useState(false)
  useEffect(() => {
    let t
    let unsub
    let vivo = true
    pb.collection(coleccion)
      .subscribe('*', () => {
        clearTimeout(t)
        t = setTimeout(() => ref.current(), 300)
      })
      .then((u) => {
        if (!vivo) u()
        else { unsub = u; setConectado(true) }
      })
      .catch(() => setConectado(false))
    return () => {
      vivo = false
      clearTimeout(t)
      unsub?.()
    }
  }, [coleccion])
  return conectado
}

export function useEnLinea() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => navigator.onLine,
  )
}

// Sube una foto con 2 reintentos (la senal en el taller va y viene).
export async function subirFoto(ordenId, file, nota = '') {
  const fd = new FormData()
  fd.append('orden', ordenId)
  fd.append('archivo', file)
  fd.append('nota', nota)
  let ultimoError
  for (let intento = 0; intento < 3; intento++) {
    try {
      return await pb.collection('fotos').create(fd)
    } catch (e) {
      ultimoError = e
      if (e.status && e.status !== 0 && e.status < 500) break // error de datos: no reintentar
      await new Promise((r) => setTimeout(r, 1200 * (intento + 1)))
    }
  }
  throw ultimoError
}
