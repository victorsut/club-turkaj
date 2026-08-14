# Puntos Plus — Instrucciones para Claude Code

Lead Full-Stack Developer de **Puntos Plus** (antes "Club Turkaj"), programa de
lealtad para gasolineras Turkaj I, II y III en Chichicastenango, Guatemala.
PWA en producción activa.

- **Producción:** https://puntosplus.vercel.app (⚠️ sin guión — `puntos-plus.vercel.app` pertenece a un proyecto AJENO)
- **Repo:** github.com/victorsut/puntos-plus (rama `main`)
- **Supabase project:** rfharnrsatgliynzcuwp

---

## 1. Reglas de Negocio Inamovibles

- **Conversión POR TIER (F2.1, 6-ago-2026):** ORO Q10 = 1 punto · PLATINO Q8 = 1 punto · BLACK Q6 = 1 punto. Editable en Admin → Configuración → Puntos por Nivel (RPC `set_loyalty_config`, `program_config.tiers` → `qPerPt`). El divisor se decide con el tier PREVIO a la compra. La lógica vive en el RPC `register_purchase_core` (core compartido de `register_purchase` y `api_register_purchase` — ya NO está duplicada).
- **Eventos especiales POR TIER (F2.1):** ORO 25 · PLATINO 35 · BLACK 50 pts por evento (`program_config.tiers` → `evtPts`, mismo RPC/sección de admin). `special_days.points` quedó solo de fallback; el form de festivos ya no edita puntos.
- **Tiers (galones):** ORO (0–149), PLATINO (150–499), BLACK (500+).
- **Card codes:** `CTOD-XXXXX` (ORO), `CTPD-XXXXX` (PLATINO), `CTBD-XXXXX` (BLACK).
- **Temas visuales:** ORO blanco/dorado, PLATINO gris metálico, BLACK galaxia animada.
- **Degradación por inactividad (motor real 25-jul-2026):** 15 días de gracia desde la última compra; desde el día 16 los galones caen a UMBRAL − n(n+1)/2 por día de descenso (día 1 = umbral−1, "rozando el límite"). BLACK baja a PLATINO (día 16) y a ORO (día 31); PLATINO baja a ORO (día 16). Reinicio total (puntos y galones en 0) 45 días después de caer a ORO: BLACK día 75 · PLATINO día 60 · ORO día 45. ACTIVIDAD que resetea el contador = compra, encuesta, canje creado, entrega de canje o compra de boletos de rifa (activity_log + last_buy). Motor: RPC `apply_due_degradations()` perezoso al abrir la app — **APAGADO hasta el lanzamiento oficial** (`program_config.degradation_enabled`; interruptor auditado en Admin → Configuración vía RPC `set_degradation_enabled`); al encender, el contador de todos arranca en `enabled_at` (nadie arrastra inactividad previa). Estado en `members.degrade_stage`/`degrade_base_gal`.
- **Encuestas:** límite 5/día, espera mínima 1:15 min (`SURVEY_WAIT` 75s, 14-ago-2026) OCULTA al cliente (sin contador visible en la UI), la 5ª otorga boleto de rifa gratis. La encuesta pendiente persiste en localStorage `pp_survey_pending` (sobrevive la recarga de la PWA al volver de Shell) y el resultado se muestra en `SurveyResultModal` PERSISTENTE (éxito o "no completada" — nunca toast: se perdía cuando el reclamo ocurría durante el boot).
- **Descuentos por galón:** RETIRADOS del programa (24-jul-2026, decisión del dueño). No mostrar en ninguna lista de beneficios; los valores `discGal` siguen en config solo por compatibilidad.
- **Descuento en canjes:** ORO 0%, PLATINO 10%, BLACK 15%.
- **Beneficios listados por nivel:** sin línea de "Rifa mensual" (24-jul-2026) — la rifa sigue existiendo como función, pero no se anuncia como beneficio del tier.

## 2. Stack y Arquitectura

