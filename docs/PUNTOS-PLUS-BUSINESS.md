# Puntos Plus Business — Diseño técnico (F8)
## Versión 0.3 · 5 de septiembre de 2026 · estado: DISEÑO ACORDADO, EN PAUSA hasta definir el catálogo de premios y los niveles de empresa

> Programa de flotas de Puntos Plus. Recoge las decisiones tomadas con el
> dueño el 4-sep-2026 (dos rondas) y el 5-sep-2026 (nueve ajustes, B19-B27)
> y el diseño técnico sobre la base actual.
> **Restricción rectora:** la API pública de PROPER (`docs/API-PROPER.md`)
> NO cambia; todo lo nuevo vive en nuestros RPCs, tablas y vistas.
> **Nada de esto está construido.** Se retoma cuando el dueño defina el
> catálogo de premios (corporativos y de combustible), los niveles de
> empresa y los detalles de §8.

---

## 1. Decisiones de producto

### 1.1 Acordadas el 4-sep-2026 (con las precisiones del 5-sep)

| # | Decisión |
|---|---|
| B1 | Modelo **prepago**: la empresa paga a gerencia (efectivo, depósito o transferencia), envía el comprobante por WhatsApp u otro medio, gerencia verifica y un admin de Puntos Plus registra el saldo con fecha, banco, monto y referencia. Depósitos acumulativos. **Crédito** solo preparado: límite por empresa, cero por defecto. |
| B2 | **Libro mayor por empresa**: el saldo es la suma de movimientos; nunca una columna editable. Desde v0.3 hay DOS libros separados: el de **dinero** (`company_ledger`) y el de **puntos** (`company_points_ledger`); el combustible entregado por premios NO pasa por el libro de dinero (B20). |
| B3 | El **vale** es la pieza central y se comporta como un canje de la app: código único + QR propio, escaneo por operador o POS, confirmación y entrega atómicas. Monto en quetzales, chofer, vigencia configurable por la empresa, vehículo de empresa o del colaborador, combustible fijo o libre. |
| B4 | Los **choferes son socios** de Puntos Plus, afiliados a la empresa. En su app aparece el apartado "Mi flota". |
| B5 | Vale de **una sola carga** por defecto. Si la empresa lo permite en varias cargas, al usar una parte la app genera **dos canjes**: el que se consume ahora y otro por el resto, ambos con la misma fecha de vencimiento. Partir un vale NO mueve el libro de dinero (ya se cobró al emitir, B27). |
| B6 | Lo **no consumido de un vale al vencer** regresa al saldo de la empresa. Precisado en B21: solo vencen los vales emitidos con saldo; los canjes y premios obtenidos con puntos NO vencen. |
| B7 | **La entrega del canje ES el consumo** en cuanto a combustible: al entregarse se calculan los galones, se registra la carga en `purchases` y en la telemetría del vehículo, y el operador despacha exactamente ese monto. No hay ajuste posterior por el monto despachado. El **dinero** se descuenta UNA sola vez, al emitir el vale (B27). |
| B8 | Los **galones** de cada carga se calculan con el precio registrado en Puntos Plus (global o por estación, D4) para el combustible del canje. Se registran en el vehículo (telemetría) pero **NO avanzan el recorrido de galones del nivel del socio**: no es combustible pagado con su dinero. Igual para los canjes de combustible de la app normal. |
| B9 | Los **puntos** de las cargas de flota van al **fondo de la empresa**; el chofer no recibe puntos. Se calculan por **galones** con una conversión propia de Business (B19), no por quetzales. Los canjes de combustible (de la app normal o corporativos) no acreditan puntos a nadie. |
| B10 | Al entregar cualquier canje de combustible (flota o normal) se abre en el celular del socio el **modal de calificación** con selector de vehículo y odómetro, para atribuir la carga a un vehículo. |
| B11 | **Restricción de estaciones** por empresa, configurada por el admin de Puntos Plus (una, varias o las tres). Combustible por vale: fijo o libre; si es libre, el chofer lo elige en la app antes de que lo escaneen. |
| B12 | **Facturación** configurable por empresa desde el admin: "al depósito" (una factura por depósito, ningún documento por consumo) o "por consumo" (corte consolidado por tipo de combustible, al final del día o a la hora acordada con la empresa, B26). Ambas modalidades llevan control de lo facturado y lo pendiente (B22). |
| B13 | **Encargados de flota**: varios por empresa, permisos "gestiona" o "consulta". Auditoría por empresa: básica (quién y cuándo) o estricta (motivo obligatorio). |
| B14 | Vista del encargado = **rol nuevo `flota`** en la misma PWA, junto a operador y admin, con usuario y contraseña propios, ajena a la cuenta personal del encargado; funciona en computadora y celular. |
| B15 | **Confirmación del chofer** al entregar: en su celular o automática ("con el sistema"), según configuración de la empresa; automática por defecto. |
| B16 | **Red de seguridad**: si el POS de PROPER llegara a enviar también la venta del vale como compra por la API, el servidor la reconoce (mismo chofer, carga entregada en los últimos 15 min) y no acredita puntos ni descuenta nada dos veces. |
| B17 | Métricas para el admin de Puntos Plus: saldo vs consumo habitual, semanas de cobertura, alerta de saldo excesivo; desde v0.3 también depositado / consumido / facturado / por facturar (B22). |
| B18 | **Premios**: catálogo corporativo (para la empresa) y asignables a colaboradores. El MECANISMO queda definido en B25; el CONTENIDO del catálogo (premios, valores en quetzales) sigue **PENDIENTE de definir** por el dueño; no se construye nada de premios hasta entonces. |

