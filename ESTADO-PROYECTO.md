# Club Turkaj v2 — Estado Actual del Proyecto
## Última actualización: Junio 2026

---

## Seguridad — Bloque SEC.B (sesiones de operador/admin)

Cierre del agujero de permisos `anon` en las RPCs sensibles vía tokens de
sesión. **Estado global: B.3 ✅ · B.4 ✅ · B.5 ✅ · B.6 ✅ (B.6.1 ✅ · B.6.2 ✅ · B.6.3 ✅ · B.6.4 ✅) · B.8 ✅ (B.8.1 ✅ · B.8.2 ✅) · falta solo B.9.** (B.7, observación pasiva, se absorbió como observación activa corta en B.8.1.)

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

---

### SEC.B.6.4 — Cierre proactivo de sesión expirada (cliente) ✅

**Problema que resuelve:** dispositivo exclusivo por operador. El operador olvida
cerrar sesión, vuelve **al día siguiente** al mismo dispositivo y la app lo
muestra logueado aunque el token ya venció (TTL 18h superado) → **sesión zombi**.
Sin esto, lo descubriría recién al fallar una compra real (con cliente
enfrente), y peor aún tras B.8 strict (rechazo server-side). B.6.4 lo detecta en
el cliente y lo manda al login limpio **antes** de que el server tenga que
rechazar. **Cliente puro, hermano de B.6.3.** No es idle-timeout por
inactividad: es chequeo de expiración del token dirigido por **eventos**.

**Qué entró (todo en `App.jsx`):**
- **`expireSession(role, {reason})`** — helper reutilizable: termina la sesión de
  operador/admin (`logoutOperator`/`logoutAdmin` → revocación B.6.3 + reset de
  estado React + `fire` con el aviso). `reason` `'cerrada'` → "Sesión cerrada";
  `'expirada'` → "Tu sesión expiró, iniciá sesión de nuevo". El `logout` manual
  se **refactoriza para delegar** en él (ramas operador/admin), preservando
  comportamiento **exacto** (mismas 6 llamadas en el mismo orden, revocación
  B.6.3 intacta, mismo borrado/navegación, redundancias preexistentes sin tocar,
  rama cliente `isC` intacta).
- **`checkSessionAlive()`** — detecta la zombi por **condición conjunta**:
  `loggedOp`/`loggedAdmin` presente **Y** `getOperatorToken()`/`getAdminToken()`
  === `null` (token vencido; `getXToken` auto-limpia). Solo ese caso mixto
  dispara el cierre. Lee `viewRef.current` (no `view`). **Cliente protegido por
  doble barrera independiente:** `viewRef.current === 'client'` → no-op, y aunque
  no lo fuera, nunca tiene `loggedOp`/`loggedAdmin` truthy (su sesión vive en
  Supabase Auth / `ct_me`, no en `ct_op`/`ct_admin`).
- **Dos enganches:** `useEffect([])` al montar (operador vuelve al día siguiente
  y abre/recarga la app) + listener `visibilitychange` (patrón de
  `ClientHome.jsx`) con dep **`[checkSessionAlive]`** que **resuelve el stale
  closure** de `loggedOp`/`loggedAdmin`: al cambiar esos valores (login después
  del arranque), `checkSessionAlive` se recrea y el listener se re-registra con
  el closure fresco — sin esto, una sesión iniciada tras el mount no se
  detectaría al volver de reposo.

**Fuera de alcance:** el cliente (su sesión la maneja Supabase Auth nativo).

**Reutilización futura:** `expireSession` es la **misma** acción que **B.8.2**
necesitará para el rechazo reactivo (cuando strict responda `error.code 28000`,
interceptar y llamar `expireSession(role, {reason:'expirada'})`). B.6.4 deja esa
pieza construida y probada en el camino proactivo antes de que strict la use en
el reactivo.

**Pendiente del bloque:** B.8 (modo strict — flip del helper a `RAISE`, con
observación activa corta absorbiendo el rol de B.7; reutiliza `expireSession`
para el rechazo reactivo), B.9 (`REVOKE EXECUTE FROM anon`).

---

### SEC.B.8.1 — Validación de sesión en modo STRICT (flip warn→strict) ✅

**Qué entró:** `supabase/migrations/20260627_sec_b8_1_session_strict.sql`. Flip
del helper `validate_session_token` de **warn** (registra sin bloquear, B.6.1) a
**strict** (`RAISE EXCEPTION`). Las 4 RPCs sensibles (`register_purchase`,
`buy_raffle_tickets`, `update_member_with_audit`, `modify_member_points`) ahora
**rechazan** tokens ausentes/inválidos/revocados/expirados en vez de solo
registrarlos.

**Cambios (solo el helper):** `CREATE OR REPLACE` **sin DROP** (firma sin
cambios → grants de B.6.1 preservados, sin re-emitir REVOKE/GRANT; NO toca las 4
RPCs). Ramas **1b/2/3/4/5** → `RAISE EXCEPTION` con **ERRCODE 28000**
(`invalid_authorization_specification`) + subtipo en `DETAIL`
(`no_token`/`invalid_token`/`invalid_token`/`revoked_token`/`expired_token`).
Se **eliminó el INSERT a `session_violations`** de esas ramas: el `RAISE`
revierte la tx, así que el INSERT era código muerto. `COMMENT` actualizado a
modo STRICT.

