# Puntos Plus Business — Diseño técnico (F8)
## Versión 0.1 · 4 de septiembre de 2026 · estado: PROPUESTA para validación del dueño

> Programa de flotas de Puntos Plus. Este documento recoge las decisiones
> tomadas con el dueño el 4-sep-2026 y propone el diseño técnico sobre la
> base actual. **Restricción rectora:** la API pública de PROPER
> (`docs/API-PROPER.md`) NO cambia; todo lo nuevo vive en nuestros RPCs,
> tablas y vistas.

---

## 1. Decisiones de producto (acordadas 4-sep-2026)

| # | Decisión |
|---|---|
| B1 | Modelo **prepago**: la empresa paga a gerencia (efectivo, depósito o transferencia), envía el comprobante, y un admin de Puntos Plus registra el saldo. Los depósitos son acumulativos. **Crédito** solo queda preparado: límite por empresa, cero por defecto. |
| B2 | **Libro mayor por empresa**: el saldo es la suma de movimientos; nunca una columna editable. |
| B3 | El **vale** es la pieza central y se comporta como un canje: código único + QR, escaneo por operador o POS, confirmación y entrega atómicas. Monto en quetzales, chofer, vigencia configurable por la empresa, vehículo de empresa o del colaborador. |
| B4 | Los **choferes son socios** de Puntos Plus, afiliados a la empresa. En su app aparece un apartado "Mi flota". |
| B5 | Vale de **una sola carga** por defecto. Si la empresa lo permite en varias cargas, al usar una parte el cliente genera **dos canjes**: el que consume ahora y otro por el resto, ambos con la misma fecha de vencimiento. |
| B6 | Lo **no consumido al vencer** regresa al saldo de la empresa. |
| B7 | Los **puntos y beneficios** de las cargas van al **fondo de la empresa**; la empresa puede asignar premios a sus colaboradores. |
| B8 | **Restricción de estaciones** por empresa, configurada por el admin de Puntos Plus (una, varias o las tres). Restricción de combustible por vale: opcional, apagada por defecto. |
| B9 | **Facturación** configurable por empresa desde el admin de Puntos Plus: "al depósito" (factura al registrar el saldo) o "por consumo" (corte diario consolidado por tipo de combustible con el total del día anterior). |
| B10 | **Encargados de flota**: varios por empresa, con permisos "gestiona" o "consulta". Auditoría por empresa en dos niveles: básica (quién y cuándo) o estricta (motivo obligatorio). |
| B11 | Vista del encargado = **rol nuevo `flota`** en la misma PWA, junto a operador y admin, con usuario y contraseña propios, ajena a la cuenta personal del encargado. Debe servir en computadora y en celular. |
| B12 | **Confirmación del chofer**: automática por defecto (ver §5.3); la empresa puede exigirla. |
| B13 | Métricas para el admin de Puntos Plus: saldo vs consumo habitual, semanas de cobertura, alerta de saldo excesivo. |

---

## 2. Modelo de datos (tablas nuevas y cambios)

Todas las tablas nuevas CERRADAS a la API anónima (patrón SEC.C): lectura y
escritura solo por RPCs con sesión (`flota`, `admin`, `member`) o service role.

### 2.1 Nuevas