### 1.2 Ajustes del 5-sep-2026

| # | Decisión |
|---|---|
| B19 | **Puntos por GALONES, no por quetzales.** Cada carga de flota acredita puntos a la empresa según los galones entregados, con una conversión **propia de Business** editable en Admin → Configuración → Business (`program_config.business_points`, RPC `set_business_points_config`). Es INDEPENDIENTE del mecanismo por tier del programa normal (`program_config.tiers → qPerPt`): cambiar una no toca la otra. |
| B20 | **Premios de combustible por fidelidad** (los que nacen de canjear puntos, no del dinero depositado por la empresa) se **facturan a Consumidor Final** por defecto; si la empresa lo solicita, se facturan al **NIT de la empresa** (`companies.reward_invoice_mode`). Se lleva **control separado**: por un lado el efectivo depositado y el combustible de los vales que lo consumen; por otro el combustible despachado por canjes o premios. En la facturación por consumo la empresa elige si el corte incluye **todo** (vales + premios) o **solo el combustible que no es premio** (`companies.consumption_invoice_scope`). |
| B21 | **Un premio o canje de combustible obtenido con puntos NO vence.** Su QR permanece en la app del socio (canje normal) o en el apartado de canjes de la flota (premio corporativo asignado) hasta que se entregue. Solo los **vales emitidos con saldo** tienen vigencia; al vencer, lo no consumido vuelve al saldo de la empresa (B6). |
| B22 | **Control de facturación.** Al depósito: cada depósito registra si ya fue facturado en su totalidad (número, fecha, monto). Por consumo: cada corte facturado se registra, y la empresa y el admin ven el **porcentaje facturado del saldo depositado** y **lo que falta por facturar** (consumido en vales aún sin factura). |
| B23 | **Niveles (tiers) para empresas: PENDIENTE.** Se evaluará qué es lo más conveniente y atractivo para las empresas. El diseño deja el espacio (`companies.tier`, conversión de B19 por nivel a futuro) sin construir nada. |
| B24 | **La app normal de Puntos Plus es SOLO para personas particulares.** Una empresa con NIT propio que quiera los beneficios debe entrar por Puntos Plus Business. Se refuerza en Términos y con reglas técnicas: el NIT de una empresa afiliada no puede quedar en una cuenta personal y una factura a NIT de empresa no acredita puntos a un socio particular (§3.1). |
| B25 | **Catálogo de premios corporativos** que el encargado puede **asignar a colaboradores específicos**. Incluye **convertir puntos de la empresa en combustible**: ese combustible NO forma parte del saldo de dinero (no toca `company_ledger`), pero sí se asigna a un colaborador para su consumo, como un canje sin vencimiento en su "Mi flota". |
| B26 | **Corte diario** (facturación por consumo): consolidado por tipo de combustible, **no solo del día anterior**; el corte se hace al **final del día** o a la **hora acordada con la empresa** (`companies.billing_cutoff_time`), y el admin puede hacer un corte manual en cualquier momento. Cada corte cubre desde el corte anterior hasta ese instante. |
| B27 | **Cobro ÚNICO al saldo: al EMITIR el vale.** Se descarta cobrar también al confirmar en pista (el diseño v0.2 escribía −monto en ambos momentos: ese era el doble cobro). Al emitir se descuenta el monto completo del vale (reserva); la entrega en pista NO toca el dinero, solo registra combustible y puntos; al vencer o anular se devuelve lo no consumido. Es la opción más eficiente: una sola validación de saldo (al emitir, con el encargado presente), entrega rápida y sin riesgo de que un vale ya en manos del chofer falle por falta de saldo. |

