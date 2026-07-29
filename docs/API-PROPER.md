# API de integración Puntos Plus ⇄ PROPER

**Versión del documento:** 1.0 · 29 de julio de 2026
**Estado:** propuesta técnica para revisión de PROPER
**Contacto:** Puntos Plus — Gasolineras Turkaj, Chichicastenango

---

## 1. Qué resuelve esta integración

Puntos Plus es el programa de lealtad de las gasolineras Turkaj (I, II y III).
Hoy los puntos se acreditan desde la app de Puntos Plus, en un paso aparte
del cobro. La integración busca que **todo ocurra dentro del flujo normal de
facturación de PROPER**, sin que el colaborador cambie de aplicación.

Dos funciones, ambas iniciadas por un escaneo de QR desde el POS:

| # | Dónde | Botón sugerido | Qué hace |
|---|---|---|---|
| 1 | Al **cerrar la factura** | "Acumular Puntos Plus" | Escanea el QR del cliente y acredita los puntos de esa factura |
| 2 | En la **pantalla de inicio** | "Comprobante de premio" | Escanea el QR de un premio canjeado y devuelve los datos para imprimirlo |

**Puntos Plus expone la API; PROPER la consume.** No necesitamos acceso a la
base de datos de PROPER ni ustedes a la nuestra: todo viaja por HTTPS con una
llave de API.

---

## 2. Datos básicos

| | |
|---|---|
| **URL base** | `https://puntosplus.vercel.app/api/v1` |
| **Formato** | JSON (UTF-8) |
| **Autenticación** | `Authorization: Bearer <API_KEY>` |
| **Zona horaria** | Todas las fechas en ISO 8601 UTC; la lógica de negocio usa América/Guatemala |
| **Moneda** | Quetzales (GTQ) |

La API key se las entregamos por canal seguro. Es un texto tipo
`pp_live_a1b2c3…`; **se muestra una sola vez** y no puede recuperarse (si se
pierde, generamos otra y revocamos la anterior). Cada llave puede desactivarse
sin afectar al resto del sistema.

> **Importante:** la llave identifica al *sistema* PROPER, no al colaborador.
> Quién atendió se envía en cada compra (ver §5.3).

---

## 3. Cómo identificamos a cada actor

### 3.1 El cliente — QR de su tarjeta digital

Cada miembro tiene un código correlativo con el formato:

```
CT[O|P|B]D-NNNNN     ejemplos:  CTOD-00042   CTPD-00113   CTBD-00007
```

La letra del medio es su nivel (**O**ro, **P**latino, **B**lack) y **cambia
sola** cuando el cliente sube de nivel — el correlativo numérico nunca cambia.
El QR que muestra la app contiene exactamente ese texto, sin URL ni prefijos.

### 3.2 El premio — QR del canje

Cuando un cliente canjea un premio, Puntos Plus le genera un código único:

```
TK-XXXXXX            ejemplo:  TK-3F9A2C
```

### 3.3 El colaborador — su identificador de PROPER

PROPER mantiene su propia base de personal y **no necesitamos duplicarla**.
En cada compra nos envían el identificador interno del colaborador y su
nombre; Puntos Plus crea automáticamente un registro espejo la primera vez
que aparece y lo reutiliza después. Ese espejo:

- permite atribuir cada compra a quien la hizo (reportes y ranking de atención),
- **no puede iniciar sesión** en la app de Puntos Plus,
- se actualiza solo si el nombre cambia en PROPER.

No hace falta una sincronización previa ni un catálogo cargado a mano: el
primer envío del colaborador lo da de alta.

### 3.4 La estación

Cada POS pertenece a una estación fija. Consulten `GET /v1/stations` una vez
(§5.1) y guarden el `station_id` en la configuración del dispositivo.

---

## 4. Regla de NIT (requisito del negocio)

Los puntos se acreditan **solo si la factura corresponde al cliente**. La regla
que aplicamos es:

| Situación del cliente en Puntos Plus | Facturas que SÍ acumulan | Facturas que NO acumulan |
|---|---|---|
| **Tiene NIT registrado** | `CF` **o** su propio NIT | Cualquier otro NIT |
| **No tiene NIT registrado** | Solo `CF` | Cualquier NIT |

**Normalización:** comparamos sin guiones, espacios ni mayúsculas/minúsculas.
Se aceptan como consumidor final: `CF`, `C/F`, `CF0`, `consumidor final` y el
campo vacío.

