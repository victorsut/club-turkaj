# Puntos Plus Business — Diseño técnico (F8)
## Versión 0.2 · 4 de septiembre de 2026 · estado: DISEÑO ACORDADO, EN PAUSA hasta definir los premios

> Programa de flotas de Puntos Plus. Recoge las decisiones tomadas con el
> dueño el 4-sep-2026 (dos rondas) y el diseño técnico sobre la base actual.
> **Restricción rectora:** la API pública de PROPER (`docs/API-PROPER.md`)
> NO cambia; todo lo nuevo vive en nuestros RPCs, tablas y vistas.
> **Nada de esto está construido.** Se retoma cuando el dueño defina el
> catálogo de premios (corporativos y de combustible) y los detalles que
> queden por aclarar (§8).

---

## 1. Decisiones de producto (acordadas 4-sep-2026)

| # | Decisión |
|---|---|
| B1 | Modelo **prepago**: la empresa paga a gerencia (efectivo, depósito o transferencia), envía el comprobante por WhatsApp u otro medio, gerencia verifica y un admin de Puntos Plus registra el saldo con fecha, banco, monto y referencia. Depósitos acumulativos. **Crédito** solo preparado: límite por empresa, cero por defecto. |
| B2 | **Libro mayor por empresa**: el saldo es la suma de movimientos; nunca una columna editable. |
| B3 | El **vale** es la pieza central y se comporta como un canje de la app: código único + QR propio, escaneo por operador o POS, confirmación y entrega atómicas. Monto en quetzales, chofer, vigencia configurable por la empresa, vehículo de empresa o del colaborador, combustible fijo o libre. |
| B4 | Los **choferes son socios** de Puntos Plus, afiliados a la empresa. En su app aparece el apartado "Mi flota". |
| B5 | Vale de **una sola carga** por defecto. Si la empresa lo permite en varias cargas, al usar una parte la app genera **dos canjes**: el que se consume ahora y otro por el resto, ambos con la misma fecha de vencimiento. |
| B6 | Lo **no consumido al vencer** regresa al saldo de la empresa. |
| B7 | **La entrega del canje ES el consumo**: al confirmarse se descuenta el libro mayor por el monto completo del canje y el operador despacha exactamente ese monto. No hay ajuste posterior por el monto despachado. |
| B8 | Los **galones** de cada carga se calculan con el precio registrado en Puntos Plus (global o por estación, D4) para el combustible del canje. Se registran en el vehículo (telemetría) pero **NO avanzan el recorrido de galones del nivel del socio**: no es combustible pagado con su dinero. Igual para los canjes de combustible de la app normal. |
| B9 | Los **puntos** de las cargas de flota van al **fondo de la empresa**; el chofer no recibe puntos. Los canjes de combustible de la app normal no acreditan puntos. |
| B10 | Al entregar cualquier canje de combustible (flota o normal) se abre en el celular del socio el **modal de calificación** con selector de vehículo y odómetro, para atribuir la carga a un vehículo. |
| B11 | **Restricción de estaciones** por empresa, configurada por el admin de Puntos Plus (una, varias o las tres). Combustible por vale: fijo o libre; si es libre, el chofer lo elige en la app antes de que lo escaneen. |
| B12 | **Facturación** configurable por empresa desde el admin: "al depósito" (una factura por depósito, ningún documento por consumo) o "por consumo" (corte diario consolidado por tipo de combustible del día anterior). |
| B13 | **Encargados de flota**: varios por empresa, permisos "gestiona" o "consulta". Auditoría por empresa: básica (quién y cuándo) o estricta (motivo obligatorio). |
| B14 | Vista del encargado = **rol nuevo `flota`** en la misma PWA, junto a operador y admin, con usuario y contraseña propios, ajena a la cuenta personal del encargado; funciona en computadora y celular. |
| B15 | **Confirmación del chofer** al entregar: en su celular o automática ("con el sistema"), según configuración de la empresa; automática por defecto. |
| B16 | **Red de seguridad**: si el POS de PROPER llegara a enviar también la venta del vale como compra por la API, el servidor la reconoce (mismo chofer, carga entregada en los últimos 15 min) y no acredita puntos ni descuenta nada dos veces. |
| B17 | Métricas para el admin de Puntos Plus: saldo vs consumo habitual, semanas de cobertura, alerta de saldo excesivo. |
| B18 | **Premios**: corporativos (para la empresa) y asignables a colaboradores. **PENDIENTE de definir** por el dueño; no se construye nada de premios hasta entonces. |