- **Frontend:** React 18 (JSX) + Vite 6.
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + RLS), 18 tablas.
- **Deploy:** push a GitHub `main` → Vercel auto-deploy.
- **Auth cliente:** Google OAuth (Supabase Auth).
- **Auth operador/admin:** RPC `authenticate_operator`, hash formato `pw:base64`.
- **QR:** generación local SVG (offline) + escaneo con `html5-qrcode`.
- **Push:** `web-push` + VAPID. Motor de notificaciones (28-jul-2026): núcleo en `api/_lib/push.js`, envío genérico `api/send-push.js` (`type` rutea el click en sw.js; `purchase` abre el modal de calificación+encuesta de esa compra), todo envío se registra en la tabla `notifications` (dedupe + futuro inbox). Alertas de degradación: RPC `list_degradation_alerts()` + cron diario de Vercel `api/degradation-alerts` (09:00 GT, requiere env `CRON_SECRET`) — avisos desde el día 11 de inactividad; no-op mientras el motor de degradación esté apagado.

## 3. Reglas de Código

- **Modularidad:** ningún archivo > 500 líneas. Dividir en `/components`, `/views`, `/services`, `/hooks`, `/lib`.
- **Sin datos demo:** todo viene de Supabase. Cero hardcoding de operadores, miembros, premios o rifas.
- **Persistencia obligatoria:** compras, canjes, rifas y encuestas escriben en las 18 tablas.
- **Seguridad:** lógica sensible vive en RPCs (`register_purchase`, `redeem_reward`, `authenticate_operator`).
- **Responsividad:** debe funcionar en navegadores in-app (WhatsApp, Instagram) y móvil.
- **Modo claro/oscuro (24-jul-2026):** la vista cliente tiene ambos modos. `ctx.dark` (App.jsx) es la fuente de verdad; se elige con sol/luna en login y Menú (`ModeToggle`), persiste en localStorage `pp_mode`; sin elección: BLACK oscuro, ORO/PLATINO claro. Las SUPERFICIES (fondos, tarjetas, textos) se bifurcan por `dark`; la IDENTIDAD del tier (tierBand, galaxia de la tarjeta, paleta homeColors) NO cambia con el modo. Componentes nuevos del cliente deben soportar ambos modos.
- **Estilo:** seguir patrones existentes en `src/constants/styles.js` (inputStyle, btnStyle, sMono, adminTheme, clientTheme).

## 4. Estructura del Proyecto

```
puntos-plus/
├── api/send-push.js              # Vercel serverless - push
├── public/                       # manifest.json, sw.js, favicon
├── src/
│   ├── components/ui/            # Badge, BottomNav, QRCode, QRScanner, TierCard, etc.
│   ├── constants/                # config.js, styles.js
│   ├── hooks/                    # useSupabaseData, useToast
│   ├── lib/                      # supabaseClient.js, pushNotifications.js
│   ├── services/                 # capa de acceso a Supabase
│   ├── views/                    # ClientView, OperatorView, AdminView
│   └── App.jsx
└── vite.config.js
```

## 5. Tablas Supabase Críticas

