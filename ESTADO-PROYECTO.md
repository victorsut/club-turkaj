# Puntos Plus — Referencia Técnica del Proyecto
## Última actualización: 4 de septiembre de 2026 (reconciliada contra el repo y la base de datos)

> **Este documento es solo REFERENCIA TÉCNICA** (stack, estructura, schema,
> RPCs, endpoints, variables de entorno, accesos, reglas de negocio vigentes).
> Se reconcilia con la realidad del repo cuando cambia algo estructural.
>
> **El plan maestro (fases, decisiones D1–D37, track de seguridad SEC, deuda
> técnica y changelog) vive en [`ROADMAP.md`](./ROADMAP.md).** Las reglas
> operativas para trabajar el código están en [`CLAUDE.md`](./CLAUDE.md).
> La API pública para el POS de PROPER está documentada en
> [`docs/API-PROPER.md`](./docs/API-PROPER.md) y el diseño de Puntos Plus
> Business (flotas) en [`docs/PUNTOS-PLUS-BUSINESS.md`](./docs/PUNTOS-PLUS-BUSINESS.md).

---

## 1. Identidad y estado

- **Producto:** Puntos Plus (antes "Club Turkaj"), plataforma de fidelización
  independiente. Primer cliente: Gasolineras Turkaj I, II y III
  (Chichicastenango, Guatemala). Una instancia por empresa (D-arquitectura en
  ROADMAP §2).
- **Estado:** PWA en producción activa con socios reales. Plan v3.0 ejecutado
  en ~95 % (ROADMAP v4.2). Pendiente: checklist de GO-LIVE (interruptores
  apagados a propósito) y gestiones externas del dueño.
- **Producción:** https://puntosplus.vercel.app (sin guión —
  `puntos-plus.vercel.app` es un proyecto AJENO).
- **Repo:** github.com/victorsut/puntos-plus, rama `main` → Vercel auto-deploy.
- **Supabase project:** `rfharnrsatgliynzcuwp`.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 (JSX) + Vite 6, sin framework de UI (estilos inline + `src/styles/global.css`) |
| Backend | Supabase: PostgreSQL 15 + Auth (Google OAuth) + Realtime + Storage + RLS |
| Serverless | Vercel Functions (`api/`), 2 crons diarios |
| Push | `web-push` + VAPID, Service Worker propio (`public/sw.js`) |
| QR | `qrcode.react` (generación local) + `html5-qrcode` (escáner del operador) |
| Biometría | `@simplewebauthn/browser` + `@simplewebauthn/server` (passkeys) |
| OTP teléfono | Twilio Verify (`api/verify-phone.js`, apagado hasta GO-LIVE) |
| 3D | `three` (visor 3D de vehículos, EN PAUSA; chunk perezoso) |
| Android | Capacitor 8 (`android/`, `capacitor.config.json` apunta a la web viva) |

**Dependencias** (`package.json`): `react`, `react-dom`, `@supabase/supabase-js`,
`html5-qrcode`, `qrcode.react`, `web-push`, `three`, `@simplewebauthn/browser`,
`@simplewebauthn/server`, `@capacitor/core`, `@capacitor/android`.
Dev: `vite`, `@vitejs/plugin-react`, `@capacitor/cli`, `@capacitor/assets`.

**Scripts:** `npm run dev` (puerto 3000) · `npm run build` (→ `dist/`, el plugin
`swVersionPlugin` estampa `CACHE_NAME` en `sw.js`) · `npm run preview`.

**Code splitting:** vistas de operador y admin en `React.lazy` (el cliente es
eager); la ventana Vehículos y cada arte de vehículo son chunks propios;
`ChunkBoundary` recarga una vez si un chunk desaparece tras un deploy y
`vercel.json` excluye `/assets/` del rewrite SPA (404 limpio, no HTML).

---

## 3. Estructura del repo (636 archivos en git; 270 en `src/`)