**Recomendación de flujo:** antes de emitir, el POS puede consultar
`GET /v1/members` (§5.2) — devuelve si el cliente tiene NIT y con cuáles se le
puede facturar. Así el colaborador lo sabe *antes* de imprimir, y no después.

Si la factura ya se emitió con un NIT que no corresponde, la respuesta es
`422 nit_mismatch` y **no se acredita nada**. Es una decisión de negocio, no un
error técnico: el mensaje puede mostrarse tal cual al colaborador.

---

## 5. Endpoints

### 5.1 `GET /v1/stations` — catálogo de estaciones

Se consulta una vez para configurar cada POS.

```bash
curl -X GET "https://puntosplus.vercel.app/api/v1/stations" \
  -H "Authorization: Bearer pp_live_..."
```

```json
{
  "ok": true,
  "stations": [
    { "id": "03643c23-cfbf-4d90-80af-8d9a2b15be2c", "name": "Turkaj I",   "address": "7a Av 6-10 Z1", "active": true },
    { "id": "e061fc7a-29ec-465e-8770-7dd1a63a467e", "name": "Turkaj II",  "address": "8a Av 12-43 Z1", "active": true },
    { "id": "5c27fb13-4208-42c9-8806-53ee63fb2ff7", "name": "Turkaj III", "address": "Km 148, La Cruz", "active": true }
  ]
}
```

---

### 5.2 `GET /v1/members` — identificar al cliente (opcional pero recomendado)

Se llama justo después de escanear el QR, **antes de emitir la factura**.

```bash
curl -X GET "https://puntosplus.vercel.app/api/v1/members?card_code=CTOD-00042" \
  -H "Authorization: Bearer pp_live_..."
```

```json
{
  "ok": true,
  "member_id": "da0a6ef7-0f3c-41cf-9ca6-728bb9c2d788",
  "name": "Alexander Sut",
  "tier": "PLATINO",
  "points": 340,
  "has_nit": true,
  "nit_masked": "****4501",
  "accepted_nits": ["CF", "12345678901"]
}
```

`accepted_nits` es la lista de NIT con los que esa factura acumulará. Si el
cliente no tiene NIT registrado, será `["CF"]`.

> Por privacidad devolvemos el NIT enmascarado; `accepted_nits` sí trae el
> valor completo para que el POS pueda compararlo automáticamente.

---

### 5.3 `POST /v1/purchases` — acumular puntos ⭐ (endpoint principal)

Se llama **después** de cerrar la factura, con los datos reales de la venta.

```bash
curl -X POST "https://puntosplus.vercel.app/api/v1/purchases" \
  -H "Authorization: Bearer pp_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: PROPER-FAC-2026-000123" \
  -d '{
    "card_code": "CTOD-00042",
    "amount": 250.00,
    "gallons": 8.06,
    "fuel_type": "super",
    "nit": "CF",
    "invoice_no": "FAC-2026-000123",
    "station_id": "03643c23-cfbf-4d90-80af-8d9a2b15be2c",
    "operator": { "external_id": "EMP-017", "name": "Juan Pérez" }
  }'
```

#### Campos

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `card_code` | string | Sí | Texto del QR escaneado, tal cual |
| `amount` | number | Sí | Total facturado en Q. Mínimo Q10 |
| `gallons` | number | Sí | **Galones reales del surtidor** (más preciso que estimarlos) |
| `fuel_type` | string | Sí | `super` \| `regular` \| `diesel` |
| `nit` | string | Sí | NIT de la factura, o `CF` |
| `invoice_no` | string | Recomendado | Número de factura, para conciliación |
| `station_id` | uuid | Sí | De `GET /v1/stations` |
| `operator.external_id` | string | Sí | Identificador del colaborador en PROPER |
| `operator.name` | string | Recomendado | Nombre para mostrar en reportes |

#### Respuesta exitosa — `201 Created`

```json
{
  "ok": true,
  "purchase_id": "9c1e...",
  "member_name": "Alexander Sut",
  "points_earned": 25,
  "points_base": 25,
  "points_promo": 0,
  "points_balance": 365,
  "gallons": 8.06,
  "tier": "PLATINO",
  "tier_changed": false,
  "new_card_code": null,
  "promo": null
}
```

**Qué mostrar/imprimir:** `points_earned` (los puntos de esta compra) y
`points_balance` (su saldo total). Si `tier_changed` es `true`, el cliente
subió de nivel y `new_card_code` trae su código nuevo — vale la pena
felicitarlo.

