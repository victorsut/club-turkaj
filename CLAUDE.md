# Puntos Plus — Instrucciones para Claude Code

Lead Full-Stack Developer de **Puntos Plus** (antes "Club Turkaj"), programa de
lealtad para gasolineras Turkaj I, II y III en Chichicastenango, Guatemala.
PWA en producción activa.

- **Producción:** https://puntos-plus.vercel.app
- **Repo:** github.com/victorsut/puntos-plus (rama `main`)
- **Supabase project:** rfharnrsatgliynzcuwp

---

## 1. Reglas de Negocio Inamovibles

- **Conversión:** Q10 = 1 punto.
- **Tiers (galones):** ORO (0–149), PLATINO (150–499), BLACK (500+).
- **Card codes:** `CTOD-XXXXX` (ORO), `CTPD-XXXXX` (PLATINO), `CTBD-XXXXX` (BLACK).
- **Temas visuales:** ORO blanco/dorado, PLATINO gris metálico, BLACK galaxia animada.
- **Degradación por inactividad (motor real 25-jul-2026):** 15 días de gracia desde la última compra; desde el día 16 los galones caen a UMBRAL − n(n+1)/2 por día de descenso (día 1 = umbral−1, "rozando el límite"). BLACK baja a PLATINO (día 16) y a ORO (día 31); PLATINO baja a ORO (día 16). Reinicio total (puntos y galones en 0) 45 días después de caer a ORO: BLACK día 75 · PLATINO día 60 · ORO día 45. ACTIVIDAD que resetea el contador = compra, encuesta, canje creado, entrega de canje o compra de boletos de rifa (activity_log + last_buy). Motor: RPC `apply_due_degradations()` perezoso al abrir la app — **APAGADO hasta el lanzamiento oficial** (`program_config.degradation_enabled`; interruptor auditado en Admin → Configuración vía RPC `set_degradation_enabled`); al encender, el contador de todos arranca en `enabled_at` (nadie arrastra inactividad previa). Estado en `members.degrade_stage`/`degrade_base_gal`.
- **Encuestas:** límite 5/día, timer 1.5 min, la 5ª otorga boleto de rifa gratis.
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
- **rewards** — id, name, points_cost, category, tier_exclusive, icon, active, description.
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

1. ~~**Migrar credenciales de operadores y administradores a la base de datos**~~ ✅ Cerrado para operadores (2026-05-05): no quedan arrays hardcoded; alta/reset de password vía RPCs `create_operator` y `update_operator_password` con bcrypt server-side. Pendiente equivalente para admins (objetivo futuro).
2. **Sistema de escaneo real de QR** (correlativos `CTOD/CTPD/CTBD-XXXXX`) y validación contra `members.card_id`.
3. **Refinar historial de actividad** desde `activity_log` (paginado, agrupado por tipo: compra, canje, encuesta, rifa).

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