---

## 2. Modelo de datos (tablas nuevas y cambios)

Todas las tablas nuevas CERRADAS a la API anónima (patrón SEC.C): lectura y
escritura solo por RPCs con sesión (`flota`, `admin`, `member`) o service role.

### 2.1 Nuevas

| Tabla | Para qué | Columnas clave |
|---|---|---|
| `companies` | La empresa cliente | `id`, `name`, `nit`, `contact_name`, `contact_phone`, `active`, `station_ids uuid[]` (NULL = todas), `billing_mode` ('deposit' / 'consumption'), `audit_mode` ('basic' / 'strict'), `driver_confirm` (bool, default false), `credit_limit numeric` (default 0), `points`, `created_at` |
| `company_users` | Encargados de flota (login propio) | `id`, `company_id`, `name`, `username`, `password_hash` (bcrypt server-side como `operators`), `role` ('manager' / 'viewer'), `active` |
| `company_sessions` | Sesiones del rol `flota` | igual que `operator_sessions` (token, expira, revocación) |
| `company_members` | Afiliación chofer ↔ empresa | `company_id`, `member_id`, `label` (puesto), `active`, `added_by`, `added_at`; un socio en una sola empresa activa |
| `company_ledger` | **Libro mayor** | `id`, `company_id`, `kind` ('deposit' / 'voucher_issue' / 'voucher_consume' / 'voucher_return' / 'adjustment'), `amount` (+ entra / − sale), `balance_after`, `ref_type`, `ref_id`, `note`, `created_by_kind` ('admin' / 'company' / 'system'), `created_by`, `created_at` |
| `company_deposits` | Detalle del depósito | `id`, `company_id`, `amount`, `method` ('cash' / 'transfer' / 'deposit'), `bank`, `reference`, `deposited_on`, `receipt_url` (bucket privado), `invoice_no`, `registered_by` (admin), `reason` |
| `fuel_vouchers` | El **vale** | `id`, `company_id`, `member_id` (chofer), `vehicle_mode` ('company' / 'personal'), `vehicle_id` (si company), `amount` (emitido), `remaining`, `fuel_type` (NULL = libre), `multi_load` (bool), `expires_at`, `status` ('active' / 'exhausted' / 'expired' / 'void'), `issued_by`, `reason`, `created_at`, `voided_at` |
| `voucher_loads` | Cada carga (canje) contra un vale | `id`, `voucher_id`, `redemption_id`, `amount`, `fuel_type`, `station_id`, `price_used`, `gallons` (calculados), `purchase_id` (fila de `purchases` que abre el modal y alimenta la telemetría), `vehicle_id`, `km_reading`, `status` ('pending' / 'consumed' / 'cancelled' / 'expired'), `delivered_at`, `delivered_by` (operador o colaborador PROPER) |
| `company_audit_log` | Auditoría de la flota | `company_id`, `actor_kind`, `actor_id`, `action`, `entity`, `entity_id`, `reason`, `old_value`, `new_value`, `created_at` |
| `company_invoices` | Cortes de facturación por consumo | `company_id`, `period_start`, `period_end`, `totals jsonb` (por combustible: galones y Q), `invoice_no`, `status` |

### 2.2 Cambios en tablas existentes