#### Cuando aplica una promoción

Puntos Plus tiene un motor de promociones (dobles puntos por día o producto,
premios por consumo). Si alguna aplica, se refleja sola:

```json
{
  "ok": true,
  "points_earned": 50,
  "points_base": 25,
  "points_promo": 25,
  "promo": {
    "name": "Doble puntos en súper",
    "effect_type": "points_multiplier",
    "effect_value": 2,
    "extra_points": 25
  }
}
```

Si la promoción otorga un **premio gratis**, `promo` incluirá además
`reward_name` y `redemption_code` (un `TK-XXXXXX`). Ese código puede
imprimirse en el ticket: el cliente lo presenta para retirar su premio.

#### Idempotencia (importante)

Envíen el header `Idempotency-Key` con un valor único por factura (el número
de factura sirve). Si el POS reintenta por corte de red, devolvemos la
**respuesta original** con `"replayed": true` y **no** acreditamos dos veces.

Los rechazos (NIT incorrecto, etc.) **no** consumen la llave: pueden corregir
el dato y reintentar con la misma.

---

### 5.4 `GET /v1/redemptions` — comprobante de premio

Para el botón de la pantalla de inicio. Escanean el QR del premio y obtienen
los datos a imprimir.

```bash
curl -X GET "https://puntosplus.vercel.app/api/v1/redemptions?code=TK-3F9A2C" \
  -H "Authorization: Bearer pp_live_..."
```

```json
{
  "ok": true,
  "redemption_id": "4b2c...",
  "code": "TK-3F9A2C",
  "reward_name": "Lavado de vehículo",
  "category": "servicio",
  "points_spent": 150,
  "member_name": "Alexander Sut",
  "card_code": "CTPD-00113",
  "created_at": "2026-07-28T18:22:10.000Z",
  "delivered": false,
  "delivered_at": null,
  "confirm_status": "none"
}
```

**Esta llamada no cambia el estado del canje** — solo entrega los datos. La
entrega se confirma como hasta ahora: el operador la solicita desde la app de
Puntos Plus y **el cliente la aprueba en su teléfono**. Es una salvaguarda del
programa y se mantiene igual.

Si `delivered` viene en `true`, el premio ya fue entregado antes: conviene
advertirlo antes de imprimir de nuevo.

---

## 6. Errores

Todas las respuestas de error tienen la misma forma:

```json
{ "error": "nit_mismatch", "message": "La factura debe emitirse con CF o con el NIT del cliente" }
```

`error` es una clave estable (para programar); `message` es texto listo para
mostrar al colaborador.

| HTTP | `error` | Significado |
|---|---|---|
| 401 | `missing_api_key` / `invalid_api_key` | Llave ausente, mal escrita o desactivada |
| 403 | `insufficient_scope` | La llave no tiene permiso para esa operación |
| 400 | `invalid_card_code` | El QR escaneado no es una tarjeta Puntos Plus |
| 404 | `member_not_found` | La tarjeta no corresponde a ningún cliente |
| 404 | `redemption_not_found` | No existe un canje con ese código |
| 422 | `nit_mismatch` | La factura no cumple la regla de NIT (§4) |
| 422 | `amount_too_low` | Monto menor a Q10 |
| 422 | `invalid_gallons` | Galones ausentes o ≤ 0 |
| 422 | `invalid_fuel_type` | Distinto de `super`, `regular`, `diesel` |
| 422 | `invalid_station` | `station_id` desconocido |
| 422 | `missing_operator` | Falta el identificador del colaborador |
| 405 | `method_not_allowed` | Método HTTP incorrecto |
| 500 | `server_error` | Error nuestro — reintentar en unos segundos |

**Criterio recomendado en el POS:** los `4xx` son definitivos (mostrar el
mensaje y seguir); ante un `500` o un timeout, reintentar hasta 2 veces con la
misma `Idempotency-Key`.

---

## 7. Flujos completos

### 7.1 Acumular puntos

```
1. El colaborador cobra normalmente en PROPER
2. Al cerrar la factura → botón "Acumular Puntos Plus"
3. Escanea el QR del cliente                  → CTOD-00042
4. (Opcional) GET /v1/members                 → ¿CF o NIT del cliente?
5. Se emite la factura
6. POST /v1/purchases con los datos reales
7. El POS muestra/imprime: "+25 pts · Saldo: 365"
```