```
puntos-plus/
├── api/                          # Vercel Functions (Node, service key)
│   ├── _lib/apiAuth.js           # núcleo API pública: API key bcrypt vs api_clients
│   ├── _lib/push.js              # motor de push (web-push + tabla notifications)
│   ├── v1/{stations,members,purchases,redemptions}.js   # API REST para PROPER (F7a)
│   ├── send-push.js              # envío genérico (type rutea el click en sw.js)
│   ├── log-notification.js       # registra el push que el SW realmente mostró
│   ├── degradation-alerts.js     # cron 09:00 GT — avisos de inactividad (D-degradación)
│   ├── vehicle-service-alerts.js # cron 09:10 GT — próximo servicio del vehículo (D24)
│   ├── upload-avatar.js          # bucket avatars (foto de perfil del socio)
│   ├── upload-promo-image.js     # bucket promo-images (imagen 900×1200 de la promo)
│   ├── verify-phone.js           # OTP Twilio Verify al registrarse (F5)
│   └── webauthn.js               # login con huella/rostro (passkeys)
├── public/                       # manifest.json, sw.js, favicon/icon/logo, privacidad.html, eliminacion.html
├── src/
│   ├── main.jsx                  # bootstrap + registro del SW + recarga por vite:preloadError
│   ├── views/App.jsx             # estado global, rol por URL, ctx para todas las vistas
│   ├── views/ScreenRouter.jsx    # imports de vistas (eager/lazy), BottomNav, ChunkBoundary
│   ├── views/client/             # ClientHome, ClientLogin, GoogleProfile, PhoneVerifyStep,
│   │                             #   ClientMenu, ClientPromos, ClientRaffle, HistorySheet,
│   │                             #   NotificationsSheet, RewardQrSheet, TermsSheet,
│   │                             #   CompanySelect, VehiclesScreen
│   │   ├── history/              # HistoryFilters (fila de períodos + embudo de tipo del historial)
│   │   ├── home/                 # HomeHeader, PromoBentoTile, VehicleBentoTile, TierDetailModal,
│   │   │                         #   WifiModal, StationsMapModal, SurveyStationsModal
│   │   ├── menu/                 # MenuAccount, MenuInfo, MenuTerms, AvatarEditor,
│   │   │                         #   PhoneChangeSection, DeleteAccountSection, menuUi
│   │   ├── raffle/               # RafflePrizeCarousel (carrusel de meses con arrastre)
│   │   └── vehicles/             # VehiclesHome, VehicleForm, VehicleFuel, VehicleCharts,
│   │                             #   ServiceConfirmSheet
│   ├── views/operator/           # OperatorLogin, OpHome, OpClients, OpRedeem, OpRaffle
│   ├── views/admin/              # AdminShell (menú lateral), AdminDash (+dash/DashTops),
│   │                             #   Members, MemberDetail(+Modals), OpManagement,
│   │                             #   AdminManagement (admins), AdminCatalog, AdminPremios,
│   │                             #   AdminPromos/AdminPromoForm, PromoRules/PromoRuleForm,
│   │                             #   AdminRaffle/AdminRaffleForm, AdminStations, AuditLog,
│   │                             #   Settings (+settings/ApiKeyModal, FuelPricesCard,
│   │                             #   FuelPricesModal, ServiceAlertsCard), analytics/An{Clientes,Operadores,
│   │                             #   Promos,Integridad}
│   ├── views/shared/             # Catalog (admin + cliente), Rules
│   ├── components/               # modales y hojas globales: AppModals, OpRatingModal,
│   │                             #   SurveyResultModal, RedeemConfirm*, PurchaseConfirmSheet,
│   │                             #   RaffleWinnerModal, SpecialDayBonusModal, ClientQrSheet,
│   │                             #   SplashIntro (monedas 3D), UpdateAvailable
│   ├── components/ui/            # 132 archivos: BottomNav, BentoTile, BottomSheet, GrowModal,
│   │                             #   QRCode, QRScanner, TierCardBento, GalaxyStars/Dust,
│   │                             #   ModeToggle, Toast, ChunkBoundary, DrumDatePicker,
│   │                             #   PeriodPicker, ChipScroller, AddressPicker, RewardIcon,
│   │                             #   VehicleIcons, VehicleArt (+51 *Art.jsx y *Trace.js
│   │                             #   calcados por modelo), vehicle3d/ (three.js)
│   ├── hooks/                    # useAuthBoot, useSessionGuard, useMemberRealtime,
│   │                             #   useNotificationsInbox, useBusinessActions, useStaffData,
│   │                             #   useSurveyFlow, useBackLayer, useSwipeTrack, useToast,
│   │                             #   useShortScreen, useCountUp
│   ├── services/                 # bootLoader (carga inicial), rpcCore/rpcServices,
│   │                             #   adminRpcServices, secureReads (lecturas con sesión),
│   │                             #   authService / operatorAuthService / adminAuthService,
│   │                             #   sessionTokens / sessionExpiry, promoService,
│   │                             #   vehicleService, dataService
│   ├── lib/                      # supabaseClient, pushNotifications, swRegistration,
│   │                             #   webauthnClient, tierSystem, cardCodes, receiptModel/
│   │                             #   receiptPrinter (impresión térmica), inputMasks, dates,
│   │                             #   geo, mapMember, motionOrigin, backStack, text
│   ├── constants/                # config.js (DEFAULT_CONFIG, CARD_PREFIX…), styles.js,
│   │                             #   vehicleCatalog.js (marcas/modelos + bodyFor), geoGt.js
│   └── styles/global.css
├── supabase/migrations/          # 104 migraciones SQL (se ejecutan A MANO en el SQL Editor)
├── docs/                         # API-PROPER.md (+html, colección Postman), TIENDAS.md
├── tools/
│   ├── artes/                    # pipeline de calco de artes (motor, comparador, historico)
│   ├── harness/                  # arneses visuales (Vite puerto 3100 + Edge headless)
│   └── recuperar-transcript.cjs
├── android/                      # proyecto Capacitor (APK de prueba vía GitHub Actions)
├── .github/workflows/android-apk.yml
├── REFERENCIAS INTERFAZ/         # capturas de referencia del dueño (diseño + vehículos)
├── CLAUDE.md · ROADMAP.md · ESTADO-PROYECTO.md · DEPLOY.md
├── index.html · vite.config.js · vercel.json · capacitor.config.json
└── .mcp.json                     # MCP de Supabase y Vercel para Claude Code
```