- `vehicles` + `company_id uuid NULL`: vehículos DE LA EMPRESA (`member_id NULL`). El espejo jsonb de `members` no cambia.
- `redemptions` + `voucher_load_id uuid NULL`, `fuel_type`, `fuel_amount`: un canje de combustible (de vale o de premio normal). Para PROPER y el operador es un canje más.
- `purchases` + `source` ('sale' / 'voucher' / 'reward'), `voucher_load_id`, `company_id`: la fila que representa la carga por canje (`points_earned` 0 para el socio; la empresa recibe los puntos en `companies.points`). Excluida del recorrido de galones del socio (B8).
- `rewards` + `fuel_amount numeric NULL`: quetzales de combustible que entrega un premio de la categoría combustible (**pendiente**, junto con la definición de premios). + `company_only bool`, `company_id uuid NULL` para el catálogo corporativo (**pendiente**).

### 2.3 Invariantes que garantizan el saldo

1. `saldo(empresa) = SUM(company_ledger.amount)`; el RPC de consulta lo calcula, nunca se guarda aparte. `balance_after` es solo lectura y se verifica en un job nocturno.
2. Emitir un vale escribe `voucher_issue` por −monto en la misma transacción que la fila del vale. Si el saldo más el límite de crédito no alcanza, se rechaza.
3. Entregar una carga escribe `voucher_consume` por −monto del canje, completo (B7), en la misma transacción que marca el canje entregado, crea la fila de `purchases` y suma los puntos a la empresa.
4. Vencer o anular un vale, o cancelar una carga pendiente, escribe `voucher_return` por lo no consumido al saldo.
5. Todo movimiento lleva `ref_type/ref_id`; el estado de cuenta se reconstruye desde el libro.

---

## 3. Roles, sesiones y seguridad

- **Rol `flota`** (`?rol=flota`): `authenticate_company_user` (bcrypt, `company_sessions`), `validate_session_token(…, 'flota', …)` extendido con el rol nuevo. Sesión de 12 h como operador.
- **Admin de Puntos Plus**: alta de empresas, encargados, estaciones permitidas, facturación, auditoría, confirmación del chofer, depósitos, métricas, catálogo corporativo (pendiente). RPCs `admin_*_company*` con sesión STRICT y `log_admin_action`.
- **Socio**: RPCs con sesión de miembro para "Mi flota": `list_my_vouchers`, `use_my_voucher` (elige combustible y monto; genera el o los canjes), `list_my_fleet_loads`.
- **API de PROPER**: sin cambios de contrato. Los RPCs internos `api_list_pending_redemptions` y `api_redemption_confirm` reconocen los canjes de combustible (ver §5).

---

## 4. Vistas

### 4.1 Rol `flota` (nueva, misma PWA)
Shell tipo admin (menú lateral en escritorio, cajón en celular). Pantallas:
1. **Inicio**: saldo disponible, comprometido en vales activos, consumido esta semana, semanas de cobertura, últimos movimientos.
2. **Vales**: lista con filtros; crear (chofer, monto, vigencia, una o varias cargas, vehículo de empresa o personal, combustible fijo o libre); anular con devolución.
3. **Colaboradores**: afiliar socios (por teléfono o código de tarjeta; el socio acepta desde su app), quitar afiliación.
4. **Vehículos de la empresa**: alta y edición (misma ficha de la app); telemetría reutilizando `VehicleFuel`/`VehicleCharts`.
5. **Consumos**: cargas con fecha, chofer, vehículo, estación, combustible, galones, Q, odómetro; exportar CSV; km/gal por vehículo y por chofer; cargas anómalas.
6. **Estado de cuenta**: libro mayor, depósitos, cortes de facturación.
7. **Premios** (pendiente): fondo de puntos, catálogo corporativo, asignar a colaboradores.
8. **Ajustes**: encargados (manager), auditoría básica/estricta, exigir confirmación del chofer.

### 4.2 Admin de Puntos Plus (ampliación)
Grupo **Business**: Empresas, Depósitos (con comprobante), Métricas, Cortes de facturación, Catálogo corporativo (pendiente).

