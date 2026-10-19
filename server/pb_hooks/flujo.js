// Linea de produccion. El frontend tiene una copia de ESTADOS en web/src/lib/flujo.js.
const ESTADOS = ["recibido", "diagnostico", "cotizacion", "aprobacion", "reparacion", "pruebas", "listo", "entregado"]

// Etapas desde las que un tecnico puede avanzar (solo al siguiente paso).
// cotizacion, aprobacion y entregado son decisiones de administracion.
const TECNICO_AVANZA = ["recibido", "diagnostico", "reparacion", "pruebas"]

function esAdmin(e) {
  return e.hasSuperuserAuth() || (e.auth && e.auth.getString("rol") === "admin")
}

function puedeMover(admin, de, a) {
  if (de === a) return true
  if (ESTADOS.indexOf(a) < 0) return false
  if (admin) return true
  return TECNICO_AVANZA.indexOf(de) >= 0 && ESTADOS.indexOf(a) === ESTADOS.indexOf(de) + 1
}

function siguienteNumero(app, coleccion, inicio) {
  const r = app.findRecordsByFilter(coleccion, "numero > 0", "-numero", 1, 0)
  return r.length ? r[0].getInt("numero") + 1 : inicio
}

function registrarEvento(app, ordenId, de, a, usuarioId, nota) {
  const ev = new Record(app.findCollectionByNameOrId("eventos"))
  ev.set("orden", ordenId)
  ev.set("de", de)
  ev.set("a", a)
  ev.set("usuario", usuarioId || "")
  ev.set("nota", nota || "")
  app.save(ev)
}

module.exports = { ESTADOS, esAdmin, puedeMover, siguienteNumero, registrarEvento }
