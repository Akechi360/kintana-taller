// Copia de server/pb_hooks/flujo.js (el servidor es quien valida).
export const ESTADOS = ['recibido', 'diagnostico', 'cotizacion', 'aprobacion', 'reparacion', 'pruebas', 'listo', 'entregado']

export const ETAPA = {
  recibido: { nombre: 'Recibido', corto: 'Recibido', accion: 'Enviar a diagnóstico' },
  diagnostico: { nombre: 'Diagnóstico', corto: 'Diagnóstico', accion: 'Enviar a cotización' },
  cotizacion: { nombre: 'Cotización', corto: 'Cotizar', accion: 'Enviar al cliente' },
  aprobacion: { nombre: 'Esperando cliente', corto: 'Cliente', accion: 'Cliente aprobó: reparar' },
  reparacion: { nombre: 'En reparación', corto: 'Reparación', accion: 'Enviar a pruebas' },
  pruebas: { nombre: 'Pruebas', corto: 'Pruebas', accion: 'Marcar listo para entrega' },
  listo: { nombre: 'Listo para entrega', corto: 'Listo', accion: 'Registrar entrega' },
  entregado: { nombre: 'Entregado', corto: 'Entregado', accion: '' },
}

const TECNICO_AVANZA = ['recibido', 'diagnostico', 'reparacion', 'pruebas']

export const siguiente = (estado) => ESTADOS[ESTADOS.indexOf(estado) + 1] || null
export const tecnicoPuedeAvanzar = (estado) => TECNICO_AVANZA.includes(estado)
export const indice = (estado) => ESTADOS.indexOf(estado)

export const TIPOS = {
  diagnostico: 'Diagnóstico',
  preventivo: 'Mantenimiento preventivo',
  correctivo: 'Correctivo',
  bobinado: 'Rebobinado',
}

// Trabajos que el tecnico marca en el diagnostico; "clave" enlaza con la lista de precios.
export const TRABAJOS = [
  { clave: 'rodamientos', nombre: 'Cambio de rodamientos' },
  { clave: 'rebobinado', nombre: 'Rebobinado' },
  { clave: 'barnizado', nombre: 'Lavado, horneado y barnizado' },
  { clave: 'ventilador', nombre: 'Ventilador' },
  { clave: 'caperuza', nombre: 'Caperuza' },
  { clave: 'limpieza_pintura', nombre: 'Limpieza y pintura' },
  { clave: 'tornilleria', nombre: 'Tornillería' },
  { clave: 'terminales', nombre: 'Terminales y bornera' },
  { clave: 'eje', nombre: 'Recuperación de eje' },
  { clave: 'alojamientos', nombre: 'Encamisado de alojamientos' },
  { clave: 'balanceo', nombre: 'Balanceo dinámico' },
]