### 4.3 App del socio (ampliación)
Si está afiliado: cuadro **Mi flota** en el inicio → ventana con vales activos (usar completo o parcial, elegir combustible si es libre), sus canjes pendientes con QR, historial de cargas de flota, premios asignados (pendiente). El QR del canje, la confirmación Realtime y el modal de calificación se reutilizan tal cual.

### 4.4 Operador (sin PROPER)
`OpRedeem` escanea el QR del canje, muestra monto, combustible, galones estimados y nombre del chofer, pide confirmación (o no), entrega e imprime; el operador despacha ese monto.

---

## 5. Flujo del vale (compatible con la API actual de PROPER)

### 5.1 Emisión
El encargado crea el vale → `company_issue_voucher` valida saldo + crédito, chofer afiliado, vigencia; inserta `fuel_vouchers`, escribe `voucher_issue` en el libro y notifica al chofer por push. Si el vale es de una carga y combustible fijo, el canje (con QR) se crea en ese momento.

### 5.2 Antes de la pista, en la app del chofer
En "Mi flota" el chofer abre el vale:
- Elige el **combustible** si el vale lo dejó libre.
- **Una carga**: `use_my_voucher` crea `voucher_loads` (pending) y un canje en `redemptions` (`points_spent = 0`, `fuel_type`, `fuel_amount`, `redemption_code` único, nombre visible "Vale de combustible Q300 · Súper · Transportes X").
- **Varias cargas** (B5): indica cuánto usa ahora (Q200) → DOS canjes: Q200 (carga de ahora) y Q100 (resto), ambos con la vigencia del vale; el vale queda con `remaining` 0 en reserva y su historial muestra los dos. El de Q100 se puede volver a partir después.

### 5.3 En la estación
1. El chofer muestra el **QR del canje**. El operador lo escanea en nuestra app, o el POS de PROPER lo lee y llama `POST /v1/redemptions {code, action: 'request'}` (el POS también puede listar pendientes por tarjeta con `GET /v1/redemptions?card_code=`).
2. **Confirmación**: si la empresa no la exige, `api_redemption_confirm` marca el canje `confirmed` de inmediato; si la exige, el chofer confirma en su celular (modal Realtime actual).
3. **Entrega** (`action: 'deliver'`, o el botón Entregar del operador) — una sola transacción:
   - valida vale vigente, canje no entregado y **estación permitida** (nuestra app: la del operador; PROPER: la estación del colaborador que entrega, `operators.station_id`);
   - `price_used = fuel_price_for(estación, combustible)`, `gallons = round(monto / price_used, 2)`;
   - marca el canje entregado y la carga `consumed`; escribe `voucher_consume` por el monto completo; suma los puntos de esa carga a `companies.points` (misma conversión por tier que el programa, con el tier de la empresa si existe, o el divisor ORO);
   - inserta la fila en `purchases` (`source = 'voucher'`, `points_earned = 0`, galones calculados, estación, operador, `company_id`, `voucher_load_id`) → el Realtime existente abre el **modal de calificación** en el celular del chofer con el selector de vehículo (de empresa: el del vale; personal: el principal, cambiable) y el odómetro; la telemetría del vehículo se alimenta como con cualquier carga;
   - devuelve el **comprobante** (monto, combustible, galones estimados, chofer, empresa) que el POS o el operador imprimen.
4. El operador **despacha exactamente el monto del canje** (B7).

### 5.4 Canjes de combustible de la app normal (premios "tanque lleno", etc.)
Mismo camino: el premio lleva `fuel_amount` (pendiente de definir el catálogo); al entregarlo se calculan galones con nuestro precio, se inserta la fila de `purchases` con `source = 'reward'` y `points_earned = 0`, se abre el modal de calificación para atribuir el vehículo, y **no** avanza el recorrido de galones del socio.

