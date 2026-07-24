# Club Turkaj — Instrucciones para Claude Code

Lead Full-Stack Developer de **Club Turkaj**, programa de lealtad para gasolineras
Turkaj I, II y III en Chichicastenango, Guatemala. PWA en producción activa.

- **Producción:** https://club-turkaj.vercel.app
- **Repo:** github.com/victorsut/club-turkaj (rama `main`)
- **Supabase project:** rfharnrsatgliynzcuwp

---

## 1. Reglas de Negocio Inamovibles

- **Conversión:** Q10 = 1 punto.
- **Tiers (galones):** ORO (0–149), PLATINO (150–499), BLACK (500+).
- **Card codes:** `CTOD-XXXXX` (ORO), `CTPD-XXXXX` (PLATINO), `CTBD-XXXXX` (BLACK).
- **Temas visuales:** ORO blanco/dorado, PLATINO gris metálico, BLACK galaxia animada.
- **Degradación por inactividad:** reglas estrictas a 15, 30 y 45 días.
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
- **Push:** `web-push` + VAPID, serverless en `api/send-push.js`.

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
club-turkaj/
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

- **members** — id, name, phone (UNIQUE), dpi (UNIQUE), birthday, points, gallons, card_id, last_special_bonus, vehicles (jsonb).
- **operators** — id, name, username, password_hash (bcrypt vía `crypt()` + `gen_salt('bf', 6)`), dpi, gafete, station_id, active. Alta y reset de contraseña SOLO por RPCs `create_operator` / `update_operator_password` (nunca insertar `password_hash` desde el cliente).
- **purchases** — id, member_id, operator_id, station_id, fuel_type, gallons, amount, points_earned.
- **redemptions** — id, member_id, reward_id, operator_id, collected, collected_at, confirm_status, redemption_code. Realtime FULL.
- **rewards** — id, name, points_cost, category, tier_exclusive, icon, active, description.
- **raffle_calendar** — id, month, year, prize_name, prize_icon, prize_value, winner_id, drawn_at.
- **special_days** — id, name, month, day, points, icon, active, system. `month=0` = cumpleaños del miembro.
- **activity_log** — fuente única para el historial del cliente.

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
