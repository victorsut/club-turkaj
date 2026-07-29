# API de integración Puntos Plus ⇄ PROPER

**Versión del documento:** 1.1 · 29 de julio de 2026
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

> ### Principio de diseño: no intervenir en su flujo
>
> **La factura se emite primero; nosotros validamos después.** Ningún paso de
> esta integración condiciona, bloquea o modifica el proceso de facturación de
> PROPER. Recibimos los datos de una factura **ya emitida** y respondemos si
> acumuló puntos o no.
>
> Cuando una factura no cumple las condiciones (§4), **no es un error del POS
> ni del colaborador**: devolvemos un mensaje explicando qué debe ajustar *el
> cliente* en su app para la próxima vez. El colaborador solo lo lee en
> pantalla. La venta ya está hecha y no se toca.

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

### 3.4 La estación — viene con el colaborador

Cada colaborador porta su propio POS e **inicia sesión en PROPER**, que ya le
tiene asignada su estación. Por eso **no les pedimos configurar nada por
dispositivo**: manden el código de estación que ya manejan (en
`operator.station`) y nosotros lo mapeamos a la nuestra.

Aceptamos tres formas, en este orden:

1. El **código de estación de PROPER** (ej. `"1"`, `"EST-01"`) — nos pasan su
   lista una vez y la configuramos de nuestro lado.
2. El **nombre** (`"Turkaj I"`, `"turkaj 1"` — toleramos mayúsculas y espacios).
3. Si no viene, usamos **la última estación conocida de ese colaborador**.

Solo si no podemos resolverla por ninguna vía devolvemos `unknown_station`.

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

**Qué pasa cuando no se cumple.** La factura ya está emitida y no se toca:
respondemos `422` con un mensaje **dirigido al cliente**, para que el
colaborador se lo lea y aquel ajuste su app. Hay dos casos distintos:

| `error` | Situación | Mensaje que devolvemos |
|---|---|---|
| `nit_not_registered` | Factura con NIT, pero el cliente no tiene NIT en Puntos Plus | "…el cliente no tiene NIT registrado en Puntos Plus. Puede agregarlo desde su app en Menú → Mi Cuenta, o pedir la factura con CF." |
| `nit_mismatch` | Factura con un NIT distinto al registrado | "El NIT de la factura no coincide con el registrado por el cliente… Solo acumulan las facturas con su propio NIT o con CF." |

Ambas respuestas incluyen `member_name` e `invoice_nit` (y el NIT registrado
enmascarado, en el segundo caso) por si quieren mostrarlo o imprimirlo.

**Consulta opcional de diagnóstico:** si alguna vez quieren anticiparse,
`GET /v1/members` (§5.2) dice con qué NIT acumula ese cliente. **No es parte
del flujo** — es una herramienta para soporte o para una pantalla informativa.

---

## 5. Endpoints

### 5.1 `GET /v1/stations` — catálogo de estaciones (referencia)

Solo informativo: como la estación viaja con el colaborador (§3.4), el POS no
necesita configurarla. Sirve para cotejar el mapeo de códigos.

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

### 5.2 `GET /v1/members` — consulta de diagnóstico (opcional)

No forma parte del flujo de venta. Sirve para soporte o para una pantalla
informativa: dice con qué NIT acumula un cliente.

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

Se llama **después** de emitir la factura, con los datos reales de la venta.

```bash
curl -X POST "https://puntosplus.vercel.app/api/v1/purchases" \
  -H "Authorization: Bearer pp_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: FAC-2026-000123" \
  -d '{
    "card_code": "CTOD-00042",
    "fuel_amount": 250.00,
    "gallons": 8.06,
    "fuel_type": "super",
    "nit": "CF",
    "invoice_no": "FAC-2026-000123",
    "total_amount": 312.50,
    "operator": { "external_id": "EMP-017", "name": "Juan Pérez", "station": "1" }
  }'
```

#### Campos

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `card_code` | string | Sí | Texto del QR escaneado, tal cual |
| `fuel_amount` | number | Sí | **Solo la porción de COMBUSTIBLE** de la factura, en Q. Mínimo Q10 |
| `gallons` | number | Sí | Galones reales despachados |
| `fuel_type` | string | Sí | `super` \| `regular` \| `diesel` |
| `nit` | string | Sí | NIT de la factura emitida, o `CF` |
| `invoice_no` | string | Recomendado | Número de factura, para conciliación |
| `total_amount` | number | Opcional | Total de la factura (con tienda). Solo se guarda para conciliar: **no** afecta los puntos |
| `operator.external_id` | string | Sí | Identificador del colaborador en PROPER |
| `operator.name` | string | Recomendado | Nombre, para reportes de atención |
| `operator.station` | string | Recomendado | Código de estación de PROPER (§3.4) |

> **Compatibilidad:** aceptamos `amount` como alias de `fuel_amount` y
> `station` en la raíz del cuerpo, por si les resulta más cómodo.

#### Facturas mixtas (combustible + tienda)

