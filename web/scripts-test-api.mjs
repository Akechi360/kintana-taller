// Prueba de seguridad y flujo contra el servidor local con datos demo.
// Uso: node scripts-test-api.mjs   (despues: pocketbase.exe seed reset)
import PocketBase from 'pocketbase'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const URL = process.env.PB_URL || 'http://127.0.0.1:8090'
const claves = JSON.parse(readFileSync(new globalThis.URL('../server/accesos-demo.json', import.meta.url)))
const login = async (u) => {
  const pb = new PocketBase(URL)
  pb.autoCancellation(false)
  await pb.collection('users').authWithPassword(u, claves[u])
  return pb
}
const falla = async (p, status) => {
  try { await p } catch (e) { if (status) assert.equal(e.status, status, e.message); return e }
  assert.fail(`se esperaba error ${status || ''}`)
}
let n = 0
const ok = (m) => console.log(`ok ${++n} - ${m}`)

const anon = new PocketBase(URL)
assert.equal((await anon.collection('ordenes').getList(1, 50)).totalItems, 0); ok('anonimo no ve ordenes')
await falla(anon.collection('users').create({ usuario: 'intruso', rol: 'admin', password: '12345678', passwordConfirm: '12345678' })); ok('nadie se registra solo')

const admin = await login('admin')
const w = await login('wcastaneda')
const y = await login('yrozo')
const wid = w.authStore.record.id

const todas = await admin.collection('ordenes').getFullList()
const deW = await w.collection('ordenes').getFullList()
assert.ok(deW.length > 0 && deW.length < todas.length)
assert.ok(deW.every((o) => o.tecnico === wid)); ok(`tecnico ve solo las suyas (${deW.length} de ${todas.length})`)

const deY = todas.find((o) => o.tecnico !== wid)
await falla(w.collection('ordenes').getOne(deY.id), 404); ok('tecnico no abre orden ajena')
await falla(w.collection('ordenes').update(deY.id, { notas: 'x' }), 404); ok('tecnico no edita orden ajena')
assert.equal((await w.collection('fotos').getFullList()).every((f) => deW.some((o) => o.id === f.orden)), true); ok('fotos solo de sus ordenes')
assert.equal((await w.collection('precios').getList(1, 5)).totalItems, 0); ok('tecnico no ve precios')
assert.equal((await w.collection('cotizaciones').getList(1, 5)).totalItems, 0); ok('tecnico no ve cotizaciones')
await falla(w.collection('users').update(wid, { rol: 'admin' })); ok('tecnico no se vuelve admin')

// flujo: crear orden como tecnico
const cliente = await w.collection('clientes').create({ nombre: 'Prueba Automática S.A.S.' })
const motor = await w.collection('motores').create({ cliente: cliente.id, marca: 'WEG', hp: 3 })
const o1 = await w.collection('ordenes').create({ cliente: cliente.id, motor: motor.id, estado: 'entregado', tecnico: deY.tecnico })
assert.equal(o1.estado, 'recibido'); assert.equal(o1.tecnico, wid); ok('al crear se fuerza recibido y el tecnico que crea')
assert.equal(o1.numero, Math.max(...todas.map((o) => o.numero)) + 1); ok(`consecutivo automatico ${o1.numero}`)
const o2 = await w.collection('ordenes').create({ cliente: cliente.id, motor: motor.id })
assert.equal(o2.numero, o1.numero + 1); ok('consecutivo incrementa')

await falla(w.collection('ordenes').update(o1.id, { estado: 'cotizacion' }), 400); ok('tecnico no se salta etapas')
await falla(w.collection('ordenes').update(o1.id, { tecnico: y.authStore.record.id }), 403); ok('tecnico no reasigna')
const o1b = await w.collection('ordenes').update(o1.id, { estado: 'diagnostico', diagnostico: { megger_r1: '120' } })
assert.equal(o1b.estado, 'diagnostico'); ok('tecnico avanza un paso')
const o1c = await w.collection('ordenes').update(o1.id, { estado: 'cotizacion' })
await falla(w.collection('ordenes').update(o1.id, { estado: 'aprobacion' }), 400); ok('cotizacion/aprobacion solo admin')
const ev = await w.collection('eventos').getFullList({ filter: `orden = "${o1.id}"`, sort: 'created' })
assert.deepEqual(ev.map((e) => e.a), ['recibido', 'diagnostico', 'cotizacion']); ok('historial de eventos registrado')
await falla(w.collection('eventos').create({ orden: o1.id, a: 'entregado' })); ok('eventos no se falsifican')

const cot = await admin.collection('cotizaciones').create({ orden: o1c.id, items: [], estado: 'borrador' })
assert.ok(cot.numero >= 6734); ok(`cotizacion con consecutivo ${cot.numero}`)
await admin.collection('ordenes').update(o1.id, { estado: 'reparacion' }); ok('admin mueve libremente')

const rec = await w.send('/api/kintana/recetas?ranuras=72&di=32&largo=51', {})
assert.ok(rec.length >= 1 && rec.every((r) => !('cliente' in r))); ok(`recetas por nucleo (${rec.length}) sin datos de cliente`)
await falla(anon.send('/api/kintana/recetas?ranuras=72', {}), 401); ok('recetas requieren sesion')

// limpieza
await admin.collection('ordenes').delete(o1.id)
await admin.collection('ordenes').delete(o2.id)
await admin.collection('motores').delete(motor.id)
await admin.collection('clientes').delete(cliente.id)
console.log(`\n${n} pruebas OK`)