Del lado del cliente todo sigue igual: **recibe una notificación** en su
teléfono con los puntos acreditados y, si tiene la app abierta, ve el saldo
actualizarse al instante y puede calificar la atención.

### 7.2 Comprobante de premio

```
1. El cliente llega con su premio canjeado en la app
2. Pantalla de inicio de PROPER → "Comprobante de premio"
3. Escanea el QR del premio                   → TK-3F9A2C
4. GET /v1/redemptions?code=TK-3F9A2C
5. El POS imprime el comprobante
6. La entrega se confirma en la app de Puntos Plus (cliente + operador)
```

---

## 8. Ambiente de pruebas

Antes de producción les damos:

- una **API key de pruebas** con acceso a datos ficticios,
- 2–3 **tarjetas de prueba** (una con NIT registrado y otra sin él) para
  validar los dos caminos de la regla de NIT,
- un **canje de prueba** con su código `TK-` para el comprobante.

Sugerimos validar estos casos:

- [ ] Compra con `CF` → acredita
- [ ] Compra con el NIT del cliente → acredita
- [ ] Compra con un NIT ajeno → `422 nit_mismatch`, no acredita
- [ ] Cliente sin NIT + factura con NIT → `422 nit_mismatch`
- [ ] Reintento con la misma `Idempotency-Key` → `replayed: true`, sin doble acreditación
- [ ] QR inválido o tarjeta inexistente → error claro
- [ ] Compra que sube de nivel → `tier_changed: true`
- [ ] Consulta de un canje ya entregado → `delivered: true`

---

## 9. Notas de seguridad y operación

- **HTTPS obligatorio.** La llave viaja en el header `Authorization`; nunca en
  la URL ni en los logs del POS.
- **La llave no debe quedar en el código del cliente** ni en dispositivos sin
  protección: idealmente vive en el servidor de PROPER, que actúa de
  intermediario con los POS.
- **Registramos cada llamada** (endpoint, datos, resultado) para conciliación y
  soporte. No guardamos la llave en claro.
- **Sin acceso cruzado a bases de datos:** PROPER no lee ni escribe en nuestra
  base y viceversa; todo pasa por estos endpoints.
- **Rotación:** si sospechan que la llave se filtró, avisen y la revocamos en
  minutos; generar una nueva es inmediato.
- **Datos personales:** la API expone solo lo mínimo necesario (nombre, nivel,
  saldo y NIT enmascarado). No devolvemos teléfono, DPI, dirección ni correo.

---

## 10. Qué necesitamos de PROPER

Para cerrar la integración nos ayudaría recibir:

1. **Confirmación del contrato** — si los campos de §5.3 coinciden con lo que su
   sistema tiene disponible al cerrar una factura (especialmente **galones
   reales** y **NIT**).
2. **Identificador del colaborador** — qué campo usarán como `external_id`
   (código de empleado, usuario del sistema, etc.) y si es estable en el tiempo.
3. **Modelo de llamada** — si los POS llamarán directo a nuestra API o a través
   de un servidor intermedio de PROPER (recomendamos lo segundo).
4. **Manejo de anulaciones** — hoy no contemplamos reverso de puntos por
   factura anulada. Si su flujo lo necesita, diseñamos un endpoint
   `POST /v1/purchases/{id}/void`; díganos cómo notifican una anulación.
5. **Volumen estimado** — transacciones por día y por estación, para dimensionar
   límites de uso.

---

## 11. Preguntas abiertas de nuestro lado

- **Combustible por bomba:** hoy pedimos `fuel_type` como texto. Si su sistema
  maneja códigos de producto, mándenos la tabla y hacemos el mapeo de nuestro
  lado.
- **Ventas mixtas** (combustible + tienda en la misma factura): hoy acreditamos
  sobre el **total** facturado. Si prefieren acreditar solo la porción de
  combustible, necesitaríamos ese desglose en el payload.
- **Facturas a crédito o con múltiples formas de pago:** para nosotros es
  indistinto, acreditamos sobre el monto total. Confirmar si comparten ese
  criterio.

---

## 12. Contacto

Cualquier duda sobre el contrato, ejemplos o pruebas, escribinos y lo
resolvemos por el canal que les resulte más cómodo. Este documento es una
propuesta: **todo campo o comportamiento es negociable** antes de fijar la
versión 1 de la API.