Los puntos se calculan **únicamente sobre el consumo de combustible**. Si la
factura incluye otros productos, manden:

- `fuel_amount` → la porción de combustible (**base de los puntos**),
- `total_amount` → el total facturado (solo para conciliación).

Ejemplo: factura de Q312.50 = Q250 de súper + Q62.50 de tienda → el cliente
acumula por los Q250. Si la factura **no tiene combustible**, devolvemos
`422 no_fuel_in_invoice` y no se acredita nada.

#### Sobre los precios y los galones

**No usamos nuestros precios para nada de este cálculo.** La configuración de
precios vigente es la de PROPER (la editamos nosotros de su lado), así que
confiamos plenamente en los `gallons` y el `fuel_amount` que nos envían: son
los valores reales de la venta. Nuestro rol se limita a convertir el consumo
en puntos según las reglas del programa.

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
  "fuel_amount": 250.00,
  "station": "Turkaj I",
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
| 422 | `nit_mismatch` | El NIT de la factura no es el del cliente (§4) |
| 422 | `nit_not_registered` | Factura con NIT y cliente sin NIT registrado (§4) |
| 422 | `no_fuel_in_invoice` | La factura no incluye combustible |
| 422 | `amount_too_low` | Consumo de combustible menor a Q10 |
| 422 | `invalid_gallons` | Galones ausentes o ≤ 0 |
| 422 | `invalid_fuel_type` | Distinto de `super`, `regular`, `diesel` |
| 422 | `unknown_station` | No se pudo resolver la estación del colaborador (§3.4) |
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
1. El colaborador cobra y EMITE la factura normalmente en PROPER
   (nada de esto se modifica ni se condiciona)
2. Factura emitida → botón "Acumular Puntos Plus"
3. Escanea el QR del cliente                  → CTOD-00042
4. POST /v1/purchases con los datos de la factura ya emitida
5a. Acumuló  → el POS muestra: "+25 pts · Saldo: 365"
5b. No acumuló → el POS muestra el motivo, dirigido al cliente
    ("agregá tu NIT en la app" / "pedí la factura con CF")
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
- [ ] Cliente sin NIT + factura con NIT → `422 nit_not_registered`
- [ ] **Factura mixta** (combustible + tienda) → acredita solo por `fuel_amount`
- [ ] **Factura sin combustible** → `422 no_fuel_in_invoice`
- [ ] **Estación resuelta desde el colaborador** (sin mandar `station`) → acredita en la correcta
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

1. **Confirmación del contrato** — si los campos de §5.3 están disponibles en su
   sistema al momento de cerrar una factura. Los tres críticos son:
   **galones despachados**, **monto de la porción de combustible** y **NIT
   emitido**.
2. **Desglose de combustible en facturas mixtas** — confirmar que pueden
   separar la línea de combustible del resto de productos. Es lo único que
   necesitamos que venga discriminado.
3. **Identificador del colaborador** — qué campo usarán como `external_id`
   (código de empleado, usuario con el que inicia sesión, etc.) y si es estable
   en el tiempo.
4. **Códigos de estación** — su lista de estaciones con el código que manejan,
   para dejar el mapeo configurado de nuestro lado (§3.4).
5. **Modelo de llamada** — si los POS llamarán directo a nuestra API o a través
   de un servidor intermedio de PROPER (recomendamos lo segundo: la llave queda
   protegida y ustedes controlan reintentos y trazabilidad).
6. **Manejo de anulaciones** — hoy no contemplamos reverso de puntos por factura
   anulada. Si su flujo lo necesita, diseñamos `POST /v1/purchases/{id}/void`;
   díganos cómo notifican una anulación.
7. **Volumen estimado** — transacciones por día y por estación, para dimensionar
   límites de uso.

---

## 11. Preguntas abiertas de nuestro lado

- **Combustible por bomba:** pedimos `fuel_type` como texto (`super`,
  `regular`, `diesel`). Si manejan códigos de producto, mándenos la tabla y
  hacemos el mapeo de nuestro lado.
- **Varios combustibles en una misma factura** (p. ej. súper y diésel para dos
  vehículos): hoy esperamos un solo `fuel_type` con la suma de galones y monto.
  Si esto ocurre con frecuencia, podemos aceptar un arreglo de líneas.
- **Facturas a crédito o con varias formas de pago:** para nosotros es
  indistinto — acreditamos sobre el consumo de combustible facturado.
  Confirmar si comparten ese criterio.
- **Cliente sin tarjeta escaneada:** si el colaborador olvida escanear, la
  factura simplemente no acumula. ¿Necesitan poder acumular después, con la
  factura ya cerrada? Se puede habilitar con un plazo (ej. mismo día).

---

## 12. Contacto

Cualquier duda sobre el contrato, ejemplos o pruebas, escribinos y lo
resolvemos por el canal que les resulte más cómodo. Este documento es una
propuesta: **todo campo o comportamiento es negociable** antes de fijar la
versión 1 de la API.