Regla de modularidad: ningún archivo de `src/` supera las 500 líneas.

---

## 4. Acceso por rol

| Rol | URL | Autenticación |
|---|---|---|
| Socio (cliente) | `puntosplus.vercel.app` | Google OAuth (Supabase Auth) → sesión propia en `member_sessions` (180 días); alternativas: teléfono + contraseña (`authenticate_member`) y passkey (`api/webauthn`) |
| Operador | `?rol=operador` | RPC `authenticate_operator` (bcrypt server-side) → `operator_sessions` |
| Admin | `?rol=admin` | RPC `authenticate_admin` (bcrypt) → `admin_sessions`; gestión en Admin → Configuración → Administradores |

Deep-links: `?goto=pendientes` (canjes pendientes) y `?goto=vehiculo&vehicle=<id>`
(confirmación de servicio desde el push). `?station=` para las encuestas por
estación.

Todas las RPCs sensibles validan el token con `validate_session_token(token,
rol, nombre_rpc, strict, …)`; las tablas con PII están CERRADAS a la API
anónima (track SEC.C completo, ver ROADMAP).

---

## 5. Supabase — schema (38 tablas, 3 vistas, 125 funciones)

### Tablas por dominio
- **Socios y sesiones:** `members` (puntos, galones, tier, `card_id`, `degrade_stage`, espejo `vehicles` jsonb), `member_credentials` (teléfono + hash), `member_sessions`, `webauthn_challenges`, `phone_verifications`, `referrals`, `card_history`, `physical_cards` (13 seed `CTOD-00001..13` en `status='inactive'`; tarjeta física EN PAUSA).
- **Personal:** `operators` (+ `external_id` para colaboradores PROPER), `operator_sessions`, `operator_ratings`, `admins`, `admin_sessions`, `admin_audit_log`.
- **Operación:** `purchases` (`station_id`, `fuel_type`, `gallons`, `amount`, `points_earned`, `vehicle_id`, `km_reading`), `redemptions` (`confirm_status`, `redemption_code`, `collected`), `rewards`, `partner_stores`, `activity_log` (libro mayor del socio), `print_logs`, `surveys`, `special_days`.
- **Promociones:** `promotions` (cards con imagen), `promo_rules` + `promo_applications` (motor PROMO-1/2: dobles puntos, bonus por día/producto/monto).
- **Rifa:** `raffle_calendar`, `raffle_tickets`, `raffle_entries`.
- **Vehículos (F6):** `vehicles` (fuente de verdad; `alerts_muted`, `last_service`, `next_service`, `next_service_km`, `tank_gal`, `fuel_pref`…), `vehicle_fuel_logs` (consumos manuales fuera de Turkaj).
- **Push:** `push_subscriptions`, `notifications` (todo envío; inbox de la campana y dedupe).
- **API pública:** `api_clients` (API keys bcrypt), `api_requests` (idempotencia + log).
- **Config y guardas:** `stations` (+ `fuel_prices` propio por estación, D4), `program_config` (jsonb por clave: `general`, `tiers`, `degradation`, `degradation_enabled`, `fuel_prices`, `fuel_prices_mode`, `company`, `support`, `service_alerts`, `terms_*`, `phone_verification`), `points_write_violations`, `session_violations`.

