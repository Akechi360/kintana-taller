# Kintana Taller

App de órdenes de servicio, diagnóstico y bobinado de motores. Dos piezas:

| Pieza | Dónde corre | Qué es |
|---|---|---|
| Servidor (`server/`) | PC de la oficina | PocketBase: base de datos, usuarios, fotos, tiempo real. También sirve la app en la red local. |
| App (`web/`) | Vercel (y el mismo PC) | React + Vite + Tailwind, instalable como PWA. |

## PC de la oficina (una sola vez)
1. Instala [Git para Windows](https://git-scm.com/download/win) y clona este repositorio (o copia la carpeta).
2. Doble clic en `iniciar-kintana.bat`. La primera vez descarga PocketBase (verifica su firma SHA-256), crea la base y los usuarios demo (`server/accesos-demo.json`). Acepta el permiso del firewall de Windows.
3. La primera vez, la ventana negra muestra un enlace para crear el usuario de soporte (superusuario) del panel http://127.0.0.1:8090/_/. Ábrelo y créalo; sirve para copias de seguridad y revisar datos.
4. Para que la app de Vercel y los celulares con datos móviles lleguen al servidor, publica el puerto 8090 con HTTPS:
   - **Tailscale Funnel** (gratis): instala Tailscale con la misma cuenta, luego `tailscale funnel --bg 8090`. Queda una dirección fija tipo `https://pc-oficina.xxxx.ts.net`.
5. Configura Windows para que ese PC **no se suspenda** y que `iniciar-kintana.bat` arranque al iniciar sesión (carpeta `shell:startup`).

## Vercel (la demo en línea)
1. En vercel.com → Add New → Project → importa este repositorio de GitHub.
2. **Root Directory:** `web`. El resto lo toma de `web/vercel.json`.
3. **Environment Variable:** `VITE_PB_URL` = la dirección HTTPS del paso 4 (sin `/` al final).
4. Deploy. Cada `git push` a `main` vuelve a publicar.

Si el PC de la oficina está apagado, la app en Vercel muestra "No hay conexión con el servidor del taller".

## Uso diario
- `reiniciar-demo.bat`: deja los datos de demostración como nuevos.
- Desarrollo: `cd web && npm install && npm run build` (compila a `server/pb_public`).
- Pruebas: `npm test` (cálculos) y `npm run test:api` (seguridad y flujo, con el servidor encendido; después `reiniciar-demo.bat`).

## Guion de la videollamada (15 min)
1. **Login técnico en el celular** (wcastaneda): solo ve sus órdenes.
2. **Recepción**: cliente existente → aparece su motor de antes → fallas con un toque → foto de placa → "Crear orden". El consecutivo sale solo.
3. **Diagnóstico OT 1136 (Arssa, WEG 50 HP, la planilla real)**: megger en rojo, IP en ámbar, botón "Agregar sugeridos". Se guarda solo, incluso sin señal.
4. **Tablero admin en vivo**: el técnico avanza y la tarjeta se mueve sola.
5. **Cotización OT 1135**: "Generar desde el diagnóstico" → Excel / PDF / WhatsApp. Reemplaza el "cot 6733" a mano y el Excel manual.
6. **Bobinado OT 1134 (300 HP, ficha 1127 real)**: "Buscar recetas" encuentra la OT 1128 con el mismo núcleo.
7. **Informe técnico PDF** con fotos, semáforos IEEE 43 y la placa de reparador del RETIE.

Plan B si falla internet: comparte la pantalla del PC de la oficina (http://127.0.0.1:8090 no depende de internet).