### 5.5 Red de seguridad (B16)
Si el POS envía además `POST /v1/purchases` por esa carga, `api_register_purchase` detecta una carga `consumed` del mismo socio en los últimos 15 minutos sin compra ligada: registra la factura solo como referencia (`purchases.voucher_load_id`), sin puntos al socio ni movimiento en el libro.

### 5.6 Vencimiento y anulación
Job diario (cron de Vercel, 09:15 GT): vales `active` vencidos → `expired`, canjes pendientes cancelados, `voucher_return` al saldo, push al chofer y aviso al encargado. Anulación manual: mismo efecto, con motivo si la auditoría es estricta.

---

## 6. Facturación (B12)

- **Al depósito**: el admin registra el depósito con `invoice_no`; ningún documento por consumo.
- **Por consumo**: job diario 06:00 GT agrupa las cargas `consumed` del día anterior por empresa y combustible (galones y Q) → `company_invoices`; el admin emite la factura en su sistema y anota el número.

---

## 7. Métricas para Puntos Plus (B17)

RPC `admin_company_metrics`: saldo, comprometido, consumo promedio semanal (4 semanas), semanas de cobertura, depósitos del mes, vales vencidos con devolución. Alerta configurable: saldo > N × consumo semanal (default 4).

---

## 8. Pendientes antes de arrancar (del dueño)

1. **Premios**: catálogo corporativo, premios asignables a colaboradores y valor en quetzales de los premios de combustible del catálogo normal (B18).
2. **Nivel de la empresa**: ¿misma escala ORO/PLATINO/BLACK por galones de flota, o solo fondo de puntos y catálogo? Propuesta inicial: fondo de puntos, sin niveles.
3. Otros detalles que el dueño quiera tener presentes antes de construir.

---

## 9. Etapas y estimación

| Etapa | Alcance | Horas |
|---|---|---|
| B-E1 | Modelo de datos + libro mayor + rol `flota` (auth, sesiones, RLS) + admin: empresas, encargados, estaciones, depósitos | 30-40 |
| B-E2 | Vales: emisión, "Mi flota" en la app (usar completo/parcial, combustible), entrega = consumo en `api_redemption_confirm` y `deliver_redemption` (precio, galones, libro, puntos a la empresa, fila de `purchases`, modal de calificación), comprobante | 35-45 |
| B-E3 | Canjes de combustible de la app normal (`fuel_amount`, entrega con modal, sin puntos ni galones de nivel) + red de seguridad en `api_register_purchase` + exclusión de galones de nivel | 12-18 |
| B-E4 | Vista de flota completa: inicio, vales, colaboradores, vehículos, consumos y reportes, estado de cuenta, ajustes; auditoría básica/estricta | 45-60 |
| B-E5 | Vencimientos (cron), facturación al depósito / por consumo, métricas y alertas del admin | 20-28 |
| B-E6 | Premios corporativos y asignación a colaboradores (cuando se definan) | 15-22 |
| B-E7 | Piloto con 1 empresa, ajustes, manual del encargado | 15-25 |
| **Total** | | **170-240 hs** |

Orden: E1 → E2 (con esto ya se pilotea con el operador manual y con PROPER) →
E3 → E4 → E5 → E6 → E7. El crédito queda preparado desde E1 (`credit_limit`,
saldo negativo hasta el límite, bloqueo de emisión con corte vencido) sin UI
de cobranza.

---

## Changelog del documento
- **v0.2 (4-sep-2026, tarde):** el flujo pasa a "la entrega del canje es el consumo" (se descuenta el monto completo al confirmar; el operador despacha ese monto; galones con precio de Puntos Plus; modal de calificación al entregar; sin galones de nivel para el socio; puntos a la empresa). Se retira la liga de la factura del POS por ventana de tiempo, que queda solo como red de seguridad. Combustible libre elegido por el chofer antes del escaneo. Premios pendientes de definición; documento en pausa.
- **v0.1 (4-sep-2026):** primera propuesta.
