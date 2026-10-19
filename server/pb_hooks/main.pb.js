/// <reference path="../pb_data/types.d.ts" />
// Nota: cada handler corre aislado, por eso se hace require() adentro.

// Consecutivos: se asignan al guardar (dentro de la transaccion), nunca desde el cliente.
onRecordCreate((e) => {
  const f = require(`${__hooks}/flujo.js`)
  e.record.set("numero", f.siguienteNumero(e.app, "ordenes", 1128))
  e.next()
}, "ordenes")

onRecordCreate((e) => {
  const f = require(`${__hooks}/flujo.js`)
  e.record.set("numero", f.siguienteNumero(e.app, "cotizaciones", 6734))
  e.next()
}, "cotizaciones")

onRecordCreateRequest((e) => {
  const f = require(`${__hooks}/flujo.js`)
  const admin = f.esAdmin(e)
  const uid = e.auth && !e.hasSuperuserAuth() ? e.auth.id : ""
  if (!admin || !e.record.getString("tecnico")) e.record.set("tecnico", uid)
  if (!admin || !e.record.getString("estado")) e.record.set("estado", "recibido")
  e.record.set("creado_por", uid)
  e.record.set("estado_desde", new DateTime())
  e.next()
  f.registrarEvento(e.app, e.record.id, "", e.record.getString("estado"), uid, "Orden creada")
}, "ordenes")

onRecordUpdateRequest((e) => {
  const f = require(`${__hooks}/flujo.js`)
  const admin = f.esAdmin(e)
  const antes = e.record.original()
  const de = antes.getString("estado")
  const a = e.record.getString("estado")

  if (!admin) {
    for (const campo of ["tecnico", "numero", "creado_por"]) {
      if (e.record.getString(campo) !== antes.getString(campo)) {
        throw new ForbiddenError("Solo administración puede cambiar " + campo + ".")
      }
    }
  }
  if (!f.puedeMover(admin, de, a)) {
    throw new BadRequestError("No se puede pasar de " + de + " a " + a + ". Pide a administración que mueva la orden.")
  }
  if (de !== a) e.record.set("estado_desde", new DateTime())
  e.next()
  if (de !== a) {
    const uid = e.auth && !e.hasSuperuserAuth() ? e.auth.id : ""
    f.registrarEvento(e.app, e.record.id, de, a, uid, "")
  }
}, "ordenes")

onRecordCreateRequest((e) => {
  const uid = e.auth && !e.hasSuperuserAuth() ? e.auth.id : ""
  e.record.set("autor", uid)
  if (!e.record.getString("etapa")) {
    const orden = e.app.findRecordById("ordenes", e.record.getString("orden"))
    e.record.set("etapa", orden.getString("estado"))
  }
  e.next()
}, "fotos")

// Recetas de bobinado: conocimiento del taller, visible para todo usuario autenticado,
// pero sin datos del cliente.
routerAdd("GET", "/api/kintana/recetas", (e) => {
  const q = e.request.url.query()
  const ranuras = parseFloat(q.get("ranuras")) || 0
  const di = parseFloat(q.get("di")) || 0
  const largo = parseFloat(q.get("largo")) || 0
  // ponytail: escaneo en memoria de las ultimas 3000 ordenes; pasar a tabla indexada si crece mas.
  const rows = e.app.findRecordsByFilter("ordenes", "id != ''", "-created", 3000, 0)
  const out = []
  for (const r of rows) {
    const b = JSON.parse(r.getString("bobinado") || "null")
    if (!b || !b.ranuras) continue
    if (ranuras && Number(b.ranuras) !== ranuras) continue
    if (di && Math.abs(Number(b.diametro_interno) - di) > 1) continue
    if (largo && Math.abs(Number(b.largo) - largo) > 2) continue
    const m = e.app.findRecordById("motores", r.getString("motor"))
    out.push({
      orden: r.getInt("numero"),
      fecha: r.getString("created"),
      motor: { marca: m.getString("marca"), hp: m.getFloat("hp"), rpm: m.getInt("rpm"), voltaje: m.getString("voltaje") },
      bobinado: b,
    })
    if (out.length >= 30) break
  }
  return e.json(200, out)
}, $apis.requireAuth())