**Decisiones:**
1. **ERRCODE 28000 ≠ 42501** (guard de puntos FB): el cliente distingue "sesión
   inválida → mandar a login" de "escritura de puntos no autorizada → bug".
2. **En strict `session_violations` no se puebla** para estas ramas (consecuencia
   del rollback). El histórico de la fase warn queda intacto; el rastro
   post-strict es el error PostgREST en logs.
3. **Rama 1a INTACTA** (`p_token NULL AND p_allow_null → RETURN NULL`): primer
   chequeo, antes de cualquier `RAISE`. Vector cliente del raffle sigue sin
   protección de token — **frontera de B.6, su cierre es SEC.C**.
4. **Revert documentado** copy-paste-listo en el header de la migración (un solo
   `CREATE OR REPLACE` al cuerpo warm de B.6.1, sin tocar las 4 RPCs).

**Validación:** drift cero pre-flight (`pg_get_functiondef` prod = B.6.1
byte-idéntico). Catálogo post-aplicación confirmado (RAISE 28000 en 1b/2/3/4/5,
1a sigue `RETURN NULL`). **Observación activa 5/5:** compra de operador, boleto
de operador y edición de admin (tokens válidos) sin 28000; boleto de cliente con
token NULL sin 28000 (rama 1a, no bloqueado); token inválido (`BASURA-123`,
expiry futuro) **bloqueado con code 28000**.

> **Recordatorio — B.8.1 NO cierra el vector cliente del raffle.** La rama 1a es
> deliberada; cualquiera con la apikey `anon` y token NULL puede gastar puntos de
> cualquier `member_id` en `buy_raffle_tickets`. Su cierre es **SEC.C**.

**Pendiente del bloque:** **B.8.2** (UX del rechazo 28000 en el cliente —
interceptar y llamar `expireSession(role, {reason:'expirada'})`, cliente puro,
ver SEC.B.6.4), **B.9** (`REVOKE EXECUTE FROM anon` en las 4 RPCs).

---

### SEC.B.8.2 — UX del rechazo de sesión (intercepción 28000 → expireSession) ✅

**Qué entró (cliente puro, no toca producción):** cierra la cara cliente de B.8.
Con B.8.1 el server rechaza tokens inválidos con ERRCODE 28000, pero el cliente
mostraba el toast crudo del RAISE ("Error: Sesión inválida"). B.8.2 lo reemplaza
por **logout + redirect al login + aviso "Tu sesión expiró"**, reutilizando
`expireSession` (B.6.4).

**Arquitectura (no había patrón previo de servicio→UI; los servicios eran
puros):**
- **`src/services/sessionExpiry.js`** (nuevo singleton, ~10 líneas, sin deps):
  `setSessionExpiredHandler(fn)` / `notifySessionExpired()`. Invierte la
  dependencia: la capa de servicios solo "avisa", la capa React decide.
- **Detección centralizada** en `rpcServices.js`: `error.code === '28000'` en
  `callRpc` (cubre `register_purchase` + `buy_raffle_tickets`) y en los 2
  wrappers crudos (`updateMemberWithAudit`, `modifyMemberPoints`) →
  `notifySessionExpired()` + flag `sessionExpired: true` en el shape de retorno.
- **Handler en App.jsx** (`handleSessionExpired`): lee `viewRef.current` y mapea
  a `expireSession('operator'|'admin', {reason:'expirada'})`. Registrado en el
  singleton vía `useEffect` con cleanup (dep `[handleSessionExpired]`, mismo
  razonamiento de stale closure que B.6.4).
- **Guarda de 1 línea** (`if (sessionExpired) return;`) en 3 call sites
  (App.jsx `register_purchase`, OpRaffle.jsx `buy_raffle_tickets` operador,
  MemberDetail.jsx `update_member_with_audit` — esta **antes** de la
  ramificación 22023/23505) para no pisar el toast lindo con el crudo. **Cero
  lógica de decisión en los call sites:** solo el bail.

**Decisiones:**
1. **Intercepción centralizada** (servicios + handler), no por call site.
2. **Por `error.code`** (no por mensaje — frágil).
3. **Rol vía `viewRef.current`** en el handler — resuelve el doble vector de
   `buy_raffle_tickets` (operador/cliente) sin tocar firmas.
4. **Singleton en módulo propio** (responsabilidad única, no en `sessionTokens`).
5. **Cliente excluido por diseño** — la rama 1a (token NULL + allow_null) no
   produce 28000, así que el interceptor nunca se dispara para el cliente; su
   call site (App.jsx `buy_raffle_tickets` cliente) no se tocó.
6. **`modify_member_points`** con detección a prueba de futuro (sin call site en
   UI hoy).

**Deuda resuelta:** el rechazo de sesión ahora tiene UX limpia (login + aviso)
en vez del toast crudo. `expireSession` queda como **pieza compartida** entre el
cierre proactivo (B.6.4) y el reactivo (B.8.2).

**Pendiente del bloque:** **B.9** (`REVOKE EXECUTE FROM anon` en las 4 RPCs) para
cerrar SEC.B. El vector cliente del raffle sigue sin protección de token (rama
1a, deliberado → **SEC.C**).

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