- **members** — id, name, phone (UNIQUE), dpi (UNIQUE), birthday, points, gallons, card_id, last_special_bonus, vehicles (jsonb). **SEC.C.1 (28-jul-2026):** la API abierta solo expone columnas NO sensibles (id, name, points, gallons, visits...); PII y hash viajan únicamente por RPCs con sesión: miembro `get_my_member`/`update_my_profile`/`register_member` (token de `member_sessions`, 180 días, emitido por `authenticate_member`/`create_member_session_oauth`/api-webauthn), operador/admin `list_members_full`/`get_member_full`. Escritura directa del cliente REVOCADA.
- **operators** — id, name, username, password_hash (bcrypt vía `crypt()` + `gen_salt('bf', 6)`), dpi, gafete, station_id, active. Alta y reset de contraseña SOLO por RPCs `create_operator` / `update_operator_password` (nunca insertar `password_hash` desde el cliente).
- **purchases** — id, member_id, operator_id, station_id, fuel_type, gallons, amount, points_earned. **SEC.C.2 (29-jul-2026):** SELECT abierto solo con ventana de 15 min y columnas mínimas (mantiene vivo el canal Realtime del modal de calificación); historial por operador vía RPC `list_operator_purchases`.
- **redemptions** — id, member_id, reward_id, operator_id, collected, collected_at, confirm_status, redemption_code. Realtime FULL. **SEC.C.2:** SELECT abierto solo para filas en flujo de confirmación (`confirm_status ≠ 'none'`) y SIN `redemption_code`; el cliente lee sus canjes por `get_my_redemptions` (sesión), el operador por RPCs (`list_member_pending_redemptions`, `get_redemption_by_code`, `list_operator_redemptions`, `get_redemption_status`). **SEC.C.3:** UPDATE directo REVOCADO — el flujo de confirmación/entrega vive en RPCs con sesión: `operator_set_redemption_confirm` (pending/none), `respond_redemption_confirm` (miembro), `deliver_redemption` (atómica, exige confirmed y registra el 'entrega'). `physical_cards` también quedó cerrada (escaneo por `resolve_card`).
- **rewards** — id, name, points_cost, category, tier_exclusive, icon, active, description. **D17 (6-ago-2026):** `station_ids`/`store_ids` (uuid[]) = localizaciones donde el premio es canjeable; AMBOS NULL = todas las estaciones. v1 informativa (catálogo + confirmación de canje) — la entrega NO se bloquea por estación. **D18:** tabla `partner_stores` (tiendas asociadas: Betel, Súper 24…) — lectura pública, CRUD por `admin_write_catalog` entidad 'store' (eliminar limpia el id de rewards.store_ids); UI en Admin → Configuración → Estaciones y Tiendas. **SEC.C.4 (29-jul-2026):** lectura pública, escritura SOLO por `admin_write_catalog` (igual que `promotions`, `special_days`, `raffle_calendar`, `stations` y `partner_stores`) — RPC único con whitelist por entidad, sesión de admin y auditoría atómica. Escrituras del cliente por RPC con sesión: `rate_operator`, `mark_raffle_winner_seen`, `save_push_subscription`; `surveys` cerrada (conteo por `count_my_surveys_today`).
- **raffle_calendar** — id, month, year, prize_name, prize_icon, prize_value, winner_id, drawn_at.
- **special_days** — id, name, month, day, points, icon, active, system. `month=0` = cumpleaños del miembro.
- **activity_log** — fuente única para el historial del cliente. **SEC.C.2:** SELECT cerrado — lecturas por RPC `list_activity` con sesión (miembro: solo lo suyo; operador/admin: cualquier miembro o global). **SEC.C.3:** INSERT directo también REVOCADO — solo escriben los RPCs server-side; el `logActivity` de App.jsx es puro estado local. `raffle_tickets` también quedó cerrado (participantes por RPC `list_raffle_participants` con cualquier sesión). Wrappers frontend en `src/services/secureReads.js`.
- **notifications** — registro de push enviados (member_id, type, title, body, data, sent_at, read_at). Solo service key; `read_at` reservado para el futuro inbox in-app.

## 6. Estaciones

- Turkaj I  — 7a Av 6-10 Z1, Chichicastenango — 14.942641, -91.109861.
- Turkaj II — 8a Av 12-43 Z1, Chichicastenango — 14.937885, -91.110859.
- Turkaj III — Km 148, La Cruz, Chulumal I — 14.964534, -91.102676.

## 7. Encuestas Shell por estación

- Turkaj I:  https://tellshell.shell.com/GTM?source=smartQR&s=10700531
- Turkaj II: https://tellshell.shell.com/GTM?source=smartQR&s=10700717
- Turkaj III: https://tellshell.shell.com/GTM?source=smartQR&s=10700211

## 8. Objetivos Prioritarios (en orden)

