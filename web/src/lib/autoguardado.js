import { useCallback, useEffect, useRef, useState } from 'react'
import { pb } from './pb.js'

const leer = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null }
}
const escribir = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* almacenamiento lleno o bloqueado */ }
}
const borrar = (k) => {
  try { localStorage.removeItem(k) } catch { /* sin acceso */ }
}

// Guarda un campo JSON de la orden mientras el tecnico escribe.
// Si no hay senal, queda en el telefono y se reintenta al volver la conexion.
// estado: 'guardado' | 'escribiendo' | 'guardando' | 'pendiente' (fallo el envio, queda en el telefono)
export function useAutoguardado(orden, campo, onGuardado) {
  const clave = `kintana:borrador:${orden.id}:${campo}`
  const local = leer(clave)
  const [valor, setValor] = useState(() => local ?? orden[campo] ?? {})
  const [estado, setEstado] = useState(local ? 'pendiente' : 'guardado')
  const ultimo = useRef(valor)
  const timer = useRef()
  const cbRef = useRef(onGuardado)
  cbRef.current = onGuardado

  const enviar = useCallback(async () => {
    const v = ultimo.current
    setEstado('guardando')
    try {
      const rec = await pb.collection('ordenes').update(orden.id, { [campo]: v })
      if (ultimo.current === v) {
        borrar(clave)
        setEstado('guardado')
      }
      cbRef.current?.(rec)
    } catch {
      setEstado('pendiente')
    }
  }, [orden.id, campo, clave])

  const actualizar = useCallback((parcial) => {
    setValor((prev) => {
      const v = typeof parcial === 'function' ? parcial(prev) : { ...prev, ...parcial }
      ultimo.current = v
      escribir(clave, v)
      return v
    })
    setEstado('escribiendo')
    clearTimeout(timer.current)
    timer.current = setTimeout(enviar, 900)
  }, [clave, enviar])

  // Borrador local de una sesion anterior sin senal: sincronizar al abrir.
  useEffect(() => {
    if (local) enviar()
    const alVolver = () => { if (leer(clave)) enviar() }
    window.addEventListener('online', alVolver)
    return () => {
      window.removeEventListener('online', alVolver)
      clearTimeout(timer.current)
      if (leer(clave)) enviar() // al salir de la pantalla no se espera el debounce
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  // Reintento periodico: la senal puede volver sin que el navegador avise.
  useEffect(() => {
    if (estado !== 'pendiente') return
    const t = setInterval(() => { if (leer(clave)) enviar() }, 15000)
    return () => clearInterval(t)
  }, [estado, clave, enviar])

  useEffect(() => {
    if (estado === 'guardado') return
    const aviso = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [estado])

  return [valor, actualizar, estado, enviar]
}