---

## 2. Modelo de datos (tablas nuevas y cambios)

Todas las tablas nuevas CERRADAS a la API anónima (patrón SEC.C): lectura y
escritura solo por RPCs con sesión (`flota`, `admin`, `member`) o service role.

### 2.1 Nuevas

| Tabla | Para qué | Columnas clave |
|---|---|---|
| `companies` | La empresa cliente | `id`, `name`, `nit` (UNIQUE, B24), `contact_name`, `contact_phone`, `active`, `station_ids uuid[]` (NULL = todas), `billing_mode` ('deposit' / 'consumption'), `billing_cutoff_time time` (NULL = fin del día, B26), `consumption_invoice_scope` ('vouchers' default / 'all', B20), `reward_invoice_mode` ('cf' default / 'company_nit', B20), `audit_mode` ('basic' / 'strict'), `driver_confirm` (bool, default false), `credit_limit numeric` (default 0), `tier text NULL` (reservado, B23), `gal_carry numeric` (fracción de galón pendiente de convertir en punto, B19), `created_at` |
| `company_users` | Encargados de flota (login propio) | `id`, `company_id`, `name`, `username`, `password_hash` (bcrypt server-side como `operators`), `role` ('manager' / 'viewer'), `active` |
| `company_sessions` | Sesiones del rol `flota` | igual que `operator_sessions` (token, expira, revocación) |
| `company_members` | Afiliación chofer ↔ empresa | `company_id`, `member_id`, `label` (puesto), `active`, `added_by`, `added_at`; un socio en una sola empresa activa |
| `company_ledger` | **Libro mayor de DINERO** | `id`, `company_id`, `kind` ('deposit' + / 'voucher_issue' − / 'voucher_return' + / 'adjustment' ±), `amount`, `balance_after`, `ref_type`, `ref_id`, `note`, `created_by_kind` ('admin' / 'company' / 'system'), `created_by`, `created_at`. **No existe movimiento de consumo** (B27): el consumo se lee de `fuel_loads`. |
| `company_points_ledger` | **Libro mayor de PUNTOS** (B19, B25) | `id`, `company_id`, `kind` ('earn' + / 'redeem' − / 'adjustment' ±), `points`, `gallons` (los que generaron el earn), `balance_after`, `ref_type`, `ref_id`, `created_by_kind`, `created_by`, `created_at` |
| `company_deposits` | Detalle del depósito | `id`, `company_id`, `amount`, `method` ('cash' / 'transfer' / 'deposit'), `bank`, `reference`, `deposited_on`, `receipt_url` (bucket privado), `registered_by` (admin), `reason`, **control de factura (B22):** `invoice_status` ('pending' / 'invoiced'), `invoice_no`, `invoiced_amount`, `invoiced_at`, `invoiced_by` |
| `fuel_vouchers` | El **vale** | `id`, `company_id`, `member_id` (chofer), `vehicle_mode` ('company' / 'personal'), `vehicle_id` (si company), `amount` (emitido y cobrado al saldo), `remaining` (sin partir en canjes), `fuel_type` (NULL = libre), `multi_load` (bool), `expires_at`, `status` ('active' / 'exhausted' / 'expired' / 'void'), `issued_by`, `reason`, `created_at`, `voided_at` |
| `fuel_loads` (antes `voucher_loads`) | Cada **carga de combustible por canje**, venga de un vale o de un premio | `id`, `company_id NULL`, `source` ('voucher' / 'company_reward' / 'member_reward'), `voucher_id NULL`, `grant_id NULL` (premio corporativo), `redemption_id`, `member_id`, `amount`, `fuel_type`, `station_id`, `price_used`, `gallons` (calculados), `purchase_id` (fila de `purchases` que abre el modal y alimenta la telemetría), `vehicle_id`, `km_reading`, `status` ('pending' / 'consumed' / 'cancelled' / 'expired'), `invoice_target` ('prepaid' vale cubierto por el depósito / 'cf' / 'company_nit'), `invoice_id NULL` (corte que la facturó), `delivered_at`, `delivered_by` (operador o colaborador PROPER) |
| `company_reward_grants` | **Premio corporativo asignado** a un colaborador (B25) | `id`, `company_id`, `reward_id`, `member_id`, `points_spent`, `fuel_amount NULL` (si es combustible), `redemption_id NULL`, `status` ('assigned' / 'delivered' / 'void'), `assigned_by`, `assigned_at`, `reason` |
| `company_audit_log` | Auditoría de la flota | `company_id`, `actor_kind`, `actor_id`, `action`, `entity`, `entity_id`, `reason`, `old_value`, `new_value`, `created_at` |
| `company_invoices` | **Facturas registradas** (B22, B26) | `id`, `company_id`, `kind` ('deposit' / 'consumption'), `deposit_id NULL`, `period_start`, `period_end` (= instante del corte), `scope` ('vouchers' / 'all'), `totals jsonb` (por combustible y por origen: vales / premios → galones y Q), `amount`, `invoice_no`, `status` ('draft' / 'issued' / 'void'), `issued_at`, `issued_by` |

