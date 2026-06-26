# Club Turkaj v2 — Estado Actual del Proyecto
## Última actualización: Junio 2026

---

## Seguridad — Bloque SEC.B (sesiones de operador/admin)

Cierre del agujero de permisos `anon` en las RPCs sensibles vía tokens de
sesión. **Estado global: B.3 ✅ · B.4 ✅ · B.5 ✅ · B.6 ✅ (B.6.1 ✅ · B.6.2 ✅ · B.6.3 ✅) · faltan B.7, B.8, B.9.**

### SEC.B.4 — Persistencia de token de sesión en el cliente ✅

**Qué entró:**
- **`src/services/sessionTokens.js`** (nuevo): módulo único que encapsula las
  claves de `localStorage`. Claves **separadas por rol** (`ct_operator_token`,
  `ct_admin_token`); **sin token de cliente**. Expone `setX/getX/clearX` para
  operador y admin. `getXToken()` aplica **chequeo local de expiración con
  política estricta**: `expiresAt` ausente o no parseable se trata como
  inválido (guard explícito `Number.isFinite(Date.parse(...))`, no se apoya en
  la semántica de `NaN`); compara por instante absoluto (`Date.now()` vs
  `timestamptz` ISO), sin conversión a hora de Guatemala. Auto-limpia en
  corrupción/sin-token/expirado.
- **Persistencia en login:** `loginOperator` y `loginAdmin` ahora leen
  `session_token`/`session_expires_at` que la RPC B.3 ya devolvía (antes se
  descartaban por el cherry-picking de campos) y los guardan con
  `setOperatorToken`/`setAdminToken`. El token va a su clave de rol, **no**
  dentro del objeto de sesión (`ct_op`/`ct_admin` sin cambios → no rompe
  `loggedOp`/`loggedAdmin`).
- **Limpieza en logout:** `logoutOperator`/`logoutAdmin` agregan `clearXToken()`.
  En el handler central `logout` de `App.jsx` (Opción B acotada) se reemplazó
  `localStorage.removeItem('ct_op'|'ct_admin')` por
  `logoutOperator()`/`logoutAdmin()` — el service es el único dueño del
  subconjunto de localStorage del logout; el estado React y la navegación
  quedan inline.

**3 decisiones tomadas (razón en una línea):**
1. **Sin `ct_client_token`** — el cliente va sobre Supabase Auth nativo; su JWT
   viaja solo en el header `Authorization` de cada `sb.rpc`, no hay token custom
   que guardar.
2. **Sin revocación server-side en logout (deuda acotada, NO resuelta)** — al
   cerrar sesión se borra el token del `localStorage`, pero la fila en
   `operator_sessions`/`admin_sessions` **queda viva y vigente hasta que expire
   (hasta 18h)**: el logout **no la invalida**. Solo queda *inalcanzable desde
   el cliente* (`anon` no puede leer esas tablas: `REVOKE ALL` + grants solo a
   `service_role`). Es un riesgo **acotado y aceptable** por la ventana corta de
   18h **+** el dispositivo fijo por estación, **no** porque la sesión se
   invalide. La revocación real (poblar `revoked_at` en el logout) se construye
   en **B.6** junto con la validación server-side.
3. **Chequeo local de expiración estricto** — cortesía de UX para evitar
   round-trips con token vencido; la autoridad real de validez es el server en
   B.6.

**Pendiente / deuda para fases siguientes:**
- **B.5:** inyección del token en los call sites sensibles (`register_purchase`,
  `buy_raffle_tickets` vector operador, `update_member_with_audit`,
  `modify_member_points`); las RPCs de admin usan patrón crudo (no `callRpc`),
  así que la inyección no se centraliza 100% en un solo punto.
- **B.6:** RPC de validación + revocación server-side (poblar `revoked_at`).
- **Semántica de `isOperatorLoggedIn`/`isAdminLoggedIn`:** sin cambios hasta
  B.5/B.6 — siguen mirando el objeto de sesión (`ct_op`/`ct_admin`), no el token.
- **Redundancias preexistentes del handler `logout`** (`setLoggedOp(null)` /
  `setMe(null)` duplicados): ortogonales a SEC.B, no tocadas.

**Supuesto del que depende la Decisión 2:** la tolerancia a no revocar en
logout se sostiene en que **el dispositivo es fijo por operador en cada estación
y no sale de ella**. Si ese modelo cambia (operadores con dispositivo propio, o
equipos que salen de la estación), la revocación server-side inmediata **deja de
ser deuda diferible y sube a prioridad**: el vector "token vigente en un
dispositivo fuera de control físico" se vuelve plausible. **Reabrir esta
decisión si el modelo de dispositivos cambia.**

---

### SEC.B.6.1 — Validación de sesión server-side (modo WARN) 🚧

