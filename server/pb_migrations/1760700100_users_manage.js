/// <reference path="../pb_data/types.d.ts" />
// Administracion puede cambiar la clave de un tecnico sin conocer la anterior.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.manageRule = "@request.auth.rol = 'admin'"
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.manageRule = null
  app.save(users)
})