1. ~~**Migrar credenciales de operadores y administradores a la base de datos**~~ ✅ **CERRADO** — operadores (2026-05-05) y **admins (29-jul-2026)**: no quedan arrays hardcoded; todo con bcrypt server-side. Operadores: `create_operator`, `update_operator_password`, `toggle_operator_active`, `update_operator_profile`. Admins: `list_admins`, `create_admin`, `update_admin_password` (exige la contraseña actual si es la propia), `toggle_admin_active` (nunca deja 0 activos ni permite auto-desactivarse) — UI en Admin → Configuración → Administradores, con razón obligatoria y auditoría. **`admins` quedó CERRADA a la API abierta** (antes cualquiera podía leer los hashes e insertarse un admin); `operators` solo expone columnas no sensibles (id, name, username, station_id, bomba, turno, active) — la ficha completa por `list_operators_full` con sesión.
2. ~~**Sistema de escaneo real de QR**~~ ✅ **CERRADO en modo SOLO DIGITAL (11-ago-2026)** — emisión en `register_member`, upgrade de prefijo en `register_purchase_core`, escáner del operador con `resolve_card`, identificación PROPER con `api_resolve_member`; ambos resolutores validan `physical_cards.status='active'` (migración `20260811c`). **Tarjeta FÍSICA = deseo a futuro del dueño (podría descartarse):** no implementar sin pedido explícito; el esquema queda listo (13 seed `CTOD-00001..13` en `status='inactive'`, reversibles) y agregarla luego es aditivo (vista admin + RPCs assign/batch/block).
2b. **API REST para PROPER (F7a, 29-jul-2026)** — implementada y documentada en `docs/API-PROPER.md` (entregable para su equipo técnico). Endpoints en `api/v1/`: `GET /stations`, `GET /members` (identificación por QR + NIT aceptados), `POST /purchases` (acumula con galones REALES de la factura, regla de NIT, idempotencia por header) y `GET /redemptions` (comprobante de premio). Auth por API key bcrypt (`api_clients`, se genera en Admin → Configuración → 🔌 API externa); colaboradores de PROPER se mapean a operadores espejo (`operators.external_id`, no pueden loguearse). **Regla de NIT:** miembro con NIT → solo CF o su NIT; sin NIT → solo CF. **Modelo operador–estación (30-jul-2026):** con PROPER activo los colaboradores NO usan la vista de operador; el operador ya no está ligado a una estación — la estación es dato DE CADA FACTURA (`purchases.station_id`/`activity_log.station_id`); `operators.station_id` = última donde despachó (fallback + referencia en el panel, badge PROPER en Personal). La calificación es al operador por compra (independiente de estación) y el push de calificación lo envía el endpoint `api/v1/purchases` server-side (ya no el navegador del operador). `api_upsert_operator` solo RELLENA el nombre (respeta ediciones del admin); la estación sigue a la factura. **Canje por PROPER (F7a.3, 30-jul):** el flujo de entrega completo vive en el POS — `POST /v1/redemptions` con `action` request/cancel/deliver (RPC `api_redemption_confirm`; deliver exige `confirmed` y devuelve el payload del comprobante — REGLA: solo se imprime al entregar, nunca al acumular), `GET ?card_code=` lista pendientes por tarjeta (`api_list_pending_redemptions`), aviso al cliente por broadcast REST server-side (`/realtime/v1/api/broadcast`, mismo canal `redeem-bc-<member>`) + respaldo al abrir la app (`get_my_redemptions` expone `confirm_status`/`confirm_requested_at`, modal solo si la solicitud tiene <3 min). Scope `redemptions:write`.
3. ~~**Refinar historial de actividad**~~ ✅ **CERRADO (11-ago-2026)** — HistorySheet con filtro por TIPO (chips derivados de los datos, combinables con el período) y paginado incremental de 30 filas; sin migración (`list_activity` ya entrega el libro mayor con sesión).

## 9. Convenciones de Trabajo

- Antes de modificar un archivo, leerlo entero. Si supera 500 líneas, primero proponer cómo dividirlo.
- Cambios en SQL → generar migration en `supabase/migrations/YYYYMMDD_descripcion.sql` y avisar al usuario que debe ejecutarlo manualmente en el SQL Editor.
- Cambios de UI → respetar los temas por tier ya definidos. No introducir paletas nuevas sin pedir.
- Antes de `git commit`, correr `npm run build` para verificar que no rompe el build de Vite.
- Mensajes de commit en español, formato: `feat: ...`, `fix: ...`, `refactor: ...`, `chore: ...`.

## 10. Comandos del Proyecto

- `npm run dev` — servidor local en puerto 5173.
- `npm run build` — build de producción a `dist/`.
- `npm run preview` — previsualizar el build.