**Vistas:** `raffle_participants`, `daily_survey_count`, `operator_rating_avg`.
**Buckets de Storage:** `promo-images`, `avatars` (solo service role; subida por `api/upload-*`).
**Extensiones:** `pgcrypto` (bcrypt), `uuid-ossp`, `pg_stat_statements`, `supabase_vault`.

### Realtime (publicación `supabase_realtime`)
`members` (REPLICA IDENTITY FULL), `purchases` (INSERT dispara el modal de
calificación; SELECT abierto solo 15 min y columnas mínimas), `redemptions`
(flujo de confirmación), `operator_ratings`, `notifications`.

### Triggers relevantes
- `members_guard_points_write` — ninguna escritura directa de puntos fuera de RPCs.
- `purchases_auto_vehicle` / `purchases_stamp_fuel` — asigna la compra al vehículo principal y sella `last_fuel_at`.
- `trg_vehicles_mirror` / `trg_members_sync_vehicles` — la tabla `vehicles` es la verdad; `members.vehicles`/`plate` son espejo; los escritores legados del jsonb se reconcilian por placa (solo se borran filas legadas sin marca/modelo/telemetría).
- `update_updated_at_column`, `rls_auto_enable`.

### RPCs (125) — familias
- **Sesión:** `authenticate_member` / `create_member_session_oauth` / `issue_member_session` / `set_member_password_oauth`, `authenticate_operator`, `authenticate_admin`, `validate_session_token`, `revoke_*_session`.
- **Socio:** `register_member`, `get_my_member`, `update_my_profile`, `update_member_password`, `delete_my_account`, `check_member_exists`, `get_my_redemptions`, `get_my_notifications` / `mark_my_notifications_read` / `clear_my_notifications`, `save_push_subscription`, `rate_operator`, `complete_survey` / `count_my_surveys_today`, `buy_raffle_tickets`, `mark_raffle_winner_seen`, `list_activity`, `list_raffle_participants`, `respond_redemption_confirm`, `redeem_reward`.
- **Vehículos:** `list_my_vehicles`, `save_my_vehicle`, `delete_my_vehicle`, `assign_purchase_vehicle`, `list_my_vehicle_stats`, `list_my_fuel_history`, `add_my_fuel_log` / `delete_my_fuel_log`, `confirm_my_vehicle_service`, `list_vehicle_service_alerts` (service_role).
- **Operador:** `register_purchase` → `register_purchase_core` (compartido con la API), `resolve_card`, `list_operator_purchases`, `list_member_pending_redemptions`, `get_redemption_by_code`, `get_redemption_status`, `list_operator_redemptions`, `operator_set_redemption_confirm`, `deliver_redemption`, `log_print`, `get_member_full`, `list_members_full`, `list_member_stations`.
- **Admin:** `create_operator` / `update_operator_password` / `update_operator_profile` / `toggle_operator_active` / `list_operators_full`, `list_admins` / `create_admin` / `update_admin_password` / `toggle_admin_active`, `update_member_with_audit`, `modify_member_points`, `admin_reset_member_password`, `admin_write_catalog` (rewards, promotions, special_days, raffle_calendar, stations, partner_stores), `manage_promo_rule` / `preview_promo` / `pick_best_promo`, `set_loyalty_config`, `set_degradation_enabled`, `set_company_info`, `set_support_phone`, `update_fuel_prices`, `set_fuel_prices_mode` / `update_station_fuel_prices` (+ `fuel_price_for`), `set_service_alerts_config`, `get_admin_kpis` (combustible, estaciones y canjes reales), `get_dash_monthly`, `get_station_top_members`, `get_admin_audit_log`, `log_admin_action`, `report_*` (canjes, consumo_segmentos, operadores, promos, rifas, integridad_*).
- **Motores:** `apply_due_degradations` (perezoso al abrir la app; APAGADO), `list_degradation_alerts` (cron), `draw_due_raffles` (sorteo automático al cierre del mes), `grant_special_day_bonus`.
- **API pública (PROPER):** `api_authenticate`, `api_create_client`, `api_resolve_member`, `api_resolve_station`, `api_upsert_operator`, `api_register_purchase`, `api_redemption_confirm`, `api_list_pending_redemptions`, `api_get_redemption`, `api_log_request`, `api_replay`.

