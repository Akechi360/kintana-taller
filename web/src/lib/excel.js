import { ETAPA, TIPOS } from './flujo.js'
import { diasDesde } from './fmt.js'

const fecha = (v) => (v ? new Date(String(v).replace(' ', 'T')) : '')

async function descargar(libro, nombre) {
  const XLSX = await import('xlsx')
  XLSX.writeFile(libro(XLSX), nombre, { compression: true })
}

// Reemplaza el "pasar a mano al Excel": una fila por orden con todo lo relevante.
export function exportarOrdenes(ordenes) {
  return descargar((XLSX) => {
    const filas = ordenes.map((o) => {
      const c = o.expand?.cliente || {}
      const m = o.expand?.motor || {}
      const d = o.diagnostico || {}
      const b = o.bobinado || {}
      return {
        'OT': o.numero,
        'Fecha ingreso': fecha(o.created),
        'Estado': ETAPA[o.estado]?.nombre || o.estado,
        'Días en etapa': Math.round(diasDesde(o.estado_desde) * 10) / 10,
        'Tipo': TIPOS[o.tipo] || '',
        'Técnico': o.expand?.tecnico?.name || '',
        'Cliente': c.nombre || '',
        'NIT': c.nit || '',
        'Contacto': c.contacto || '',
        'Teléfono': c.telefono || '',
        'Marca': m.marca || '',
        'Serial': m.serial || '',
        'HP': m.hp || '',
        'kW': m.kw || '',
        'RPM': m.rpm || '',
        'Voltaje': m.voltaje || '',
        'Rodamiento LA': m.rodamiento_la || '',
        'Rodamiento LOA': m.rodamiento_loa || '',
        'Falla reportada': o.falla_reportada || '',
        'Megger 1 min (MΩ)': d.megger_r1 || '',
        'Megger 10 min (MΩ)': d.megger_r10 || '',
        'Trabajos requeridos': (d.trabajos || []).join(', '),
        'Ranuras': b.ranuras || '',
        'Paso': b.paso || '',
        'Espiras': b.espiras || '',
        'Hilos': b.hilos || '',
        'Calibre': b.calibre || '',
        'Peso alambre (kg)': b.peso_kg || '',
        'Conexión bobinado': b.conexion || '',
      }
    })
    const ws = XLSX.utils.json_to_sheet(filas, { cellDates: true, dateNF: 'dd/mm/yyyy' })
    ws['!cols'] = Object.keys(filas[0] || { a: 1 }).map((k) => ({ wch: Math.max(10, Math.min(36, k.length + 4)) }))
    ws['!autofilter'] = { ref: ws['!ref'] }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Órdenes')
    return wb
  }, `kintana-ordenes-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportarCotizacion({ cot, orden, items, subtotal, iva, total }) {
  return descargar((XLSX) => {
    const c = orden.expand?.cliente || {}
    const m = orden.expand?.motor || {}
    const aoa = [
      ['KINTANA ELECTRICIDAD INDUSTRIAL'],
      ['CRA 36 # 8-392, Zipaquirá · Tel. 313 234 5748'],
      [],
      ['Cotización N°', cot.numero, '', 'Fecha', new Date()],
      ['Orden de trabajo', orden.numero],
      ['Cliente', c.nombre || '', '', 'NIT', c.nit || ''],
      ['Contacto', c.contacto || '', '', 'Teléfono', c.telefono || ''],
      ['Equipo', [m.marca, m.hp && `${m.hp} HP`, m.rpm && `${m.rpm} rpm`, m.voltaje && `${m.voltaje} V`].filter(Boolean).join(' · ')],
      [],
      ['Descripción', 'Cantidad', 'Unidad', 'Valor unitario', 'Subtotal'],
      ...items.map((it) => [it.descripcion, Number(it.cantidad) || 0, it.unidad || '', Number(it.valor) || 0, (Number(it.cantidad) || 0) * (Number(it.valor) || 0)]),
      [],
      ['', '', '', 'Subtotal', subtotal],
      ...(iva ? [['', '', '', 'IVA 19 %', iva]] : []),
      ['', '', '', 'Total', total],
      [],
      ['Notas', cot.notas || ''],
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd/mm/yyyy' })
    ws['!cols'] = [{ wch: 48 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 18 }]
    const fmt = '"$"#,##0'
    for (const [addr, cell] of Object.entries(ws)) {
      if (addr[0] === '!' || typeof cell.v !== 'number') continue
      if (/^[DE]\d+$/.test(addr) && Number(addr.slice(1)) > 10) cell.z = fmt
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Cotización ${cot.numero}`)
    return wb
  }, `cotizacion-${cot.numero}-OT${orden.numero}.xlsx`)
}
