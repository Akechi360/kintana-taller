import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as c from './calc.js'

test('hp/kw', () => {
  assert.equal(c.hpAKw(50), 37.29)
  assert.equal(c.kwAHp(37), 49.62)
  assert.equal(c.hpAKw(''), '')
})

test('voltaje y megger', () => {
  assert.equal(c.voltajeNominal('220/440'), 440)
  assert.equal(c.tensionMegger(440).texto, '500 V CC')
  assert.equal(c.tensionMegger(4160).texto, '2500 V CC')
})

test('aislamiento corregido a 40 C e IP', () => {
  assert.equal(c.corregirA40(400, 20), 100)
  const r = c.evaluarAislamiento({ r1: 400, r10: 1000, r30s: 300, temp: 20, vnom: 440 })
  assert.equal(r.r40, 100)
  assert.equal(r.minimo, 5)
  assert.equal(r.nivelR, 'ok')
  assert.equal(r.ip, 2.5)
  assert.equal(r.nivelIP, 'ok')
  assert.equal(c.etiquetaIP(1.4), 'Cuestionable')
  assert.equal(c.evaluarAislamiento({ r1: 2, r10: 1.5, temp: 40, vnom: 440 }).nivelIP, 'mal')
  assert.equal(c.evaluarAislamiento({ r1: '3,5', temp: 40, vnom: 440 }).nivelR, 'mal')
})

test('desbalance', () => {
  assert.equal(Math.round(c.desbalance([10, 10, 10.6]) * 100) / 100, 3.92)
  assert.equal(c.nivelDesbalanceResistencia(1.5), 'ok')
  assert.equal(c.nivelDesbalanceResistencia(1.5, true), 'alerta')
  assert.ok(Number.isNaN(c.desbalance([5])))
})

test('hipot y vibracion', () => {
  assert.deepEqual(c.hipot(440), { ca: 1880, cc: 3196 })
  assert.equal(c.limiteVibracion('rigida'), 2.16)
})

test('bobinado planilla 1127: 72 ranuras, 1800 rpm, paso 1 a 16', () => {
  const r = c.revisarBobinado({ ranuras: 72, paso: '1 a 16', rpm: 1800 })
  assert.equal(r.polos, 4)
  assert.equal(r.q, 6)
  assert.equal(Math.round(r.acortamiento * 1000) / 1000, 0.833)
  assert.deepEqual(r.avisos, [])
  assert.equal(c.polosDesdeRpm(1750), 4)
  assert.equal(c.polosDesdeRpm(1160), 6)
  assert.equal(c.revisarBobinado({ ranuras: 70, paso: '1-16', rpm: 1800 }).avisos.length, 1)
})

test('fallas de pruebas finales', () => {
  assert.deepEqual(c.fallasPruebas({ pf_megger_r1: 1870, pf_megger_r10: 5230, pf_megger_temp: 28, pf_vibracion: '1,6' }, 440), [])
  const f = c.fallasPruebas({ pf_megger_r1: 2, pf_megger_r10: 1.5, pf_megger_temp: 40, pf_vibracion: '3.1', pf_hipot_ok: 'no' }, 440)
  assert.equal(f.length, 4)
})
