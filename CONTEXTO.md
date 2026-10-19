# Contexto del proyecto (para retomar en otra sesión de Claude Code)

Lee esto antes de trabajar. Resume lo decidido con el cliente hasta el 19-oct-2026.

## Cliente
- Kintana Electro-Automatización Industrial S.A.S (Zipaquirá, Sabana de Bogotá): reparación, mantenimiento y rebobinado de motores industriales.
- Hoy llenan dos planillas en papel (plan de mantenimiento preventivo y hoja de datos de bobinado), imprimen fotos de recepción a mano y pasan todo a Excel.
- Hasta ~10 técnicos. En el taller hay datos móviles, no wifi (el wifi está en el área administrativa). Cotizan en Excel.
- El enlace con la empresa es un técnico (compadre del dueño del proyecto). La demo es por videollamada con el ingeniero.

## Decisiones tomadas
- **Stack A (self-hosted gratis):** PocketBase en el PC de la oficina + PWA React/Vite/Tailwind v4. Sin Next.js.
- **Diseño:** skill `design-taste-frontend-v1` (diales: variance 2, motion 2, density 5 técnico / 8 admin) + auditoría con `web-design-guidelines`. Geist + Geist Mono, iconos Phosphor, acento = morado del logo real (`public/logo-kintana.svg`).
- **Roles:** admin ve todo; técnico solo sus órdenes asignadas (reglas en servidor, probadas en `web/scripts-test-api.mjs`).
- **Línea de producción:** recibido → diagnóstico → cotización → aprobación → reparación → pruebas → listo → entregado. El técnico solo avanza un paso desde recibido/diagnóstico/reparación/pruebas; el resto lo mueve admin.
- **Demo en línea (temporal):** Vercel (`web/`, auto-deploy desde `main`) + PocketBase en Render free (`Dockerfile`, `render.yaml`, disco efímero que recarga la demo en cada arranque; clave demo en `KINTANA_CLAVE_DEMO`). Vercel usa Render por defecto si no hay `VITE_PB_URL` (ver `web/vite.config.js`).
- Se descartó Supabase (obligaría a reescribir el backend) y PocketHost (sin prueba gratis).

## URLs
- Demo: https://kintana-taller.vercel.app · Servidor demo: https://kintana-taller.onrender.com
- Repo: https://github.com/Akechi360/kintana-taller (privado)

## Pendiente
1. Instalar el PC de la oficina: `iniciar-kintana.bat` (ver LEEME.md), Tailscale Funnel en el puerto 8090, evitar suspensión, arranque automático.
2. Al tener la URL del PC de la oficina: definir `VITE_PB_URL` en Vercel y retirar Render.
3. Precios reales en el menú Precios; Excel real de cotización del cliente para igualar el formato.
4. Después de validar con el ingeniero: lectura de placa con IA, digitalizar las fichas viejas en papel, backups automáticos, offline completo.

## Comprobaciones antes de entregar cambios
- `cd web && npm test && npm run build` y, con el servidor encendido, `npm run test:api` y luego `reiniciar-demo.bat`.