### 2.2 Cambios en tablas existentes

- `vehicles` + `company_id uuid NULL`: vehículos DE LA EMPRESA (`member_id NULL`). El espejo jsonb de `members` no cambia.
- `redemptions` + `fuel_load_id uuid NULL`, `fuel_type`, `fuel_amount`: un canje de combustible (de vale, de premio normal o de premio corporativo). Para PROPER y el operador es un canje más. `expires_at` solo se estampa en los canjes que nacen de un vale (B21); los de premio quedan NULL = no vence, como hoy.
- `purchases` + `source` ('sale' / 'voucher' / 'company_reward' / 'member_reward'), `fuel_load_id`, `company_id`: la fila que representa la carga por canje (`points_earned` 0 para el socio). Excluida del recorrido de galones del socio (B8).
- `rewards` + `fuel_amount numeric NULL`: quetzales de combustible que entrega un premio de la categoría combustible. + `company_only bool`, `company_id uuid NULL` (NULL = catálogo corporativo común) para el catálogo corporativo. El CONTENIDO del catálogo sigue pendiente (B18).
- `members`: sin columnas nuevas. Regla B24 sobre `nit` en RPCs (§3.1).
- `program_config` + clave `business_points` (B19): `{ "gal_per_pt": 1 }` = galones que generan un punto para la empresa (con decimales; ej. 2.5). RPC `set_business_points_config` (sesión admin STRICT, auditada). La fracción de galón sobrante se arrastra en `companies.gal_carry`, así ninguna carga pierde galones al redondear.

### 2.3 Invariantes que garantizan el saldo (sin doble cobro, B27)

1. `saldo(empresa) = SUM(company_ledger.amount)`; el RPC de consulta lo calcula, nunca se guarda aparte. `balance_after` es solo lectura y se verifica en un job nocturno.
2. **Emitir un vale** escribe `voucher_issue` por −monto en la misma transacción que la fila del vale. Si el saldo más el límite de crédito no alcanza, se rechaza. Es el ÚNICO momento en que un vale resta dinero.
3. **Partir** un vale en canjes (B5) y **entregar** una carga NO escriben en `company_ledger`. La entrega marca la carga `consumed`, calcula galones y escribe `earn` en `company_points_ledger`.
4. **Vencer o anular** un vale, o cancelar una carga pendiente de vale, escribe `voucher_return` por lo no consumido (+). Nunca puede devolverse más de lo emitido menos lo consumido.
5. Los **premios** (corporativos o de la app normal) no tocan `company_ledger`: los corporativos restan `redeem` en `company_points_ledger`; los de la app normal restan puntos del socio como hoy.
6. Todo movimiento lleva `ref_type/ref_id`; el estado de cuenta se reconstruye desde los dos libros y `fuel_loads`.
7. Cifras del estado de cuenta: **disponible** = SUM(libro de dinero) · **comprometido** = SUM(`remaining` + canjes de vale pendientes) de vales `active` (ya restado del disponible; informativo) · **consumido** = SUM(`fuel_loads.amount` con `source = 'voucher'` y `status = 'consumed'`) · **por facturar** = consumido − SUM(cortes `issued`, parte de vales).