| Tabla | Para qué | Columnas clave |
|---|---|---|
| `companies` | La empresa cliente | `id`, `name`, `nit`, `contact_name`, `contact_phone`, `active`, `station_ids uuid[]` (NULL = todas), `billing_mode` ('deposit' / 'consumption'), `audit_mode` ('basic' / 'strict'), `driver_confirm` (bool, default false), `credit_limit numeric` (default 0), `points`, `created_at` |
| `company_users` | Encargados de flota (login propio) | `id`, `company_id`, `name`, `username`, `password_hash` (bcrypt server-side, como `operators`), `role` ('manager' / 'viewer'), `active` |
| `company_sessions` | Sesiones del rol `flota` | igual que `operator_sessions` (token, expira, revocación) |
| `company_members` | Afiliación chofer ↔ empresa | `company_id`, `member_id`, `label` (puesto), `active`, `added_by`, `added_at`; un socio puede estar en una sola empresa activa |
| `company_ledger` | **Libro mayor** | `id`, `company_id`, `kind` ('deposit' / 'voucher_issue' / 'voucher_consume' / 'voucher_return' / 'adjustment' / 'credit_note'), `amount` (+ entra / − sale), `balance_after`, `ref_type`, `ref_id` (vale, compra, depósito), `note`, `created_by_kind` ('admin' / 'company' / 'system'), `created_by`, `created_at` |
| `company_deposits` | Detalle del depósito | `id`, `company_id`, `amount`, `method` ('cash' / 'transfer' / 'deposit'), `bank`, `reference`, `deposited_on`, `receipt_url` (bucket privado), `invoice_no`, `registered_by` (admin), `reason` |
| `fuel_vouchers` | El **vale** | `id`, `company_id`, `member_id` (chofer), `vehicle_mode` ('company' / 'personal'), `vehicle_id` (si company), `amount` (emitido), `remaining`, `fuel_type` (NULL = cualquiera), `multi_load` (bool), `expires_at`, `status` ('active' / 'exhausted' / 'expired' / 'void'), `issued_by`, `reason`, `created_at`, `voided_at` |
| `voucher_loads` | Cada carga contra un vale | `id`, `voucher_id`, `redemption_id` (el canje que viajó al POS), `purchase_id` (la factura ligada), `requested_amount`, `charged_amount`, `station_id`, `fuel_type`, `gallons`, `status` ('pending' / 'delivered' / 'settled' / 'cancelled'), timestamps |
| `company_audit_log` | Auditoría de la flota | `company_id`, `actor_kind`, `actor_id`, `action`, `entity`, `entity_id`, `reason`, `old_value`, `new_value`, `created_at` (mismo formato que `admin_audit_log`) |
| `company_invoices` | Cortes de facturación | `company_id`, `mode`, `period_start`, `period_end`, `totals jsonb` (por combustible: galones y Q), `invoice_no`, `status` |

### 2.2 Cambios en tablas existentes

- `vehicles` + `company_id uuid NULL`: vehículos DE LA EMPRESA (con `member_id NULL`). El espejo jsonb de `members` no se ve afectado (solo espeja los que tienen `member_id`).
- `redemptions` + `voucher_load_id uuid NULL`: el canje que representa una carga de vale. Para PROPER y para el operador es un canje normal.
- `purchases` + `voucher_load_id uuid NULL`, `company_id uuid NULL`: la factura ligada a un vale y a la empresa.
- `rewards` + `company_only bool`, `company_id uuid NULL`: premios del catálogo corporativo (para la empresa o para asignar a colaboradores).

### 2.3 Invariantes que garantizan el saldo

1. `saldo(empresa) = SUM(company_ledger.amount)`; el RPC de consulta lo calcula, nunca se guarda aparte. `balance_after` es solo lectura de conveniencia y se verifica en un job nocturno.
2. Emitir un vale escribe `voucher_issue` por −monto en la misma transacción que la fila del vale. Si el saldo (más el límite de crédito) no alcanza, se rechaza.
3. Ligar una factura escribe `voucher_consume` por −cargado y, si la factura fue menor que lo solicitado, `voucher_return` por la diferencia al vale (no al saldo, mientras el vale esté vigente).
4. Vencer o anular un vale escribe `voucher_return` por `remaining` al saldo.
5. Todo movimiento lleva `ref_type/ref_id`; el estado de cuenta se reconstruye desde el libro.

---

## 3. Roles, sesiones y seguridad

- **Rol `flota`** (`?rol=flota`): `authenticate_company_user` (bcrypt, `company_sessions`), `validate_session_token(…, 'flota', …)` extendido con el rol nuevo. Sesión de 12 h como operador.
- **Admin de Puntos Plus**: alta de empresas, encargados, estaciones permitidas, modo de facturación, modo de auditoría, registro de depósitos, métricas, catálogo corporativo. Todo por RPCs `admin_*_company*` con sesión STRICT y `log_admin_action`.
- **Socio**: RPCs con sesión de miembro para su apartado "Mi flota": `list_my_vouchers`, `use_my_voucher` (genera la carga/canje), `list_my_fleet_loads`.
- **API de PROPER**: sin cambios de contrato. Los RPCs internos que la sirven (`api_list_pending_redemptions`, `api_redemption_confirm`, `api_register_purchase`) aprenden a reconocer canjes de vale (ver §5).

---

## 4. Vistas

### 4.1 Rol `flota` (nueva, misma PWA)
Shell tipo admin (menú lateral en escritorio, cajón en celular), paleta propia
neutra. Pantallas:

