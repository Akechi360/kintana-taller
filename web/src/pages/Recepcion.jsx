import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon, BuildingsIcon, CheckIcon, EngineIcon, MagnifyingGlassIcon, PlusIcon, ClockCounterClockwiseIcon } from '@phosphor-icons/react'
import { pb, useCarga, mensajeError, subirFoto } from '../lib/pb.js'
import { hpAKw, kwAHp } from '../lib/calc.js'
import { motorCorto } from '../lib/fmt.js'
import { ir } from '../lib/ruta.js'
import { Boton, Texto, Numero, AreaTexto, Segmentado, Chips, Seccion, ErrorCaja, Esqueleto, useAviso, cx } from '../ui.jsx'
import { SelectorFotos, FotosLocales, GaleriaVacia } from '../components/Fotos.jsx'

const MARCAS = ['WEG', 'Siemens', 'ABB', 'Baldor', 'Toshiba', 'US Motors']
const RPMS = [900, 1200, 1800, 3600]
const VOLTAJES = ['220', '440', '220/440', '460']
const FALLAS = ['No arranca', 'Recalienta', 'Ruido en rodamientos', 'Huele a quemado', 'Dispara protecciones', 'Vibración', 'Mantenimiento programado']
const ACCESORIOS = ['Polea', 'Acople', 'Caja de bornes', 'Tapa bornera', 'Ventilador', 'Caperuza', 'Base', 'Cable de alimentación', 'Chaveta']

const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const uid = () => Math.random().toString(36).slice(2, 10)
const nuevoMotor = { marca: '', serial: '', frame: '', hp: '', kw: '', rpm: '', voltaje: '', amperaje: '', fases: 'trifasico', conexion: '', rodamiento_la: '', rodamiento_loa: '' }

// Borrador de la recepcion en el telefono: si el tecnico sale o se cae la app, no pierde lo escrito.
const CLAVE_BORRADOR = () => `kintana:recepcion:${pb.authStore.record?.id}`
const leerBorrador = () => { try { return JSON.parse(localStorage.getItem(CLAVE_BORRADOR()) || 'null') } catch { return null } }

