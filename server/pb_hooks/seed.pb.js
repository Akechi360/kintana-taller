/// <reference path="../pb_data/types.d.ts" />
// Datos de demostracion:  pocketbase.exe seed          (solo si la base esta vacia)
//                         pocketbase.exe seed reset    (borra todo y vuelve a cargar)
// Las claves de los usuarios demo quedan en server/accesos-demo.json (se reutilizan).
$app.rootCmd.addCommand(new Command({
  use: "seed",
  short: "Carga datos de demostracion de Kintana",
  run: (cmd, args) => {
    require(`${__hooks}/demo.js`)($app, args.indexOf("reset") >= 0)
  },
}))

// Hosting sin consola (PocketHost): con la variable KINTANA_DEMO=1 la demo se carga sola
// (revision cada minuto, solo si la base esta vacia). Las claves salen en los Logs.
cronAdd("kintana_demo", "* * * * *", () => {
  if ($os.getenv("KINTANA_DEMO") !== "1") return
  try {
    if ($app.countRecords("users") > 0 || $app.countRecords("ordenes") > 0) return
    require(`${__hooks}/demo.js`)($app, false)
  } catch (err) {
    console.log("Demo: no se pudo cargar: " + err)
  }
})