1. **Inicio**: saldo disponible, comprometido en vales activos, consumido esta semana, semanas de cobertura, últimos movimientos.
2. **Vales**: lista con filtros (activo, agotado, vencido, anulado, por chofer, por vehículo); crear vale (chofer, monto, vigencia, una o varias cargas, vehículo de empresa o personal, combustible opcional); anular con devolución.
3. **Colaboradores**: afiliar socios (búsqueda por teléfono o código de tarjeta, el socio acepta desde su app), quitar afiliación.
4. **Vehículos de la empresa**: alta y edición (misma ficha de la app: placa, tipo, marca, modelo, tanque, combustible habitual); telemetría por vehículo reutilizando `VehicleFuel`/`VehicleCharts`.
5. **Consumos**: cargas con fecha, chofer, vehículo, estación, combustible, galones, Q, odómetro; exportar CSV; reportes km/gal por vehículo y por chofer, cargas anómalas (más que el tanque, dos cargas muy seguidas).
6. **Estado de cuenta**: libro mayor, depósitos, cortes de facturación.
7. **Premios**: fondo de puntos de la empresa, catálogo corporativo, asignar premio a un colaborador.
8. **Ajustes**: encargados (si es manager), nivel de auditoría, exigir confirmación del chofer.

### 4.2 Admin de Puntos Plus (ampliación)
Grupo nuevo **Business**: Empresas (ficha, estaciones permitidas, facturación, auditoría, crédito), Depósitos (registro con comprobante), Métricas (saldo vs consumo, cobertura, alertas), Catálogo corporativo, Cortes de facturación.

### 4.3 App del socio (ampliación)
Si el socio está afiliado: cuadro **Mi flota** en el inicio (empresa, vales activos con saldo) → ventana con: vales (usar completo o parcial), historial de cargas de flota, premios asignados por la empresa. La confirmación de canje y el modal de calificación con selector de vehículo y odómetro se reutilizan tal cual.

### 4.4 Operador (sin PROPER)
`OpRedeem` ya lista y entrega canjes; un canje de vale muestra además el monto autorizado y el chofer. La compra se registra como hoy y se liga sola (§5).

---

## 5. Flujo del vale (compatible con la API actual de PROPER)

### 5.1 Emisión
Encargado crea el vale → `company_issue_voucher` valida saldo + crédito, estaciones, vigencia, chofer afiliado; inserta `fuel_vouchers`, escribe el ledger y notifica al chofer por push ("Tienes un vale de Q300 de Transportes X, vence el 11-sep").

### 5.2 Uso por el chofer
En "Mi flota" el chofer toca el vale:
- **Una carga**: `use_my_voucher(vale)` crea `voucher_loads` (pending) y un canje en `redemptions` con `points_spent = 0`, `redemption_code` único, `voucher_load_id`, y nombre visible "Vale de combustible Q300 · Transportes X". El vale pasa a `remaining = 0` en reserva.
- **Varias cargas** (B5): el chofer indica cuánto usa ahora (Q200). El RPC crea DOS canjes: uno por Q200 (la carga de ahora) y otro por Q100 (el resto), ambos con la vigencia del vale. El vale queda en 0 en reserva y su historial muestra los dos canjes. Si más tarde vuelve a partir el de Q100, se repite la operación.

### 5.3 En la estación (POS de PROPER, contrato actual)
1. El POS escanea el QR del socio y llama `GET /v1/redemptions?card_code=…` → nuestro `api_list_pending_redemptions` devuelve el canje del vale como uno más.
2. El POS llama `POST /v1/redemptions {action: 'request'}` → `api_redemption_confirm`: si el canje es de vale y la empresa NO exige confirmación, el RPC lo marca `confirmed` de inmediato; si la exige, el chofer confirma en su celular como hoy (modal Realtime).
3. El POS llama `{action: 'deliver'}` → el RPC exige `confirmed`, valida que el vale siga vigente y marca `voucher_loads.delivered` con la hora y el operador. El comprobante que devuelve la API dice "Vale de combustible · Q300 · chofer · empresa". Si la estación del POS no está permitida para la empresa (la estación se conoce por el cliente de API y, de forma definitiva, en la factura), se rechaza con `voucher_station_not_allowed`.
4. El POS registra la venta como siempre: `POST /v1/purchases` con galones reales, NIT y monto. Nuestro `api_register_purchase` busca un `voucher_loads.delivered` del mismo socio en los últimos 15 minutos sin factura ligada:
   - Liga la compra (`purchases.voucher_load_id/company_id`), marca la carga `settled`, escribe `voucher_consume` por el monto real y `voucher_return` por la diferencia si la factura fue menor.
   - Dirige los puntos al fondo de la empresa (`companies.points`) y no al chofer (B7). El chofer conserva galones para su nivel personal solo si el vale es de vehículo personal (decisión del dueño pendiente, ver §8).
   - Asigna el vehículo: de empresa (el del vale) o personal (el principal del chofer, cambiable en el modal de calificación).
   - Valida NIT: el vale impone el NIT de la empresa; si la factura viene con otro NIT, se registra la compra pero se marca `nit_mismatch` para revisión.