**Qué entra:** helper `validate_session_token(p_token, p_role, p_rpc_name,
p_allow_null, p_params)` + las 4 RPCs sensibles recreadas (`CREATE OR REPLACE`
sin `DROP`, firma sin cambios) llamándolo como primera sentencia. En modo
**warn**: registra `no_token`/`invalid_token`/`revoked_token`/`expired_token`
en `session_violations` y **devuelve NULL sin bloquear** (nunca `RAISE`). El
corte a strict (`RAISE`) es **B.8**, un único `IF` en el helper. El helper
chequea `revoked_at` **antes** que `expires_at` (un logout deliberado es señal
más fuerte) y **no mira `auth.uid()`**.

> ### ⚠️ FRONTERA CRÍTICA — B.6 NO PROTEGE EL VECTOR CLIENTE DEL RAFFLE
> `buy_raffle_tickets` tiene **doble vector**: operador (manda token) y cliente
> (`App.jsx`, **NO** manda token). B.6 valida **solo** el vector operador; con
> `p_session_token` NULL hace **skip silencioso** (`p_allow_null => true`): no
> registra violación y no inspecciona `auth.uid()`.
>
> **Consecuencia explícita:** con token NULL, **cualquiera con la apikey `anon`
> puede llamar `buy_raffle_tickets` y gastar puntos de CUALQUIER `member`.**
> Esto **ya era así antes de SEC.B**; B.6 lo deja igual **a propósito**, porque
> policiarlo exige resolver el login-por-teléfono (los clientes-teléfono no
> tienen `auth.uid()`). **Su cierre es SEC.C.**
>
> **TRAS B.8 STRICT, EL RAFFLE DEL CLIENTE SIGUE SIN PROTECCIÓN.** Nadie debe
> creer que B.8 cierra ese vector — es **SEC.C**.

**Verificación (gate de aprobación):**
- **CRÍTICO:** `points_write_violations = 0` tras las 4 operaciones legítimas
  (B.6.1 recrea los cuerpos de FB → si el `set_config` se perdió, el canario lo
  detecta; sin cero, se aborta).
- Token basura en `localStorage` → compra de operador **pasa igual** Y aparece
  fila `invalid_token`.
- Raffle de cliente (token NULL) **no** genera fila — probado con OAuth y con
  teléfono.

**Pendiente:** B.6.3 (logout cliente → `async` + revoke best-effort).

---

### SEC.B.6.2 — Revocación de sesión server-side ✅

**Qué entró:** 2 RPCs **nuevas, puramente aditivas** (no recrean nada, no tocan
las RPCs de FB ni el helper de B.6.1):
- **`revoke_operator_session(p_token text)` / `revoke_admin_session(p_token text)`**
  — `UPDATE <tabla> SET revoked_at = now() WHERE token = p_token AND revoked_at
  IS NULL`. El `AND revoked_at IS NULL` hace la revocación **idempotente**
  (preserva el instante de la primera). `RETURNS void` (no filtra datos de la
  sesión). **No-op silencioso** si el token no existe (UPDATE sin match, sin
  error → no filtra existencia). **No validan quién llama:** el token es el
  secreto, poseerlo = poder revocarlo (un UUID random solo vive en el
  `localStorage` de su propia sesión). `SECURITY DEFINER` + `SET search_path TO
  'public'` (escriben tablas con `REVOKE ALL FROM PUBLIC`). Grants `EXECUTE` a
  `anon`/`authenticated`/`service_role` (el logout puede ocurrir con apikey
  `anon`).

**Cierre del loop con B.6.1:** el helper `validate_session_token` ya tenía la
rama `revoked_token` (chequea `revoked_at IS NOT NULL` **antes** que
expiración). B.6.2 la **habilita** poblando `revoked_at` → reusar un token
revocado en una RPC sensible genera `reason='revoked_token'` (modo warn, sigue
sin bloquear; el corte es B.8).

**Smoke verificado en producción:** revocación pobló `revoked_at`; segunda
revocación devolvió el **mismo** instante (idempotencia); token inexistente sin
error (no-op); token revocado reusado → 1 fila `register_purchase |
revoked_token` (params sin token) y la compra **pasó igual** (warn).

**Conectada al logout en:** B.6.3 (abajo).

---

### SEC.B.6.3 — Revocación de sesión en logout (cliente) ✅ — cierra B.6

**Qué entró:** `logoutOperator` (operatorAuthService.js) y `logoutAdmin`
(adminAuthService.js) pasan a **`async`** y revocan el token server-side antes
de borrar el `localStorage`. Orden: **leer token → revoke best-effort → borrar
local SIEMPRE**:
1. `const token = getOperatorToken()?.token` (leído **antes** de borrarlo;
   `getX/getAdminToken` sumado al import existente de `./sessionTokens`).
