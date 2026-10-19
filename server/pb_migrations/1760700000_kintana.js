/// <reference path="../pb_data/types.d.ts" />

// Esquema completo de Kintana. Reglas de acceso:
// - admin ve y edita todo.
// - tecnico solo ve las ordenes asignadas a el (y sus fotos/eventos).
// - precios y cotizaciones: solo admin.
migrate((app) => {
  const ADMIN = "@request.auth.rol = 'admin'"
  const AUTH = "@request.auth.id != ''"
  const ESTADOS = ["recibido", "diagnostico", "cotizacion", "aprobacion", "reparacion", "pruebas", "listo", "entregado"]

  // --- usuarios: login por "usuario", rol obligatorio, solo admin crea/edita
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new TextField({ name: "usuario", required: true, min: 3, max: 32, pattern: "^[a-z0-9._-]+$" }))
  users.fields.add(new SelectField({ name: "rol", required: true, maxSelect: 1, values: ["admin", "tecnico"] }))
  users.fields.getByName("email").required = false
  users.addIndex("idx_users_usuario", true, "usuario", "")
  users.passwordAuth.identityFields = ["usuario"]
  users.listRule = `id = @request.auth.id || ${ADMIN}`
  users.viewRule = `id = @request.auth.id || ${ADMIN}`
  users.createRule = ADMIN
  users.updateRule = ADMIN
  users.deleteRule = null
  app.save(users)

  const col = ({ fields, ...def }) => {
    const c = new Collection(def)
    for (const f of fields) c.fields.add(f)
    return c
  }

  const autodates = () => [
    new AutodateField({ name: "created", onCreate: true }),
    new AutodateField({ name: "updated", onCreate: true, onUpdate: true }),
  ]

  const clientes = col({
    type: "base", name: "clientes",
    listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: ADMIN,
    fields: [
      new TextField({ name: "nombre", required: true, max: 160 }),
      new TextField({ name: "nit", max: 30 }),
      new TextField({ name: "contacto", max: 120 }),
      new TextField({ name: "telefono", max: 30 }),
      new TextField({ name: "direccion", max: 200 }),
      new TextField({ name: "ciudad", max: 80 }),
      ...autodates(),
    ],
  })
  app.save(clientes)

  const motores = col({
    type: "base", name: "motores",
    listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: ADMIN,
    fields: [
      new RelationField({ name: "cliente", required: true, collectionId: clientes.id, maxSelect: 1 }),
      new TextField({ name: "marca", max: 60 }),
      new TextField({ name: "serial", max: 80 }),
      new TextField({ name: "frame", max: 40 }),
      new NumberField({ name: "hp", min: 0 }),
      new NumberField({ name: "kw", min: 0 }),
      new NumberField({ name: "rpm", min: 0, onlyInt: true }),
      new TextField({ name: "voltaje", max: 30 }),
      new NumberField({ name: "amperaje", min: 0 }),
      new SelectField({ name: "fases", maxSelect: 1, values: ["trifasico", "monofasico", "bifasico"] }),
      new TextField({ name: "conexion", max: 20 }),
      new TextField({ name: "rodamiento_la", max: 20 }),
      new TextField({ name: "rodamiento_loa", max: 20 }),
      ...autodates(),
    ],
  })
  app.save(motores)

  const usersId = users.id
  const VER_ORDEN = `${ADMIN} || tecnico = @request.auth.id`
  const ordenes = col({
    type: "base", name: "ordenes",
    listRule: VER_ORDEN, viewRule: VER_ORDEN, createRule: AUTH, updateRule: VER_ORDEN, deleteRule: ADMIN,
    fields: [
      new NumberField({ name: "numero", onlyInt: true, min: 1 }),
      new RelationField({ name: "cliente", required: true, collectionId: clientes.id, maxSelect: 1 }),
      new RelationField({ name: "motor", required: true, collectionId: motores.id, maxSelect: 1 }),
      new RelationField({ name: "tecnico", collectionId: usersId, maxSelect: 1 }),
      new RelationField({ name: "creado_por", collectionId: usersId, maxSelect: 1 }),
      new SelectField({ name: "estado", required: true, maxSelect: 1, values: ESTADOS }),
      new SelectField({ name: "tipo", maxSelect: 1, values: ["diagnostico", "preventivo", "correctivo", "bobinado"] }),
      new SelectField({ name: "prioridad", maxSelect: 1, values: ["normal", "urgente"] }),
      new TextField({ name: "falla_reportada", max: 2000 }),
      new JSONField({ name: "recepcion", maxSize: 200000 }),
      new JSONField({ name: "diagnostico", maxSize: 200000 }),
      new JSONField({ name: "bobinado", maxSize: 200000 }),
      new JSONField({ name: "pruebas", maxSize: 200000 }),
      new TextField({ name: "notas", max: 4000 }),
      new DateField({ name: "estado_desde" }),
      new TextField({ name: "recibe_nombre", max: 120 }),
      new TextField({ name: "recibe_documento", max: 30 }),
      new FileField({ name: "firma", maxSelect: 1, maxSize: 2 * 1024 * 1024, mimeTypes: ["image/png"] }),
      ...autodates(),
    ],
  })
  ordenes.addIndex("idx_ordenes_numero", true, "numero", "")
  app.save(ordenes)

  const VER_POR_ORDEN = `${ADMIN} || orden.tecnico = @request.auth.id`
  const fotos = col({
    type: "base", name: "fotos",
    listRule: VER_POR_ORDEN, viewRule: VER_POR_ORDEN, createRule: VER_POR_ORDEN,
    updateRule: `${ADMIN} || autor = @request.auth.id`, deleteRule: `${ADMIN} || autor = @request.auth.id`,
    fields: [
      new RelationField({ name: "orden", required: true, collectionId: ordenes.id, maxSelect: 1, cascadeDelete: true }),
      new FileField({
        name: "archivo", required: true, maxSelect: 1, maxSize: 12 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: ["480x360", "160x160"],
      }),
      new SelectField({ name: "etapa", maxSelect: 1, values: ESTADOS }),
      new TextField({ name: "nota", max: 300 }),
      new RelationField({ name: "autor", collectionId: usersId, maxSelect: 1 }),
      ...autodates(),
    ],
  })
  app.save(fotos)

  const eventos = col({
    type: "base", name: "eventos",
    listRule: VER_POR_ORDEN, viewRule: VER_POR_ORDEN, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      new RelationField({ name: "orden", required: true, collectionId: ordenes.id, maxSelect: 1, cascadeDelete: true }),
      new TextField({ name: "de", max: 20 }),
      new TextField({ name: "a", max: 20 }),
      new RelationField({ name: "usuario", collectionId: usersId, maxSelect: 1 }),
      new TextField({ name: "nota", max: 300 }),
      ...autodates(),
    ],
  })
  app.save(eventos)

  const precios = col({
    type: "base", name: "precios",
    listRule: ADMIN, viewRule: ADMIN, createRule: ADMIN, updateRule: ADMIN, deleteRule: ADMIN,
    fields: [
      new TextField({ name: "clave", required: true, max: 40 }),
      new TextField({ name: "descripcion", required: true, max: 200 }),
      new TextField({ name: "unidad", max: 20 }),
      new NumberField({ name: "valor", min: 0 }),
      ...autodates(),
    ],
  })
  app.save(precios)

  const cotizaciones = col({
    type: "base", name: "cotizaciones",
    listRule: ADMIN, viewRule: ADMIN, createRule: ADMIN, updateRule: ADMIN, deleteRule: ADMIN,
    fields: [
      new NumberField({ name: "numero", onlyInt: true, min: 1 }),
      new RelationField({ name: "orden", required: true, collectionId: ordenes.id, maxSelect: 1, cascadeDelete: true }),
      new JSONField({ name: "items", maxSize: 200000 }),
      new BoolField({ name: "iva" }),
      new SelectField({ name: "estado", maxSelect: 1, values: ["borrador", "enviada", "aprobada", "rechazada"] }),
      new TextField({ name: "notas", max: 2000 }),
      ...autodates(),
    ],
  })
  cotizaciones.addIndex("idx_cot_orden", true, "orden", "")
  cotizaciones.addIndex("idx_cot_numero", true, "numero", "")
  app.save(cotizaciones)
}, (app) => {
  for (const n of ["cotizaciones", "precios", "eventos", "fotos", "ordenes", "motores", "clientes"]) {
    app.delete(app.findCollectionByNameOrId(n))
  }
})