5. Sin factura en 15 minutos → la carga queda `delivered` sin `settled`; un job la lista para revisión del admin (posible carga no registrada en el POS) y no se descuenta del saldo hasta resolverla.

**Opción de confirmación (B12).** Recomendación: automática por defecto. El chofer ya se identificó con su QR personal, el bombero ve su nombre y foto, el vale está acotado en monto y vigencia, el chofer recibe un push al instante ("Se usó tu vale de Q300 en Turkaj II") y la empresa puede anularlo. Exigir el toque en el celular agrega el punto de falla "sin señal en pista" en una operación entre empresas. Se deja como ajuste por empresa para casos sensibles.

### 5.4 Vencimiento y anulación
Job diario (cron existente de Vercel, 09:15 GT): vales `active` con `expires_at < hoy` → `expired`, canjes pendientes asociados cancelados, `voucher_return` al saldo, push al chofer y aviso al encargado. Anulación manual: mismo efecto, con motivo si la auditoría es estricta.

---

## 6. Facturación (B9)

- **Al depósito**: el admin registra el depósito con `invoice_no`; el estado de cuenta muestra factura por depósito. Las cargas no generan factura adicional (el POS emite la venta a nombre de la empresa con NIT, o como CF según lo acordado con contabilidad).
- **Por consumo**: job diario a las 06:00 GT agrupa las cargas `settled` del día anterior por empresa y tipo de combustible (galones y Q) → `company_invoices` con `totals`; el admin ve el corte, emite la factura en su sistema y anota el número. Esto evita facturar productos erróneos cuando la flota mezcla combustibles.

---

## 7. Métricas para Puntos Plus (B13)

RPC `admin_company_metrics`: por empresa, saldo, comprometido, consumo promedio semanal (últimas 4 semanas), semanas de cobertura, depósitos del mes, vales vencidos con devolución, cargas sin factura, `nit_mismatch`. Alerta configurable: saldo > N × consumo semanal (default 4).

---

## 8. Puntos abiertos (para el dueño)

1. Cuando el vale es para **vehículo personal**, ¿el chofer acumula galones para su nivel personal? Propuesta: sí galones (es su vehículo), no puntos (van a la empresa).
2. **Nivel y beneficios de la empresa**: ¿misma escala ORO/PLATINO/BLACK por galones de flota, o solo fondo de puntos y catálogo corporativo? Propuesta inicial: fondo de puntos + catálogo, sin niveles.
3. **Reintento sin factura**: los 15 minutos de ventana y el tratamiento de cargas `delivered` sin `settled`.
4. **Premios corporativos iniciales**: combustible bonificado al fondo por volumen mensual, lavados y cambio de aceite de flota, reporte mensual, prioridad en pista; para colaboradores: vales personales, lavado, rifa, tienda.

---

## 9. Etapas y estimación

| Etapa | Alcance | Horas |
|---|---|---|
| B-E1 | Modelo de datos + libro mayor + rol `flota` (auth, sesiones, RLS) + admin: empresas, encargados, estaciones, depósitos | 30-40 |
| B-E2 | Vales: emisión, apartado "Mi flota" en la app, uso completo y parcial (dos canjes), reconocimiento en `api_list_pending_redemptions` / `api_redemption_confirm`, entrega por operador | 35-45 |
| B-E3 | Liga de la factura en `api_register_purchase` y `register_purchase`, puntos al fondo, vehículo de empresa/personal, ventana de 15 min y revisión | 20-28 |
| B-E4 | Vista de flota completa: inicio, vales, colaboradores, vehículos, consumos y reportes, estado de cuenta, ajustes; auditoría básica/estricta | 45-60 |
| B-E5 | Vencimientos (cron), facturación al depósito / por consumo (cortes diarios), métricas y alertas del admin | 20-28 |
| B-E6 | Premios corporativos: catálogo, fondo de puntos, asignación a colaboradores | 15-22 |
| B-E7 | Piloto con 1 empresa, ajustes, documentación (manual del encargado) | 15-25 |
| **Total** | | **180-250 hs** |

Orden recomendado: E1 → E2 → E3 (con esto ya se puede pilotear con una
empresa y el operador manual) → E4 → E5 → E6 → E7. El crédito queda
preparado desde E1 (`credit_limit`, saldo negativo permitido hasta el límite,
bloqueo de emisión con corte vencido) sin UI de cobranza en esta versión.
