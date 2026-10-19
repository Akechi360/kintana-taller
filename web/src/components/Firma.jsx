import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { EraserIcon } from '@phosphor-icons/react'
import { Boton } from '../ui.jsx'

// Lienzo de firma con dedo o lapiz. ref.current.blob() -> PNG o null si esta vacia.
export const Firma = forwardRef(function Firma(_, ref) {
  const canvas = useRef(null)
  const [vacia, setVacia] = useState(true)
  const dibujando = useRef(false)

  useEffect(() => {
    const c = canvas.current
    const ratio = window.devicePixelRatio || 1
    const ajustar = () => {
      const r = c.getBoundingClientRect()
      c.width = r.width * ratio
      c.height = r.height * ratio
      const ctx = c.getContext('2d')
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#18181b'
      setVacia(true)
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [])

  const punto = (e) => {
    const r = canvas.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const abajo = (e) => {
    canvas.current.setPointerCapture(e.pointerId)
    dibujando.current = true
    const ctx = canvas.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(...punto(e))
  }
  const mover = (e) => {
    if (!dibujando.current) return
    const ctx = canvas.current.getContext('2d')
    ctx.lineTo(...punto(e))
    ctx.stroke()
    setVacia(false)
  }
  const arriba = () => { dibujando.current = false }
  const borrar = () => {
    const c = canvas.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setVacia(true)
  }

  useImperativeHandle(ref, () => ({
    vacia: () => vacia,
    blob: () => (vacia ? Promise.resolve(null) : new Promise((r) => canvas.current.toBlob(r, 'image/png'))),
  }), [vacia])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <canvas
          ref={canvas}
          onPointerDown={abajo}
          onPointerMove={mover}
          onPointerUp={arriba}
          onPointerCancel={arriba}
          className="h-44 w-full touch-none rounded-[12px] bg-white ring-1 ring-inset ring-zinc-300"
          aria-label="Área para firmar con el dedo"
          role="img"
        />
        {vacia && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[15px] text-zinc-400">Firme aquí con el dedo</span>}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-zinc-300" aria-hidden />
      </div>
      <Boton variante="fantasma" tam="sm" icono={EraserIcon} onClick={borrar} disabled={vacia} className="self-end">Borrar firma</Boton>
    </div>
  )
})