---

## 3. Roles, sesiones y seguridad

- **Rol `flota`** (`?rol=flota`): `authenticate_company_user` (bcrypt, `company_sessions`), `validate_session_token(…, 'flota', …)` extendido con el rol nuevo. Sesión de 12 h como operador.
- **Admin de Puntos Plus**: alta de empresas, encargados, estaciones permitidas, facturación (modo, hora de corte, alcance, destino de premios), auditoría, confirmación del chofer, depósitos y su facturación, cortes, métricas, conversión de puntos Business, catálogo corporativo. RPCs `admin_*_company*` con sesión STRICT y `log_admin_action`.
- **Socio**: RPCs con sesión de miembro para "Mi flota": `list_my_vouchers`, `use_my_voucher` (elige combustible y monto; genera el o los canjes), `list_my_fleet_loads`, `list_my_company_grants` (premios asignados).
- **API de PROPER**: sin cambios de contrato. Los RPCs internos `api_list_pending_redemptions` y `api_redemption_confirm` reconocen los canjes de combustible (ver §5).

### 3.1 Reglas técnicas de B24 (app normal solo para particulares)

1. `companies.nit` es UNIQUE. Al dar de alta una empresa, si algún socio tiene ese NIT, el admin lo ve en el formulario y decide: limpiar el NIT del socio (auditado) o convertirlo en chofer afiliado; la empresa no se activa con el conflicto abierto.
2. `register_member` y `update_my_profile` rechazan un NIT que pertenezca a una empresa activa (`nit_is_company`: "Este NIT pertenece a una empresa afiliada a Puntos Plus Business").
3. `api_register_purchase` (PROPER): si el NIT de la factura es de una empresa activa, la compra NO acredita puntos a ningún socio particular (`company_nit`, mismo formato de rechazo que `nit_mismatch`); PROPER ya solo recibe el rechazo, sin cambio de contrato.
4. Términos y registro: "el NIT del socio es personal; las empresas participan mediante Puntos Plus Business".

---

## 4. Vistas

### 4.1 Rol `flota` (nueva, misma PWA)
Shell tipo admin (menú lateral en escritorio, cajón en celular). Pantallas:
1. **Inicio**: saldo disponible, comprometido en vales activos, consumido esta semana, semanas de cobertura, puntos de la empresa, últimos movimientos.
2. **Vales**: lista con filtros; crear (chofer, monto, vigencia, una o varias cargas, vehículo de empresa o personal, combustible fijo o libre); anular con devolución.
3. **Colaboradores**: afiliar socios (por teléfono o código de tarjeta; el socio acepta desde su app), quitar afiliación.
4. **Vehículos de la empresa**: alta y edición (misma ficha de la app); telemetría reutilizando `VehicleFuel`/`VehicleCharts`.
5. **Consumos**: cargas con fecha, chofer, vehículo, estación, combustible, galones, Q, odómetro y origen (vale / premio); exportar CSV; km/gal por vehículo y por chofer; cargas anómalas.
6. **Estado de cuenta**: libro de dinero, depósitos con su estado de factura, cortes de facturación, porcentaje facturado y por facturar (B22); bloque aparte de combustible por premios (B20).
7. **Premios**: puntos de la empresa (libro de puntos), catálogo corporativo, asignar a colaboradores, premios asignados y su estado (B25; contenido del catálogo pendiente).
8. **Ajustes**: encargados (manager), auditoría básica/estricta, exigir confirmación del chofer.

### 4.2 Admin de Puntos Plus (ampliación)
Grupo **Business**: Empresas (con facturación: modo, hora de corte, alcance, destino de premios), Depósitos (con comprobante y registro de factura), Cortes de facturación (automáticos y "Hacer corte ahora", registro de número de factura), Métricas, Catálogo corporativo (pendiente). En Configuración: **Puntos Business** (galones por punto, B19).

### 4.3 App del socio (ampliación)
Si está afiliado: cuadro **Mi flota** en el inicio → ventana con vales activos (usar completo o parcial, elegir combustible si es libre), sus canjes pendientes con QR (de vale, con vencimiento; de premio corporativo, sin vencimiento), historial de cargas de flota, premios asignados. El QR del canje, la confirmación Realtime y el modal de calificación se reutilizan tal cual.

