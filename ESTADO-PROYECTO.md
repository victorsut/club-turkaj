# Club Turkaj v2 — Referencia Técnica del Proyecto
## Última actualización: Junio 2026

> **Este documento es solo REFERENCIA TÉCNICA** (stack, estructura de archivos,
> schema, variables de entorno, coordenadas, reglas de negocio). Se irá
> actualizando con la realidad del proyecto.
>
> **El plan maestro (producto + seguridad) vive en [`ROADMAP.md`](./ROADMAP.md).**
> Todo el **Track de Seguridad** (SEC.A/B/C, B.9, hallazgo de arquitectura
> anon+token, FIX-MODAL) se movió allí en la reconciliación v2.4 — buscá la
> sección **"Track de Seguridad (SEC)"**. El estado de las fases de producto
> (F0–F9, FA, FB) también está en el ROADMAP.

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
- `redemptions`
- `purchases` (FIX-MODAL — INSERT dispara el modal de calificación)

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