export default function Recepcion() {
  const aviso = useAviso()
  const [borrador] = useState(leerBorrador)
  const clientes = useCarga(() => pb.collection('clientes').getFullList({ sort: 'nombre', fields: 'id,nombre,nit,ciudad,contacto,telefono' }))
  const [busca, setBusca] = useState('')
  const servicioVacio = { tipo: 'diagnostico', prioridad: 'normal', fallas: [], falla: '', accesorios: [], estado_fisico: '' }
  const [cliente, setCliente] = useState(borrador?.cliente ?? null) // registro existente
  const [clienteNuevo, setClienteNuevo] = useState(borrador?.clienteNuevo ?? null) // { nombre, nit, ... }
  const [motorSel, setMotorSel] = useState(borrador?.motorSel ?? null)
  const [motor, setMotor] = useState(borrador?.motor ?? nuevoMotor)
  const [servicio, setServicio] = useState(borrador?.servicio ?? servicioVacio)
  const [fotos, setFotos] = useState([])
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState('')
  const [creada, setCreada] = useState(null)
  const [errorGeneral, setErrorGeneral] = useState('')

  const hayDatos = !!(cliente || clienteNuevo?.nombre || motorSel || motor.marca || motor.hp || servicio.fallas.length || servicio.falla || fotos.length)
  useEffect(() => {
    if (creada) return
    try {
      if (hayDatos) localStorage.setItem(CLAVE_BORRADOR(), JSON.stringify({ cliente, clienteNuevo, motorSel, motor, servicio }))
    } catch { /* sin espacio */ }
  }, [cliente, clienteNuevo, motorSel, motor, servicio, hayDatos, creada])
  useEffect(() => {
    if (!hayDatos || creada) return
    const avisoSalida = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisoSalida)
    return () => window.removeEventListener('beforeunload', avisoSalida)
  }, [hayDatos, creada])
  const descartar = () => {
    try { localStorage.removeItem(CLAVE_BORRADOR()) } catch { /* sin acceso */ }
    setCliente(null); setClienteNuevo(null); setMotorSel(null); setMotor(nuevoMotor); setServicio(servicioVacio); setFotos([]); setErrores({})
  }

  const motores = useCarga(
    () => (cliente ? pb.collection('motores').getFullList({ filter: pb.filter('cliente = {:c}', { c: cliente.id }), sort: '-updated' }) : Promise.resolve([])),
    [cliente?.id],
  )

  const sugeridos = useMemo(() => {
    const t = normal(busca)
    const lista = clientes.data || []
    return (t ? lista.filter((c) => normal(`${c.nombre} ${c.nit} ${c.ciudad}`).includes(t)) : lista).slice(0, 6)
  }, [busca, clientes.data])

  const setM = (p) => setMotor((m) => ({ ...m, ...p }))
  const setS = (p) => setServicio((s) => ({ ...s, ...p }))

  function validar() {
    const e = {}
    if (!cliente && !clienteNuevo?.nombre?.trim()) e.cliente = 'Elige un cliente o escribe el nombre del cliente nuevo.'
    if (!motorSel && !motor.marca.trim() && !motor.hp) e.motor = 'Escribe al menos la marca o la potencia del motor.'
    if (!servicio.fallas.length && !servicio.falla.trim()) e.falla = 'Marca o escribe el motivo por el que llega el motor.'
    setErrores(e)
    const primero = Object.keys(e)[0]
    if (primero) {
      document.getElementById(`sec-${primero}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => document.querySelector('main [aria-invalid="true"]')?.focus({ preventScroll: true }), 350)
    }
    return !primero
  }

  async function subirPendientes(ordenId, lista) {
    let fallidas = 0
    for (const f of lista) {
      if (f.estado === 'ok') continue
      setFotos((fs) => fs.map((x) => (x.id === f.id ? { ...x, estado: 'subiendo' } : x)))
      try {
        await subirFoto(ordenId, f.file, f.nota)
        setFotos((fs) => fs.map((x) => (x.id === f.id ? { ...x, estado: 'ok' } : x)))
      } catch {
        fallidas++
        setFotos((fs) => fs.map((x) => (x.id === f.id ? { ...x, estado: 'error' } : x)))
      }
    }
    return fallidas
  }

  async function crear(e) {
    e.preventDefault()
    setErrorGeneral('')
    if (!validar()) return
    try {
      setEnviando('Guardando cliente…')
      const c = cliente || (await pb.collection('clientes').create({ ...clienteNuevo, nombre: clienteNuevo.nombre.trim() }))
      setEnviando('Guardando motor…')
      const m = motorSel || (await pb.collection('motores').create({ ...motor, cliente: c.id }))
      setEnviando('Creando orden…')
      const falla = [...servicio.fallas, servicio.falla.trim()].filter(Boolean).join('. ')
      const o = await pb.collection('ordenes').create({
        cliente: c.id, motor: m.id, tipo: servicio.tipo, prioridad: servicio.prioridad, falla_reportada: falla,
        recepcion: { accesorios: servicio.accesorios, estado_fisico: servicio.estado_fisico },
      })
      setCreada(o)
      try { localStorage.removeItem(CLAVE_BORRADOR()) } catch { /* sin acceso */ }
      setEnviando(fotos.length ? `Subiendo ${fotos.length} foto${fotos.length > 1 ? 's' : ''}…` : '')
      const fallidas = await subirPendientes(o.id, fotos)
      setEnviando('')
      if (fallidas) {
        setErrorGeneral(`La orden ${o.numero} quedó creada, pero ${fallidas} foto${fallidas > 1 ? 's no se subieron' : ' no se subió'}. Revisa la señal y toca Reintentar.`)
        return
      }
      aviso(`Orden ${o.numero} creada`)
      ir(`/orden/${o.id}`)
    } catch (err) {
      setEnviando('')
      setErrorGeneral(mensajeError(err))
    }
  }

  async function reintentar() {
    setErrorGeneral('')
    setEnviando('Subiendo fotos…')
    const fallidas = await subirPendientes(creada.id, fotos)
    setEnviando('')
    if (fallidas) setErrorGeneral(`Aún faltan ${fallidas} foto${fallidas > 1 ? 's' : ''}. Puedes reintentar o subirlas luego desde la orden.`)
    else { aviso(`Orden ${creada.numero} completa`); ir(`/orden/${creada.id}`) }
  }

  const ocupado = !!enviando

  return (
    <form onSubmit={crear} noValidate className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recepción de motor</h1>
        <p className="mt-1 text-[15px] text-zinc-600">El consecutivo de la orden se asigna solo al guardar.</p>
      </div>
      {borrador && hayDatos && !creada && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-marca-50 px-4 py-3 text-[15px] text-marca-700 ring-1 ring-marca-100" role="status">
          <span>Recuperamos la recepción que dejaste a medias. Las fotos hay que tomarlas de nuevo.</span>
          <Boton variante="fantasma" tam="sm" onClick={descartar}>Empezar de cero</Boton>
        </div>
      )}

      {/* 1. Cliente */}
      <Seccion titulo="1. Cliente" className="scroll-mt-20" descripcion={cliente ? null : 'Busca por nombre o NIT. Si es primera vez, créalo aquí mismo.'}>
        <div id="sec-cliente" className="scroll-mt-24" />
        {cliente ? (
          <Seleccionado icono={BuildingsIcon} titulo={cliente.nombre} detalle={[cliente.nit && `NIT ${cliente.nit}`, cliente.ciudad].filter(Boolean).join(' · ')} onCambiar={() => { setCliente(null); setMotorSel(null) }} />
        ) : clienteNuevo ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Texto label="Nombre o razón social" value={clienteNuevo.nombre} onChange={(e) => setClienteNuevo({ ...clienteNuevo, nombre: e.target.value })} error={errores.cliente} className="sm:col-span-2" autoComplete="organization" />
            <Texto label="NIT" inputMode="numeric" value={clienteNuevo.nit} onChange={(e) => setClienteNuevo({ ...clienteNuevo, nit: e.target.value })} placeholder="900123456-7…" />
            <Texto label="Ciudad" value={clienteNuevo.ciudad} onChange={(e) => setClienteNuevo({ ...clienteNuevo, ciudad: e.target.value })} placeholder="Zipaquirá…" />
            <Texto label="Contacto" value={clienteNuevo.contacto} onChange={(e) => setClienteNuevo({ ...clienteNuevo, contacto: e.target.value })} placeholder="Jefe de mantenimiento…" />
            <Texto label="Celular" type="tel" inputMode="tel" value={clienteNuevo.telefono} onChange={(e) => setClienteNuevo({ ...clienteNuevo, telefono: e.target.value })} placeholder="310 482 7731…" ayuda="Para enviar la cotización por WhatsApp." />
            <div className="sm:col-span-2">
              <Boton variante="fantasma" tam="sm" onClick={() => setClienteNuevo(null)}>Buscar un cliente existente</Boton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="relative">
              <span className="sr-only">Buscar cliente</span>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nombre del cliente o NIT…"
                autoComplete="off"
                aria-invalid={!!errores.cliente}
                className="h-12 w-full rounded-[10px] bg-white pl-11 pr-3 text-base ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:outline-none focus:ring-2 focus:ring-marca-500 aria-[invalid=true]:ring-mal"
              />
            </label>
            {errores.cliente && <p className="text-[13px] text-mal">{errores.cliente}</p>}
            {clientes.cargando && <Esqueleto className="h-24 w-full" />}
            <ErrorCaja error={clientes.error && mensajeError(clientes.error)} onReintentar={() => clientes.recargar()} />
            {sugeridos.length > 0 && (
              <ul className="divide-y divide-zinc-200 overflow-hidden rounded-[12px] ring-1 ring-zinc-200">
                {sugeridos.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setCliente(c)} className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left hover:bg-zinc-50 active:bg-zinc-100">
                      <BuildingsIcon className="size-5 shrink-0 text-zinc-400" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.nombre}</span>
                        <span className="block truncate text-sm text-zinc-500">{[c.nit && `NIT ${c.nit}`, c.ciudad].filter(Boolean).join(' · ') || 'Sin NIT'}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Boton variante="secundario" icono={PlusIcon} onClick={() => setClienteNuevo({ nombre: busca, nit: '', ciudad: '', contacto: '', telefono: '' })} className="self-start">
              {busca ? `Crear “${busca.slice(0, 28)}”` : 'Cliente nuevo'}
            </Boton>
          </div>
        )}
      </Seccion>

      {/* 2. Motor */}
      <Seccion titulo="2. Motor" descripcion="Copia los datos de la placa. Si la placa no se lee, anota lo que tengas y toma foto.">
        <div id="sec-motor" className="scroll-mt-24" />
        {cliente && motores.data?.length > 0 && !motorSel && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <ClockCounterClockwiseIcon className="size-4" aria-hidden />
              Motores de este cliente que ya pasaron por el taller
            </p>
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-[12px] ring-1 ring-zinc-200">
              {motores.data.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setMotorSel(m)} className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left hover:bg-zinc-50 active:bg-zinc-100">
                    <EngineIcon className="size-5 shrink-0 text-zinc-400" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{motorCorto(m)}</span>
                      <span className="num block truncate text-sm text-zinc-500">{m.serial ? `Serial ${m.serial}` : 'Sin serial'}{m.voltaje ? ` · ${m.voltaje} V` : ''}</span>
                    </span>
                    <span className="text-sm font-medium text-marca-700">Usar</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-500">O registra uno nuevo abajo.</p>
          </div>
        )}
        {motorSel ? (
          <Seleccionado icono={EngineIcon} titulo={motorCorto(motorSel)} detalle={[motorSel.serial && `Serial ${motorSel.serial}`, motorSel.voltaje && `${motorSel.voltaje} V`, motorSel.rodamiento_la && `Rod. ${motorSel.rodamiento_la}/${motorSel.rodamiento_loa}`].filter(Boolean).join(' · ')} onCambiar={() => setMotorSel(null)} />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Texto label="Marca" value={motor.marca} onChange={(e) => setM({ marca: e.target.value })} error={errores.motor} placeholder="WEG…" />
              <div className="flex flex-wrap gap-2">
                {MARCAS.map((m) => (
                  <Rapido key={m} activo={motor.marca === m} onClick={() => setM({ marca: m })}>{m}</Rapido>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Numero label="Potencia" unidad="HP" valor={motor.hp} onValor={(v) => setM({ hp: v, kw: v ? hpAKw(v) : '' })} placeholder="50…" />
              <Numero label="Potencia" unidad="kW" valor={motor.kw} onValor={(v) => setM({ kw: v, hp: v ? kwAHp(v) : '' })} placeholder="37…" ayuda="Se calcula sola desde HP." />
            </div>
            <div className="flex flex-col gap-2">
              <Numero label="Velocidad" unidad="RPM" decimales={false} valor={motor.rpm} onValor={(v) => setM({ rpm: v })} placeholder="1800…" />
              <div className="flex flex-wrap gap-2">
                {RPMS.map((r) => <Rapido key={r} activo={String(motor.rpm) === String(r)} onClick={() => setM({ rpm: r })}>{r}</Rapido>)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Texto label="Voltaje" unidad="V" value={motor.voltaje} onChange={(e) => setM({ voltaje: e.target.value })} inputMode="decimal" mono placeholder="440…" />
              <div className="flex flex-wrap gap-2">
                {VOLTAJES.map((v) => <Rapido key={v} activo={motor.voltaje === v} onClick={() => setM({ voltaje: v })}>{v}</Rapido>)}
              </div>
            </div>
            <Segmentado label="Fases" valor={motor.fases} onChange={(v) => setM({ fases: v })} opciones={[{ v: 'trifasico', l: 'Trifásico' }, { v: 'monofasico', l: 'Monofásico' }, { v: 'bifasico', l: 'Bifásico' }]} />
            <Segmentado label="Conexión" valor={motor.conexion} onChange={(v) => setM({ conexion: v })} opciones={[{ v: 'YY', l: 'YY' }, { v: 'Y', l: 'Y' }, { v: 'Δ', l: 'Δ' }, { v: 'ΔΔ', l: 'ΔΔ' }]} />
            <div className="grid grid-cols-2 gap-4">
              <Numero label="Corriente de placa" unidad="A" valor={motor.amperaje} onValor={(v) => setM({ amperaje: v })} />
              <Texto label="Frame / carcasa" value={motor.frame} onChange={(e) => setM({ frame: e.target.value })} placeholder="225S/M…" />
              <Texto label="Rodamiento lado acople" value={motor.rodamiento_la} onChange={(e) => setM({ rodamiento_la: e.target.value })} inputMode="numeric" mono placeholder="6312…" />
              <Texto label="Rodamiento lado opuesto" value={motor.rodamiento_loa} onChange={(e) => setM({ rodamiento_loa: e.target.value })} inputMode="numeric" mono placeholder="6212…" />
              <Texto label="Serial" value={motor.serial} onChange={(e) => setM({ serial: e.target.value })} spellCheck={false} className="col-span-2" />
            </div>
          </div>
        )}
      </Seccion>

      {/* 3. Servicio */}
      <Seccion titulo="3. Motivo del ingreso">
        <div id="sec-falla" className="scroll-mt-24" />
        <Segmentado label="Servicio" valor={servicio.tipo} onChange={(v) => setS({ tipo: v || 'diagnostico' })} opciones={[{ v: 'diagnostico', l: 'Diagnóstico' }, { v: 'preventivo', l: 'Preventivo' }, { v: 'correctivo', l: 'Correctivo' }, { v: 'bobinado', l: 'Rebobinado' }]} columnas={2} />
        <Segmentado label="Prioridad" valor={servicio.prioridad} onChange={(v) => setS({ prioridad: v || 'normal' })} opciones={[{ v: 'normal', l: 'Normal' }, { v: 'urgente', l: 'Urgente', tono: 'mal' }]} />
        <Chips label="Lo que reporta el cliente" opciones={FALLAS.map((f) => ({ v: f, l: f }))} valores={servicio.fallas} onChange={(v) => setS({ fallas: v })} />
        <AreaTexto label="Detalle" value={servicio.falla} onChange={(e) => setS({ falla: e.target.value })} error={errores.falla} placeholder="Ej. paró en la noche, el breaker disparó dos veces…" ayuda="Puedes dictar con el micrófono del teclado del celular." rows={3} />
      </Seccion>

      {/* 4. Estado al recibir */}
      <Seccion titulo="4. Cómo llega" descripcion="Esto queda en el acta de recepción que firma el cliente.">
        <Chips label="Accesorios que entrega con el motor" opciones={ACCESORIOS.map((a) => ({ v: a, l: a }))} valores={servicio.accesorios} onChange={(v) => setS({ accesorios: v })} />
        <AreaTexto label="Estado físico" value={servicio.estado_fisico} onChange={(e) => setS({ estado_fisico: e.target.value })} placeholder="Ej. tapa LOA fisurada, falta una oreja de izaje…" rows={2} />
      </Seccion>

      {/* 5. Fotos */}
      <Seccion titulo="5. Fotos de recepción" descripcion="Placa, vista general, bornera y cualquier daño. Se comprimen en el teléfono para ahorrar datos.">
        <SelectorFotos ocupado={ocupado} onAgregar={(files) => setFotos((fs) => [...fs, ...files.map((file, i) => ({ id: uid(), file, nota: fs.length + i === 0 ? 'Placa' : '' }))])} />
        {fotos.length === 0 ? (
          <GaleriaVacia texto="Sin fotos todavía. La primera se etiqueta como Placa." />
        ) : (
          <FotosLocales
            fotos={fotos}
            onCambiar={(id, nota) => setFotos((fs) => fs.map((f) => (f.id === id ? { ...f, nota } : f)))}
            onQuitar={(id) => setFotos((fs) => fs.filter((f) => f.id !== id))}
          />
        )}
      </Seccion>

      <div className="no-print sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-[16px] bg-white/95 p-3 shadow-[0_-8px_30px_-12px_rgb(24_24_27/0.25)] ring-1 ring-zinc-200 backdrop-blur md:bottom-4">
        <ErrorCaja error={errorGeneral} />
        {creada && errorGeneral ? (
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="secundario" tam="lg" onClick={() => ir(`/orden/${creada.id}`)}>Ir a la orden</Boton>
            <Boton tam="lg" cargando={ocupado} onClick={reintentar}>Reintentar</Boton>
          </div>
        ) : (
          <Boton type="submit" variante="marca" tam="lg" cargando={ocupado} icono={ArrowRightIcon} className="w-full">
            {enviando || 'Crear orden de trabajo'}
          </Boton>
        )}
      </div>
    </form>
  )
}

function Rapido({ activo, children, ...p }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      className={cx(
        'num h-10 rounded-[9px] px-3 text-sm font-medium ring-1 ring-inset transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97]',
        activo ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-300 hover:ring-zinc-400',
      )}
      {...p}
    >
      {children}
    </button>
  )
}

function Seleccionado({ icono: I, titulo, detalle, onCambiar }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] bg-white px-4 py-3.5 ring-2 ring-zinc-900">
      <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-zinc-900 text-white">
        <CheckIcon className="size-5" weight="bold" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold"><I className="size-4 text-zinc-500" aria-hidden /><span className="truncate">{titulo}</span></span>
        {detalle && <span className="block truncate text-sm text-zinc-500">{detalle}</span>}
      </span>
      <Boton variante="fantasma" tam="sm" onClick={onCambiar}>Cambiar</Boton>
    </div>
  )
}