### 4.4 Operador (sin PROPER)
`OpRedeem` escanea el QR del canje, muestra monto, combustible, galones estimados, nombre del chofer y origen (vale / premio, y a quién se factura), pide confirmación (o no), entrega e imprime; el operador despacha ese monto.

---

## 5. Flujo del vale (compatible con la API actual de PROPER)

### 5.1 Emisión (aquí se cobra, B27)
El encargado crea el vale → `company_issue_voucher` valida saldo + crédito, chofer afiliado, vigencia; inserta `fuel_vouchers`, escribe `voucher_issue` por −monto en el libro de dinero (única resta) y notifica al chofer por push. Si el vale es de una carga y combustible fijo, el canje (con QR) se crea en ese momento.

### 5.2 Antes de la pista, en la app del chofer
En "Mi flota" el chofer abre el vale:
- Elige el **combustible** si el vale lo dejó libre.
- **Una carga**: `use_my_voucher` crea `fuel_loads` (pending, `source = 'voucher'`, `invoice_target = 'prepaid'`) y un canje en `redemptions` (`points_spent = 0`, `fuel_type`, `fuel_amount`, `expires_at` = vigencia del vale, `redemption_code` único, nombre visible "Vale de combustible Q300 · Súper · Transportes X").
- **Varias cargas** (B5): indica cuánto usa ahora (Q200) → DOS canjes: Q200 (carga de ahora) y Q100 (resto), ambos con la vigencia del vale; el vale queda con `remaining` 0 en reserva y su historial muestra los dos. El de Q100 se puede volver a partir después. Sin movimiento en el libro de dinero.

### 5.3 En la estación
1. El chofer muestra el **QR del canje**. El operador lo escanea en nuestra app, o el POS de PROPER lo lee y llama `POST /v1/redemptions {code, action: 'request'}` (el POS también puede listar pendientes por tarjeta con `GET /v1/redemptions?card_code=`).
2. **Confirmación**: si la empresa no la exige, `api_redemption_confirm` marca el canje `confirmed` de inmediato; si la exige, el chofer confirma en su celular (modal Realtime actual).
3. **Entrega** (`action: 'deliver'`, o el botón Entregar del operador) — una sola transacción, SIN tocar el libro de dinero:
   - valida vale vigente, canje no entregado y **estación permitida** (nuestra app: la del operador; PROPER: la estación del colaborador que entrega, `operators.station_id`);
   - `price_used = fuel_price_for(estación, combustible)`, `gallons = round(monto / price_used, 2)`;
   - marca el canje entregado y la carga `consumed`;
   - **puntos a la empresa por galones (B19):** `galones + companies.gal_carry` → puntos enteros = `floor(total / gal_per_pt)`, el resto vuelve a `gal_carry`; escribe `earn` en `company_points_ledger` con los galones;
   - inserta la fila en `purchases` (`source = 'voucher'`, `points_earned = 0`, galones calculados, estación, operador, `company_id`, `fuel_load_id`) → el Realtime existente abre el **modal de calificación** en el celular del chofer con el selector de vehículo (de empresa: el del vale; personal: el principal, cambiable) y el odómetro; la telemetría del vehículo se alimenta como con cualquier carga;
   - devuelve el **comprobante** (monto, combustible, galones estimados, chofer, empresa, "cubierto por saldo prepagado") que el POS o el operador imprimen.
4. El operador **despacha exactamente el monto del canje** (B7).

### 5.4 Canjes de combustible de la app normal (premios "tanque lleno", etc.)
Mismo camino: el premio lleva `fuel_amount` (contenido pendiente); el canje NO vence (B21); al entregarlo se calculan galones con nuestro precio, se inserta la fila de `purchases` con `source = 'member_reward'` y `points_earned = 0`, `fuel_loads.invoice_target = 'cf'` (socio particular), se abre el modal de calificación para atribuir el vehículo, y **no** avanza el recorrido de galones del socio ni acredita puntos.

### 5.5 Red de seguridad (B16)
Si el POS envía además `POST /v1/purchases` por esa carga, `api_register_purchase` detecta una carga `consumed` del mismo socio en los últimos 15 minutos sin compra ligada: registra la factura solo como referencia (`purchases.fuel_load_id`), sin puntos al socio, sin puntos a la empresa y sin movimiento en los libros.