---

## 6. Endpoints serverless (Vercel)

| Ruta | Uso | Auth |
|---|---|---|
| `GET /api/v1/stations`, `GET /api/v1/members`, `POST /api/v1/purchases`, `GET/POST /api/v1/redemptions` | API REST para el POS de PROPER (`docs/API-PROPER.md`) | API key bcrypt (`api_clients`), scopes |
| `POST /api/send-push` | push directo a socios (compra manual del operador, avisos) | sesión de operador/admin |
| `POST /api/log-notification` | el SW registra el push que sí mostró | id de notificación |
| `POST /api/upload-avatar`, `POST /api/upload-promo-image` | subida a Storage (service role) | sesión socio / admin |
| `POST /api/verify-phone` | OTP Twilio al registrarse (interruptor `phone_verification`) | — |
| `POST /api/webauthn` | registro y login con passkey | challenge en `webauthn_challenges` |
| `GET /api/degradation-alerts` | cron diario 09:00 GT (`0 15 * * *` UTC) | `Bearer CRON_SECRET` |
| `GET /api/vehicle-service-alerts` | cron diario 09:10 GT (`10 15 * * *` UTC) | `Bearer CRON_SECRET` |

---

## 7. Variables de entorno (Vercel)

```
VITE_SUPABASE_URL           # cliente y funciones
VITE_SUPABASE_ANON_KEY      # cliente
SUPABASE_SERVICE_KEY        # SOLO funciones api/ (nunca al navegador)
VITE_VAPID_PUBLIC_KEY       # suscripción push en el cliente
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY   # web-push server-side
CRON_SECRET                 # autoriza los dos crons
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID   # OTP (pendiente contratar)
```

Local: `.env` con las tres `VITE_*`. Las migraciones NO se aplican por CLI:
se ejecutan a mano en el SQL Editor de Supabase (regla de CLAUDE.md §9).

---

## 8. Funcionalidad vigente por vista

### Socio (PWA, modo claro/oscuro por `ctx.dark`; identidad visual por nivel)
- Splash con monedas 3D; login Google / teléfono+contraseña / passkey; registro con wizard (dirección, vehículos, OTP opcional).
- Inicio en bento: tarjeta de nivel (progreso en galones), Promociones (carrusel), Vehículo (arte del principal), WiFi (PLATINO/BLACK), Encuesta de Satisfacción, Ubicación (mapa + Waze/Maps), Historial de canjes, Historial de compras; campana con inbox de notificaciones; canal de asistencia (WhatsApp).
- QR dinámico con prefijo por tier; modal de calificación del operador por compra (Realtime) con selector de vehículo y odómetro; encuestas Shell (5/día, espera oculta de 75 s, resultado persistente).
- Canjes con confirmación en dos pasos y comprobante QR; rifa mensual con carrusel de meses (arrastre) y compra de boletos; historial con una fila de períodos (Todo · años · Hoy · meses) y filtro de tipo en un icono de embudo. Historial, Canjes y Rifa son contenedores fijos al viewport: título y filtros quedan quietos y solo se desplazan las filas, los premios o los participantes.
- Vehículos (F6, para todos desde el 4-sep): carrusel de artes con arrastre, ficha (km, aceite, próximo servicio por fecha/km, tanque, combustible habitual), telemetría (km/gal, km/día, costo por km, gráficas), consumos manuales, historial de cargas por vehículo con reasignación, confirmación de servicio desde el push, silencio de recordatorios por vehículo, zona de riesgo para eliminar.
- Menú: cuenta (avatar, teléfono con OTP, contraseña, eliminar cuenta), información, términos, modo claro/oscuro.

### Operador
- Login (usuario + contraseña; bcrypt server-side). Panel con ventas del día, rating en vivo (Realtime), estación de la última venta.
- Registrar compra: escáner QR (`resolve_card`), galones reales, promociones aplicadas por el motor, push de calificación al socio.
- Canjes: por código, confirmación al socio (Realtime), entrega atómica con comprobante e impresión térmica (`window.print`, `print_logs`). Rifa: venta de boletos.
- Con PROPER activo el colaborador NO usa esta vista: el POS llama a la API y la estación viaja en cada factura.