2. `if (sb && token) { try { await sb.rpc('revoke_operator_session',
   { p_token: token }); } catch { ... } }` — `sb.rpc` directo (no `callRpc`;
   la RPC es `void`). El `if (sb && token)` evita el round-trip si el token
   está ausente o ya venció (`getXToken` auto-limpia los vencidos).
3. Borrado local (`removeItem` + `clearXToken`) **fuera del try/catch**, SIEMPRE.

**Principio innegociable:** el logout local **nunca** queda bloqueado por la
red. Si la revocación falla (sin red, server caído), se traga el error y se
borra local igual. Un token huérfano no-revocado expira en ≤18h y la validación
de B.6 corre en modo **warn** (no bloquea).

**Espejo exacto** entre operador y admin. **No toca** `App.jsx` (el call site
`logout` ya era fire-and-forget, compatible con `async`), ni las RPCs de
revocación (B.6.2), ni nada server-side.

**Cierre de B.6:** la revocación que B.6.2 dejó disponible ahora **se dispara
automáticamente en cada logout** → el `revoked_at` se puebla solo, y un token
revocado reusado genera `revoked_token` en `session_violations` (warn).

> **Recordatorio de la deuda de B.4 saldada:** la Decisión 2 de B.4 ("sin
> revocación server-side en logout") queda **cerrada** por B.6.3. El token ya
> no queda vivo hasta expirar: el logout lo invalida server-side.

**Pendiente del bloque:** B.7 (observación de `session_violations`), B.8 (modo
strict — flip del helper a `RAISE`), B.9 (`REVOKE EXECUTE FROM anon`).

---

## Stack Técnico
- **Frontend:** React 18 (JSX), Vite 6
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Deploy:** GitHub (`victorsut/club-turkaj`) → Vercel (`club-turkaj.vercel.app`)
- **Dependencias:** `react`, `react-dom`, `@supabase/supabase-js`, `html5-qrcode`, `web-push`

---

## Estructura de Archivos (57 archivos)

```
club-turkaj/
├── api/
│   └── send-push.js              # Serverless function - push notifications
├── public/
│   ├── favicon.svg
│   ├── manifest.json              # PWA manifest
│   └── sw.js                      # Service Worker - push notifications
├── src/
│   ├── components/ui/
│   │   ├── Badge.jsx              # Tier badge (ORO/PLATINO/BLACK)
│   │   ├── BottomNav.jsx          # Bottom navigation tabs
│   │   ├── GalaxyDust.jsx         # Animated particles for BLACK tier
│   │   ├── Icons.jsx              # SVG icon components
│   │   ├── InactivityWarning.jsx  # Inactivity degradation warning
│   │   ├── QRCode.jsx             # QR code generator (qrserver API)
│   │   ├── QRScanner.jsx          # Camera QR scanner (html5-qrcode)
│   │   ├── TierCard.jsx           # Tier benefits card with progress bar
│   │   └── TierDeco.jsx           # Holographic/galaxy decorations
│   ├── constants/
│   │   ├── config.js              # FUEL_PRICES, FUEL_LABELS, CARD_PREFIX, DEFAULT_CONFIG
│   │   └── styles.js              # inputStyle, btnStyle, sMono, adminTheme, clientTheme
│   ├── hooks/
│   │   ├── useSupabaseData.js
│   │   └── useToast.js
│   ├── lib/
│   │   ├── pushNotifications.js   # subscribePush, sendPushToMember, isPushSupported
│   │   ├── supabaseClient.js      # Supabase client (flowType: implicit)
│   │   └── tierSystem.js          # makeTier, tierProgress, daysInactive
│   ├── services/
│   │   ├── authService.js
│   │   └── dataService.js         # getNextCardCode, updateCardTierPrefix
│   ├── styles/
│   │   └── global.css
│   ├── views/
│   │   ├── admin/
│   │   │   ├── AdminDash.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AdminRaffle.jsx
│   │   │   ├── Catalog.jsx        # Shared: admin catalog + client rewards
│   │   │   ├── MemberDetail.jsx
│   │   │   ├── Members.jsx
│   │   │   ├── OpManagement.jsx   # Operator CRUD (Supabase)
│   │   │   └── Settings.jsx
│   │   ├── client/
│   │   │   ├── ClientHome.jsx     # Main member dashboard (tier card, QR, surveys, rating)
│   │   │   ├── ClientLogin.jsx    # Google OAuth + phone login
│   │   │   ├── ClientProfile.jsx  # Phone registration profile form
│   │   │   ├── ClientRaffle.jsx   # Raffle view with points display
│   │   │   ├── ClientRegister.jsx # Phone number registration
│   │   │   └── GoogleProfile.jsx  # Google OAuth profile completion
│   │   ├── operator/
│   │   │   ├── OpClients.jsx      # QR scan + purchase registration
│   │   │   ├── OpHome.jsx         # Operator dashboard with live rating
│   │   │   ├── OpRaffle.jsx
│   │   │   ├── OpRedeem.jsx
│   │   │   └── OperatorLogin.jsx  # 4-field login (gafete, DPI, user, pass)
│   │   ├── shared/
│   │   │   └── Rules.jsx          # Tier rules with member progress
│   │   └── App.jsx                # Main app: routing, state, Realtime, push
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

## Acceso por URL (Sin switcher visible)
- **Miembro:** `club-turkaj.vercel.app` (Google OAuth)
- **Operador:** `club-turkaj.vercel.app/?rol=operador`
- **Admin:** `club-turkaj.vercel.app/?rol=admin`

---

## Supabase Schema (18 tablas)
- `members` — con `card_id`, `auth_provider_id`, `last_station`, `last_operator_id`
- `operators` — con `station_id`, `password_hash`, `gafete`, `username`
- `stations` — con `lat`, `lng`, `address` (3 estaciones con coordenadas reales)
- `physical_cards` — `assigned_to` → members, `card_code` format: `CT[OPB]D-XXXXX`
- `purchases` — con `station_id`, `fuel_type`, `gallons`, `points_earned`
- `redemptions` — con `reward_id`, `redemption_code`, `collected`
- `rewards` — catálogo de premios canjeables
- `surveys` — encuestas Shell con conteo diario (5/día)
- `activity_log` — historial de actividad por miembro
- `operator_ratings` — calificación por estrellas (1-5)
- `push_subscriptions` — suscripciones push por miembro (endpoint, keys)
- `raffle_calendar`, `raffle_entries` — rifas mensuales
- `promotions`, `program_config` — configuración del programa
- `referrals` — sistema de referidos

### Realtime habilitado en:
- `members` (REPLICA IDENTITY FULL)
- `operator_ratings`

---

## Funcionalidades Implementadas

### Vista Miembro
- Login con Google OAuth (3-layer fallback: auth_provider_id → sin join → email)
- Tarjeta de nivel con beneficios y barra de progreso (galones)
- Código QR dinámico (prefijo cambia con tier: CTOD/CTPD/CTBD)
- Encuesta Shell con timer 1.5 min + visibilitychange API (auto-cancel/auto-claim)
- Estaciones con direcciones + deep links Google Maps / Waze
- Calificación de operador via Realtime (auto-submit al tocar estrella)
- Push notifications al registrar compra
- Historial de actividad (compras, canjes, encuestas, registro)
- Mis Canjes (cargados de Supabase)
- Control de encuestas diarias (5/día, persistente en Supabase)
- Logout button

### Vista Operador
- Login con 4 campos (gafete, DPI, usuario, contraseña)
- Dashboard con clientes, compras del día, rating en vivo
- Escaneo QR con cámara (html5-qrcode)
- Botón "Registrar Compra" abre cámara directo
- Registra compra + guarda station_id + last_operator_id
- Rating se actualiza en tiempo real via Realtime

### Vista Admin
- CRUD de operadores (escriben a Supabase)
- Gestión de miembros, catálogo, rifas, configuración
- Reglas con progreso del miembro en su nivel actual

---

## Variables de Entorno (Vercel)
```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbG...
VAPID_PUBLIC_KEY = BKqBVqph...
VAPID_PRIVATE_KEY = DSqoZIw1...
VITE_VAPID_PUBLIC_KEY = BKqBVqph... (mismo que VAPID_PUBLIC_KEY)
```

---

## Pendiente / En Progreso
- Push notifications: archivos creados, falta agregar `<link rel="manifest">` al index.html y deploy
- Verificación WhatsApp para registro por teléfono (evaluando proveedores)
- Manifest PWA para Google Play Store (TWA)

---

## Coordenadas de Estaciones
- Turkaj I: 14.942641, -91.109861 — 7 avenida 6-10 zona 1, Chichicastenango
- Turkaj II: 14.937885, -91.110859 — 8 avenida 12-43 zona 1, Chichicastenango
- Turkaj III: 14.964534, -91.102676 — Km 148, La Cruz, Chulumal I, Chichicastenango

---

## Reglas de Negocio
- Conversión: Q10 = 1 punto
- Tiers: ORO (0-149 gal), PLATINO (150-499 gal), BLACK (500+ gal)
- Card codes: CTOD-XXXXX (ORO), CTPD-XXXXX (PLATINO), CTBD-XXXXX (BLACK)
- Encuestas: 5/día, timer 1.5 min, 5ta encuesta = boleto bonus
- Survey URLs:
  - Turkaj I: https://tellshell.shell.com/GTM?source=smartQR&s=10700531
  - Turkaj II: https://tellshell.shell.com/GTM?source=smartQR&s=10700717
  - Turkaj III: https://tellshell.shell.com/GTM?source=smartQR&s=10700211