### 5.6 Vencimiento y anulación (solo vales, B21)
Job diario (cron de Vercel, 09:15 GT): vales `active` vencidos → `expired`, sus canjes pendientes cancelados, `voucher_return` (+) por lo no consumido al saldo, push al chofer y aviso al encargado. Anulación manual: mismo efecto, con motivo si la auditoría es estricta. Los canjes con `source` de premio nunca entran en este job.

### 5.7 Premios corporativos asignados a colaboradores (B25)
1. El encargado (manager) elige un premio del catálogo corporativo y el colaborador → `company_grant_reward` valida puntos suficientes, escribe `redeem` (−) en `company_points_ledger` y crea `company_reward_grants`.
2. Si el premio es **combustible** (`rewards.fuel_amount`): en la misma transacción se crea `fuel_loads` (`source = 'company_reward'`, `invoice_target` según `companies.reward_invoice_mode`: 'cf' o 'company_nit') y un canje en `redemptions` **sin `expires_at`**, que aparece en "Mi flota → Canjes" del colaborador con su QR. El libro de dinero no se toca.
3. En la estación sigue el mismo flujo de §5.3 (escaneo, confirmación, entrega, galones, `purchases` con `source = 'company_reward'`, modal de calificación). NO acredita puntos ni al chofer ni a la empresa.
4. Si el premio NO es combustible, el grant se entrega como cualquier canje de la app (QR, operador entrega) y queda registrado en la empresa.
5. Anular un grant pendiente devuelve los puntos a la empresa (`adjustment` + con motivo).

---

## 6. Facturación (B12, B20, B22, B26)

### 6.1 Al depósito
- Al registrar el depósito, `invoice_status = 'pending'`. Cuando gerencia emite la factura en su sistema, el admin la anota (`invoice_no`, `invoiced_amount` = monto del depósito, `invoiced_at`) → `invoice_status = 'invoiced'` y una fila `company_invoices` con `kind = 'deposit'`.
- Ningún documento por consumo de vales. Panel: depósitos pendientes de facturar y porcentaje del depositado ya facturado.

### 6.2 Por consumo
- **Corte** (B26): cron de Vercel **cada hora** (`api/business-billing-cuts`) corre el corte de las empresas cuya `billing_cutoff_time` cae en esa hora (NULL = 23:59 GT); el admin también puede "Hacer corte ahora". Cada corte toma las cargas `consumed` desde el corte anterior hasta ese instante y crea `company_invoices` (`kind = 'consumption'`, `status = 'draft'`) con `totals` por combustible y por origen (vales / premios); las cargas quedan ligadas por `invoice_id`.
- **Alcance** (B20): `scope = 'vouchers'` incluye solo las cargas de vales (el combustible prepagado); `scope = 'all'` agrega en un bloque aparte las cargas de premios (`company_reward` y, si el chofer usó un premio de la app normal estando afiliado, `member_reward`).
- Gerencia emite la factura y el admin anota `invoice_no` → `status = 'issued'`, `issued_at`.
- **Control** (B22), para admin y encargado: depositado (SUM depósitos) · consumido en vales · facturado (cortes `issued`, parte de vales) · **por facturar** = consumido − facturado · **% facturado del saldo depositado** = facturado / depositado. El combustible de premios se muestra aparte con su destino (CF / NIT de la empresa) y no cuenta contra el depósito.

### 6.3 Premios de combustible (B20)
Cada carga de premio lleva `invoice_target` ('cf' por defecto, 'company_nit' si la empresa lo pidió). Si la empresa factura al depósito o su corte es `scope = 'vouchers'`, la factura del premio se emite en pista al destino indicado (el comprobante lo muestra al operador o al POS); si su corte es `scope = 'all'`, entra en el corte en su propio bloque. En todos los casos el reporte separa dinero depositado de combustible por premios.

---

## 7. Métricas para Puntos Plus (B17, B22)

RPC `admin_company_metrics`: saldo disponible, comprometido, consumo promedio semanal (4 semanas), semanas de cobertura, depósitos del mes, depósitos pendientes de facturar, consumido / facturado / por facturar y %, vales vencidos con devolución, puntos de la empresa (ganados / canjeados), galones y Q entregados por premios. Alerta configurable: saldo > N × consumo semanal (default 4).

---

