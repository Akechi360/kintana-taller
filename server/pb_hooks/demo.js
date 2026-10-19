/// <reference path="../pb_data/types.d.ts" />
// Carga los datos de demostracion. Lo usan el comando `seed` y el arranque con KINTANA_DEMO=1.
module.exports = function cargarDemo(app, reset) {
  const base = __hooks + "/.."
  const col = (n) => app.findCollectionByNameOrId(n)
  const crear = (n, data) => {
    const r = new Record(col(n))
    for (const k in data) r.set(k, data[k])
    app.save(r)
    return r
  }
  const fecha = (diasAtras) => new Date(Date.now() - diasAtras * 86400000).toISOString().replace("T", " ")
  const sql = (q, p) => app.db().newQuery(q).bind(p).execute()

  if (app.countRecords("ordenes") > 0 && !reset) {
    console.log("Demo: la base ya tiene ordenes (para recargar: pocketbase.exe seed reset)")
    return null
  }
  if (reset) {
    for (const n of ["cotizaciones", "fotos", "eventos", "ordenes", "motores", "clientes", "precios", "users"]) {
      for (const r of app.findAllRecords(n)) app.delete(r)
    }
  }

  // --- usuarios (claves estables entre resets)
  const rutaAccesos = base + "/accesos-demo.json"
  let claves = {}
  try { claves = JSON.parse(toString($os.readFile(rutaAccesos))) } catch (_) { claves = {} }
  const personas = [
    ["admin", "Administración Kintana", "admin"],
    ["wcastaneda", "Wilmer Castañeda", "tecnico"],
    ["yrozo", "Yeison Rozo", "tecnico"],
    ["ngarzon", "Nelson Garzón", "tecnico"],
  ]
  const U = {}
  for (const [usuario, nombre, rol] of personas) {
    if (!claves[usuario]) claves[usuario] = $security.randomStringWithAlphabet(10, "abcdefghjkmnpqrstuvwxyz23456789")
    const u = new Record(col("users"))
    u.set("usuario", usuario)
    u.set("name", nombre)
    u.set("rol", rol)
    u.set("verified", true)
    u.setPassword(claves[usuario])
    app.save(u)
    U[usuario] = u
  }
  try { $os.writeFile(rutaAccesos, JSON.stringify(claves, null, 2), 0o600) } catch (_) { /* hosting sin escritura */ }
  console.log("Demo: usuarios y claves -> " + JSON.stringify(claves))

  // --- precios de ejemplo (COP); administracion los ajusta en Precios
  const precios = [
    ["rodamientos", "Rodamiento (referencia por confirmar)", "und", 95000],
    ["rod_6312", "Rodamiento 6312 2RS C3", "und", 168400],
    ["rod_6212", "Rodamiento 6212 2RS C3", "und", 112700],
    ["rod_6309", "Rodamiento 6309 ZZ C3", "und", 88900],
    ["rod_6209", "Rodamiento 6209 ZZ C3", "und", 51600],
    ["rod_6308", "Rodamiento 6308 ZZ C3", "und", 73800],
    ["rod_6206", "Rodamiento 6206 ZZ C3", "und", 28500],
    ["rod_6205", "Rodamiento 6205 ZZ C3", "und", 23900],
    ["mo_rodamientos", "Mano de obra desmontaje y montaje de rodamientos", "und", 118000],
    ["rebobinado", "Rebobinado completo, alambre esmaltado clase H", "HP", 37600],
    ["barnizado", "Lavado, horneado y barnizado del devanado", "und", 184000],
    ["ventilador", "Ventilador nuevo", "und", 86500],
    ["caperuza", "Caperuza (reparación o fabricación)", "und", 94000],
    ["limpieza_pintura", "Limpieza general y pintura epóxica", "und", 112000],
    ["tornilleria", "Tornillería completa grado 5", "und", 34800],
    ["terminales", "Terminales y regleta de bornera", "und", 47900],
    ["eje", "Recuperación de eje: relleno y rectificado", "und", 262000],
    ["alojamientos", "Encamisado de alojamiento de rodamiento", "und", 193000],
    ["balanceo", "Balanceo dinámico del rotor", "und", 171500],
  ]
  for (const [clave, descripcion, unidad, valor] of precios) crear("precios", { clave, descripcion, unidad, valor })

  // --- clientes
  const C = {
    arssa: crear("clientes", { nombre: "Arssa Materiales S.A.S.", nit: "901348275-6", contacto: "Jefe de mantenimiento", telefono: "3104827731", ciudad: "Zipaquirá", direccion: "Vía Zipaquirá – Cogua km 3" }),
    ladrillera: crear("clientes", { nombre: "Ladrillera San Cayetano del Norte S.A.S.", nit: "900612904-1", contacto: "Hernán Bustos", telefono: "3157093418", ciudad: "Cogua" }),
    lacteos: crear("clientes", { nombre: "Lácteos Pradera Alta S.A.S.", nit: "830159662-3", contacto: "Diana Moscoso", telefono: "3002186954", ciudad: "Tocancipá" }),
    flores: crear("clientes", { nombre: "Flores La Esmeralda de Cajicá S.A.S.", nit: "860540331-8", contacto: "Óscar Rubiano", telefono: "3212475860", ciudad: "Cajicá" }),
    concretos: crear("clientes", { nombre: "Concretos Neusa Ltda.", nit: "900287413-0", contacto: "Ing. Milena Ruge", telefono: "3186630427", ciudad: "Tausa" }),
    acueducto: crear("clientes", { nombre: "Asociación Acueducto Vereda Barandillas", nit: "832004761-9", contacto: "Fabio Cárdenas", telefono: "3135918204", ciudad: "Zipaquirá" }),
  }
  const motor = (cliente, m) => crear("motores", Object.assign({ cliente: C[cliente].id, fases: "trifasico" }, m))

  // --- ordenes: se crean de la mas vieja a la mas nueva para que el consecutivo tenga sentido
  const ESTADOS = ["recibido", "diagnostico", "cotizacion", "aprobacion", "reparacion", "pruebas", "listo", "entregado"]
  const bobinado300 = { dato_original: "no", diametro_interno: "32", diametro_externo: "51", largo: "51", ranuras: "72", paso: "1 a 16", espiras: "5", hilos: "21", calibre: "AWG 17", peso_kg: "160", conexion: "4Δ", circuitos: "4", puntas: "12", cabeza_cm: "74", aislamiento: "Fibra Royal # 0,40", clase: "H", notas: "74 cm de cabeza. 12 puntas afuera. Amarre doble en cabezas." }
  const pruebasOk = { pf_megger_v: "500", pf_megger_temp: "28", pf_megger_r30s: "1410", pf_megger_r1: "1870", pf_megger_r10: "5230", pf_res_uv: "0.412", pf_res_vw: "0.415", pf_res_wu: "0.409", pf_hipot_v: "1880", pf_hipot_ok: "si", pf_surge_ok: "si", pf_i_f1: "11.8", pf_i_f2: "12.1", pf_i_f3: "11.9", pf_v: "442", pf_rpm: "1794", pf_temp_la: "41", pf_temp_loa: "38", pf_base: "resiliente", pf_vibracion: "1.6", pf_conforme: true }

  const ordenes = [
    // entregadas: dejan recetas de bobinado para buscar
    { c: "concretos", t: "ngarzon", tipo: "bobinado", dias: [41, 40, 38, 36, 33, 26, 24, 23], falla: "Disparo de protecciones. Olor a quemado.",
      m: { marca: "WEG", serial: "1018734459", frame: "355M/L", hp: 300, kw: 223.71, rpm: 1785, voltaje: "440", amperaje: 352, conexion: "Δ", rodamiento_la: "6322", rodamiento_loa: "6319" },
      bobinado: { dato_original: "si", diametro_interno: "32.2", diametro_externo: "51", largo: "50.5", ranuras: "72", paso: "1 a 16", espiras: "5", hilos: "21", calibre: "AWG 17", peso_kg: "158", conexion: "4Δ", circuitos: "4", puntas: "12", cabeza_cm: "73", aislamiento: "Fibra Royal # 0,40", clase: "H", notas: "Datos tomados del bobinado original. Cabeza LOA 73 cm." },
      pruebas: pruebasOk, entrega: ["Milena Ruge", "52873140"] },
    { c: "flores", t: "yrozo", tipo: "correctivo", dias: [19, 18.6, 17.9, 16, 14.2, 13, 12.4, 12],
      m: { marca: "Siemens", serial: "UD 1903/1176284", frame: "160M", hp: 15, kw: 11.19, rpm: 1760, voltaje: "220/440", amperaje: 19.4, conexion: "YY", rodamiento_la: "6309", rodamiento_loa: "6209" },
      falla: "Ruido en rodamientos. Vibración.", diagnostico: { encendido: "si", rod_ruido: "si", rod_vibracion: "si", rod_cambio: "si", trabajos: ["rodamientos", "limpieza_pintura"], megger_v: "500", megger_temp: "24", megger_r1: "820", megger_r10: "2210" },
      pruebas: Object.assign({}, pruebasOk, { pf_i_f1: "6.9", pf_i_f2: "7.1", pf_i_f3: "7.0", pf_rpm: "1792" }), entrega: ["Óscar Rubiano", "79604218"] },
    { c: "acueducto", t: "wcastaneda", tipo: "bobinado", dias: [12, 11.7, 10.8, 9.9, 8.8, 5.1, 4.6, 4.2],
      m: { marca: "WEG", serial: "1027746103", frame: "160L", hp: 25, kw: 18.64, rpm: 3530, voltaje: "440", amperaje: 30.5, conexion: "Δ", rodamiento_la: "6309", rodamiento_loa: "6209" },
      falla: "Bomba sumergida en inundación. Aislamiento a tierra.",
      bobinado: { dato_original: "si", diametro_interno: "15.6", diametro_externo: "26", largo: "16.5", ranuras: "36", paso: "1 a 15", espiras: "9", hilos: "6", calibre: "AWG 18", peso_kg: "14.5", conexion: "2Δ", circuitos: "2", puntas: "6", cabeza_cm: "21", aislamiento: "Nomex 0,25", clase: "F" },
      pruebas: Object.assign({}, pruebasOk, { pf_i_f1: "9.4", pf_i_f2: "9.6", pf_i_f3: "9.5", pf_rpm: "3588" }), entrega: ["Fabio Cárdenas", "11203877"] },

    // en proceso
    { c: "lacteos", t: "yrozo", tipo: "preventivo", dias: [6.3, 6.1, 5.2, 4.9, 4.1, 2.2, 0.9], m: { marca: "Siemens", serial: "UE 2106/0049133", frame: "112M", hp: 5, kw: 3.73, rpm: 1745, voltaje: "220/440", amperaje: 6.9, conexion: "YY", rodamiento_la: "6206", rodamiento_loa: "6205" },
      falla: "Mantenimiento programado.", diagnostico: { encendido: "si", tapas: "bueno", bornera: "bueno", ventilador: "bueno", caperuza: "bueno", eje: "bueno", rod_cambio: "si", trabajos: ["rodamientos", "barnizado"], megger_v: "500", megger_temp: "23", megger_r1: "310", megger_r10: "610" },
      pruebas: Object.assign({}, pruebasOk, { pf_i_f1: "3.1", pf_i_f2: "3.2", pf_i_f3: "3.1" }) },
    { c: "ladrillera", t: "ngarzon", tipo: "correctivo", dias: [7.4, 7.1, 6.0, 5.6, 4.4, 1.3], m: { marca: "WEG", serial: "1015563871", frame: "225S/M", hp: 40, kw: 29.83, rpm: 1770, voltaje: "440", amperaje: 48.2, conexion: "Δ", rodamiento_la: "6314", rodamiento_loa: "6314" },
      falla: "Recalienta. Dispara protecciones a la hora de trabajo.", diagnostico: { encendido: "si", rod_ajuste: "regular", rod_cambio: "si", trabajos: ["rodamientos", "alojamientos", "barnizado"], megger_v: "500", megger_temp: "25", megger_r1: "96", megger_r10: "158" },
      pruebas: { pf_megger_v: "500", pf_megger_temp: "27", pf_megger_r1: "1240", pf_megger_r10: "3010", pf_res_uv: "0.218", pf_res_vw: "0.221", pf_res_wu: "0.219" } },
    { c: "concretos", t: "wcastaneda", tipo: "bobinado", dias: [5.2, 5.0, 4.1, 3.6, 2.9], m: { marca: "WEG", serial: "1031208842", frame: "355M/L", hp: 300, kw: 223.71, rpm: 1800, voltaje: "440", amperaje: 349, conexion: "Δ", rodamiento_la: "6322", rodamiento_loa: "6319" },
      falla: "Devanado quemado. Llega desarmado de planta.", diagnostico: { encendido: "no", trabajos: ["rebobinado", "barnizado", "rodamientos"], megger_v: "500", megger_temp: "21", megger_r1: "0.4", megger_r10: "0.4" },
      bobinado: bobinado300, fotos: [["planilla-bobinado-1127.jpg", "Otra", "reparacion"]] },
    { c: "flores", t: "yrozo", tipo: "correctivo", dias: [7.9, 7.6, 6.5, 5.6], m: { marca: "Baldor", serial: "Z1904211873", frame: "213T", hp: 7.5, kw: 5.59, rpm: 1770, voltaje: "230/460", amperaje: 9.2, conexion: "YY", rodamiento_la: "6308", rodamiento_loa: "6206" },
      falla: "Ruido en rodamientos.", diagnostico: { encendido: "si", rod_ruido: "si", rod_cambio: "si", ventilador: "malo", trabajos: ["rodamientos", "ventilador", "limpieza_pintura"], megger_v: "500", megger_temp: "22", megger_r1: "540", megger_r10: "1380" }, cot: true },
    { c: "lacteos", t: "ngarzon", tipo: "diagnostico", dias: [3.1, 2.9, 1.1], m: { marca: "ABB", serial: "3GAA132214-ADE", frame: "132M", hp: 10, kw: 7.46, rpm: 1755, voltaje: "220/440", amperaje: 12.8, conexion: "YY", rodamiento_la: "6308", rodamiento_loa: "6208" },
      falla: "Vibración. Ruido en rodamientos.", diagnostico: { encendido: "si", fisuras: "no", tapas: "bueno", bornera: "regular", ventilador: "bueno", caperuza: "bueno", eje: "bueno", rod_ruido: "si", rod_vibracion: "si", rod_fuga: "no", rod_ajuste: "bueno", rod_cambio: "si", trabajos: ["rodamientos", "terminales", "limpieza_pintura"], megger_v: "500", megger_temp: "24", megger_r30s: "260", megger_r1: "410", megger_r10: "1190", res_uv: "1.212", res_vw: "1.218", res_wu: "1.209", observaciones: "Juego radial en rodamiento LA. Bornera con terminal flojo en fase W." } },
    { c: "arssa", t: "wcastaneda", tipo: "preventivo", dias: [1.4, 0.9], m: { marca: "WEG", serial: "1024497316", frame: "225S/M", hp: 50, kw: 37.29, rpm: 1800, voltaje: "440", amperaje: 59.6, conexion: "Δ", rodamiento_la: "6312", rodamiento_loa: "6212" },
      falla: "Mantenimiento programado. 8 cámaras.", recepcion: { accesorios: ["Caja de bornes", "Ventilador", "Caperuza"], estado_fisico: "Ventilador con aspas partidas. Tapa LA con fisura visible." },
      diagnostico: { encendido: "no", fisuras: "si", tapas: "bueno", ventilador: "malo", caperuza: "bueno", eje: "bueno", rod_ruido: "si", rod_vibracion: "si", rod_fuga: "si", rod_ajuste: "bueno", rod_cambio: "si", megger_v: "500", megger_temp: "22", megger_r1: "3.2", megger_r10: "3.5" },
      fotos: [["planilla-preventivo-arssa.jpg", "Otra", "diagnostico"]] },
    { c: "ladrillera", t: "ngarzon", tipo: "diagnostico", dias: [0.35], m: { marca: "Siemens", serial: "UD 1712/2203915", frame: "180M", hp: 25, kw: 18.64, rpm: 1760, voltaje: "440", amperaje: 31.0, conexion: "Δ", rodamiento_la: "6310", rodamiento_loa: "6210" },
      falla: "No arranca. Huele a quemado.", recepcion: { accesorios: ["Polea", "Chaveta"], estado_fisico: "Oreja de izaje doblada." } },
    { c: "acueducto", t: "yrozo", tipo: "correctivo", prioridad: "urgente", dias: [0.12], m: { marca: "WEG", serial: "1029915507", frame: "132S/M", hp: 15, kw: 11.19, rpm: 3530, voltaje: "440", amperaje: 18.7, conexion: "Δ", rodamiento_la: "6308", rodamiento_loa: "6207" },
      falla: "Dispara protecciones. Bomba principal del acueducto: sin agua en la vereda.", recepcion: { accesorios: ["Acople", "Base"], estado_fisico: "" } },
  ]

  ordenes.sort((a, b) => b.dias[0] - a.dias[0]) // consecutivo en orden de llegada
  for (const o of ordenes) {
    const m = motor(o.c, o.m)
    const etapa = ESTADOS[o.dias.length - 1]
    const r = crear("ordenes", {
      cliente: C[o.c].id, motor: m.id, tecnico: U[o.t].id, creado_por: U[o.t].id, estado: etapa,
      tipo: o.tipo, prioridad: o.prioridad || "normal", falla_reportada: o.falla,
      recepcion: o.recepcion || { accesorios: ["Caja de bornes"], estado_fisico: "" },
      diagnostico: o.diagnostico || {}, bobinado: o.bobinado || {}, pruebas: o.pruebas || {},
      recibe_nombre: o.entrega ? o.entrega[0] : "", recibe_documento: o.entrega ? o.entrega[1] : "",
    })
    sql("UPDATE ordenes SET created = {:c}, updated = {:u}, estado_desde = {:d} WHERE id = {:id}",
      { c: fecha(o.dias[0]), u: fecha(o.dias[o.dias.length - 1]), d: fecha(o.dias[o.dias.length - 1]), id: r.id })
    o.dias.forEach((d, i) => {
      const quien = ["cotizacion", "aprobacion", "entregado"].indexOf(ESTADOS[i]) >= 0 ? U.admin.id : U[o.t].id
      const ev = crear("eventos", { orden: r.id, de: i ? ESTADOS[i - 1] : "", a: ESTADOS[i], usuario: quien, nota: i ? "" : "Orden creada" })
      sql("UPDATE eventos SET created = {:c}, updated = {:c} WHERE id = {:id}", { c: fecha(d), id: ev.id })
    })
    for (const [archivo, nota, etapaFoto] of o.fotos || []) {
      const f = crear("fotos", { orden: r.id, archivo: $filesystem.fileFromPath(__hooks + "/seed-assets/" + archivo), nota, etapa: etapaFoto, autor: U[o.t].id })
      sql("UPDATE fotos SET created = {:c} WHERE id = {:id}", { c: fecha(o.dias[o.dias.length - 1]), id: f.id })
    }
    if (o.cot) {
      const items = [
        { id: "a1", descripcion: "Rodamiento 6308 ZZ C3", cantidad: 1, unidad: "und", valor: 73800 },
        { id: "a2", descripcion: "Rodamiento 6206 ZZ C3", cantidad: 1, unidad: "und", valor: 28500 },
        { id: "a3", descripcion: "Mano de obra desmontaje y montaje de rodamientos", cantidad: 1, unidad: "und", valor: 118000 },
        { id: "a4", descripcion: "Ventilador nuevo", cantidad: 1, unidad: "und", valor: 86500 },
        { id: "a5", descripcion: "Limpieza general y pintura epóxica", cantidad: 1, unidad: "und", valor: 112000 },
      ]
      crear("cotizaciones", { orden: r.id, items, iva: false, estado: "enviada", notas: "Validez de la oferta: 15 días. Garantía de 6 meses sobre el trabajo realizado." })
    }
  }

  console.log("Datos demo cargados: " + ordenes.length + " ordenes, " + Object.keys(C).length + " clientes.")
  console.log("Usuarios y claves en: " + rutaAccesos)
  return claves
}