### Admin (shell lateral, desktop-first)
- Dashboard con KPIs reales (Q por combustible y por estación, puntos canjeados = suma de `points_spent`) y tops; Socios (ficha completa, ajustes de puntos auditados, reset de contraseña); Personal (operadores + admins); Catálogo de premios (localizaciones y tiendas asociadas); Promociones (cards con imagen) y Reglas de promoción (motor); Rifas; Estaciones (WiFi, horario, coordenadas, código PROPER); Días especiales.
- Configuración: identidad de la empresa, puntos por nivel y eventos, precios de combustible (globales o por estación, D4), degradación (interruptor), soporte, alertas de servicio (umbrales D24), administradores, API externa (llaves), términos.
- Análisis: clientes, operadores, promociones, integridad (cuentas de personal, repetidos, afinidad). Auditoría (`admin_audit_log`) con filtros.

---

## 9. Reglas de negocio vigentes (resumen; el detalle manda en CLAUDE.md §1)

- **Puntos por tier:** ORO Q10 = 1 pt · PLATINO Q8 · BLACK Q6 (divisor del tier PREVIO a la compra; editable en Admin). Eventos especiales: 25 / 35 / 50 pts.
- **Tiers por galones:** ORO 0–149 · PLATINO 150–499 · BLACK 500+. Card codes `CTOD-` / `CTPD-` / `CTBD-`.
- **Degradación por inactividad:** 15 días de gracia, caída progresiva desde el día 16, reinicio total a los 45 días de caer a ORO. Motor APAGADO hasta GO-LIVE (`program_config.degradation_enabled`).
- **Encuestas:** 5/día, espera 75 s oculta, la 5ª da boleto de rifa.
- **Descuento en canjes:** ORO 0 % · PLATINO 10 % · BLACK 15 %. Descuentos por galón RETIRADOS.
- **Rifa:** sorteo automático al cierre del mes ponderado por boletos; multi-año.
- **PROPER (NIT):** socio con NIT → solo CF o su NIT; sin NIT → solo CF. El comprobante de premio se imprime SOLO al entregar.
- **Alertas de servicio (D24):** umbrales globales editables (default 7 días / 500 km; recordatorios de vencido cada 7 días por fecha y cada 14 por km); silencio por vehículo.
- **Tarjeta física:** deseo a futuro, no implementar sin pedido explícito.

---

## 10. Estaciones y encuestas

| Estación | Dirección | Coordenadas | Encuesta Shell |
|---|---|---|---|
| Turkaj I | 7a Av 6-10 Z1, Chichicastenango | 14.942641, -91.109861 | https://tellshell.shell.com/GTM?source=smartQR&s=10700531 |
| Turkaj II | 8a Av 12-43 Z1, Chichicastenango | 14.937885, -91.110859 | https://tellshell.shell.com/GTM?source=smartQR&s=10700717 |
| Turkaj III | Km 148, La Cruz, Chulumal I | 14.964534, -91.102676 | https://tellshell.shell.com/GTM?source=smartQR&s=10700211 |

Editables en Admin → Estaciones (tabla `stations`); las URLs de encuesta y el
WiFi por estación viven ahí.

---

## 11. Verificación visual y herramientas

- `tools/harness/`: páginas Vite (`home-tile`, `raffle`, `history`, `catalog`, `d24`, `d4`) que montan
  componentes del cliente con datos simulados. Servidor:
  `npx vite --config tools/harness/vite.harness.config.js` (puerto 3100) y
  captura con Edge headless (`msedge --headless=new --screenshot=… --window-size=390,900 --virtual-time-budget=15000 <url>`).
- `tools/artes/`: pipeline de calco de las 51 artes de vehículos (motor de
  trazado, comparador ref-vs-arte, histórico). Ver su `README.md`.
- APK Android de prueba: GitHub Actions → workflow "APK Android (debug)" →
  artifact `puntos-plus-debug-apk`; carga la web viva (no hay que recompilar
  por cada deploy).

---

## 12. Pendiente (fuente: ROADMAP v4.2)

- **GO-LIVE:** encender degradación (`set_degradation_enabled`), encender
  `phone_verification` (requiere Twilio), revocar la API key "Pruebas" de
  PROPER, verificación general. ≈4-8 hs.
- Retirar `beta: true` de compatibilidad en `list_my_vehicles`
  cuando no queden PWA viejas cacheadas.
- Track TIENDAS (Play Store / App Store) y contacto técnico de PROPER —
  gestiones del dueño.
- **F8 Puntos Plus Business** (flotas, prepago, vales como canjes): diseño técnico propuesto en `docs/PUNTOS-PLUS-BUSINESS.md`, 180-250 hs en 7 etapas, pendiente de validación del dueño · F9 reportería opcional.