## 8. Pendientes antes de arrancar (del dueño)

1. **Premios** (B18/B25): contenido del catálogo corporativo (qué premios, cuántos puntos, valor en quetzales de los de combustible) y los premios asignables a colaboradores; valor de los premios de combustible del catálogo normal.
2. **Niveles de empresa** (B23): si habrá tiers para empresas y qué darían (¿conversión de galones por punto mejor por nivel?, ¿descuento en el catálogo corporativo?). Se evalúa lo más conveniente y atractivo.
3. **Valor inicial de `gal_per_pt`** (B19): cuántos galones generan un punto para la empresa.
4. Datos de onboarding por empresa: hora de corte (B26), alcance del corte y destino de factura de premios (B20).

---

## 9. Etapas y estimación

| Etapa | Alcance | Horas |
|---|---|---|
| B-E1 | Modelo de datos + libros de dinero y puntos + rol `flota` (auth, sesiones, RLS) + admin: empresas (facturación, hora de corte, alcance, destino de premios), encargados, estaciones, depósitos, conversión galones→punto (B19) + reglas de NIT empresarial (B24) | 34-46 |
| B-E2 | Vales: emisión con cobro único (B27), "Mi flota" en la app (usar completo/parcial, combustible), entrega en `api_redemption_confirm` y `deliver_redemption` (precio, galones, puntos por galón a la empresa, fila de `purchases`, modal de calificación), comprobante | 35-45 |
| B-E3 | Canjes de combustible de la app normal (`fuel_amount`, sin vencimiento, entrega con modal, sin puntos ni galones de nivel, destino CF) + red de seguridad en `api_register_purchase` + exclusión de galones de nivel | 12-18 |
| B-E4 | Vista de flota completa: inicio, vales, colaboradores, vehículos, consumos con origen, estado de cuenta con control de facturación, ajustes; auditoría básica/estricta | 45-60 |
| B-E5 | Vencimientos (cron), facturación: registro de factura por depósito, cortes por hora acordada + corte manual, alcance vales/todo, % facturado y por facturar, métricas y alertas del admin | 24-34 |
| B-E6 | Premios corporativos: libro de puntos en la vista de flota, catálogo corporativo, asignación a colaboradores, puntos→combustible sin vencimiento con destino CF/NIT (cuando se defina el contenido) | 18-26 |
| B-E7 | Piloto con 1 empresa, ajustes, manual del encargado | 15-25 |
| **Total** | | **183-254 hs** |

Orden: E1 → E2 (con esto ya se pilotea con el operador manual y con PROPER) →
E3 → E4 → E5 → E6 → E7. El crédito queda preparado desde E1 (`credit_limit`,
saldo negativo hasta el límite, bloqueo de emisión con corte vencido) sin UI
de cobranza.

---

## Changelog del documento
- **v0.3 (5-sep-2026):** nueve ajustes del dueño (B19-B27): puntos de la empresa por GALONES con conversión propia editable en el admin, independiente de los tiers del programa; premios de combustible facturados a CF (o al NIT de la empresa si lo pide) con control separado del dinero depositado y alcance del corte (todo / solo no-premios); los canjes y premios con puntos NO vencen (solo los vales con saldo, que devuelven lo no consumido); control de facturación por depósito y por corte (% facturado y por facturar); niveles de empresa pendientes; la app normal solo para particulares (reglas técnicas de NIT); catálogo corporativo asignable a colaboradores con puntos→combustible fuera del saldo; corte diario al final del día o a la hora acordada, con corte manual; **cobro único al saldo al EMITIR el vale** (se elimina el `voucher_consume` de v0.2, que duplicaba el cobro). `voucher_loads` pasa a `fuel_loads` con origen; nuevo `company_points_ledger` y `company_reward_grants`. Estimación 183-254 hs.
- **v0.2 (4-sep-2026, tarde):** el flujo pasa a "la entrega del canje es el consumo" (se descuenta el monto completo al confirmar; el operador despacha ese monto; galones con precio de Puntos Plus; modal de calificación al entregar; sin galones de nivel para el socio; puntos a la empresa). Se retira la liga de la factura del POS por ventana de tiempo, que queda solo como red de seguridad. Combustible libre elegido por el chofer antes del escaneo. Premios pendientes de definición; documento en pausa.
- **v0.1 (4-sep-2026):** primera propuesta.
