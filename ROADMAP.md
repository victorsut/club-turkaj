# Puntos+ — Roadmap de Producto

> **Versión:** 2.3
> **Fecha de creación:** 17 de mayo de 2026
> **Última actualización:** 13 de junio de 2026
> **Estado:** Vivo (este documento evoluciona con el proyecto)

---

## 0. Sobre este documento

### 0.1 Propósito

Este documento es el plan maestro de evolución de Puntos+. Define qué se va a construir, en qué orden, con qué alcance, y por qué. No es un cronograma de plazos fijos sino un mapa de prioridades técnicas con estimaciones de esfuerzo razonables.

### 0.2 Cómo leerlo

- **Si tenés 5 minutos:** lee la sección 1 (Visión) y la sección 4 (Mapa general de fases).
- **Si tenés 30 minutos:** lee todo el documento de corrido.
- **Si vas a trabajar en una fase específica:** salta directo a la sección 5 con el código de fase que corresponda.
- **Si dudas si algo está incluido:** revisa la sección 8 (Lo que NO está en este roadmap).

### 0.3 Cómo mantenerlo vivo

Este documento debe actualizarse cuando:
- Se cierra una fase (marcar como completada y actualizar estimaciones de las siguientes).
- Se descubre un blocker no anticipado (agregar a riesgos).
- Se cambia una decisión de producto (anotar en sección 2 con fecha y motivo).
- Aparece deuda técnica nueva (apéndice B).

La regla de oro: **si tomaste una decisión que afecta el roadmap, escribíla acá. No confíes en tu memoria a 6 meses.**

---

## 1. Visión y contexto

### 1.1 Identidad del producto

**Puntos+** es una plataforma de fidelización digital independiente. **No es propiedad de Turkaj ni de Shell Guatemala.** Es un producto que las empresas (en su primer cliente: Turkaj) contratan para gestionar sus programas de lealtad.

**Diferencia importante:**
- **Puntos+** es la plataforma (producto).
- **Turkaj** es un cliente de Puntos+ (gasolineras Turkaj I, II, III en Chichicastenango).
- **Shell Guatemala** NO es parte de Puntos+ ni administra el programa.

Esta separación tiene implicaciones legales, comerciales y arquitectónicas:

| Aspecto | Implicación |
|---|---|
| Legal | Disclaimer obligatorio: "Puntos+ es una app ajena a Shell Guatemala y aplica únicamente a gasolineras Turkaj en Chichicastenango." |
| Comercial | Si en el futuro otra empresa quiere usar Puntos+, es contrato independiente (no parte de Turkaj). |
| Arquitectura | Una instancia por empresa, pero el código del producto es independiente del cliente. No hay hardcoding de "Turkaj" en el branding visible. |

### 1.2 Qué es Puntos+ hoy

Puntos+ (anteriormente conocido como "Club Turkaj +") es una Progressive Web App (PWA) de programa de lealtad para gasolineras Turkaj I, II, III en Chichicastenango, Guatemala. Permite a clientes acumular puntos por consumo de combustible, canjear premios, participar en rifas mensuales y completar encuestas.

**Stack técnico actual:**
- Frontend: React 18.3.1 + Vite 6.4.2 (JSX, sin TypeScript)
- Backend: Supabase (PostgreSQL + RLS + Realtime + Edge Functions)
- Deploy: Vercel con autodeploy desde `main`
- Push notifications: Web Push API con VAPID
- Auth cliente: Google OAuth via Supabase Auth + phone/password
- Auth admin/operador: RPCs propios con bcrypt server-side
- POS de operadores: Sunmi P2 (Android con impresora térmica integrada)

**Modelo de negocio actual:**
- Q10 = 1 punto (acumulación lineal sin tier)
- 3 tiers (ORO/PLATINO/BLACK) basados en galones acumulados
- Sistema de degradación por inactividad por tier
- Encuestas con boleto de rifa al completar 5/día
- Rifa mensual con premio configurable

**Estado de salud:** funcional en producción con ~27 miembros, 19 operadores activos, 38 entradas de rifa en circulación.

### 1.3 Qué será al completar este roadmap

Puntos+ será una plataforma de lealtad configurable que:

1. **Es configurable por empresa** (Turkaj hoy, otra empresa mañana sin tocar código).
2. **Implementa la estrategia comercial completa** del documento estratégico: multiplicador de puntos por tier, lavados gratis, eventos especiales diferenciados.
3. **Aplica QR único con control de fraude a TODO premio canjeable** incluyendo canjes regulares, lavados mensuales gratis, y premios de rifa.
4. **Tiene rediseño visual** que prioriza claridad, vehículos del cliente, y acceso rápido a beneficios, con identidad de marca Puntos+ y disclaimer legal visible.
5. **Soporta dos canales de identidad**: cuenta digital (app) y tarjeta física (operador-asistido).
6. **Expone API REST** consumible por sistemas de facturación externos (PROPER) y otros canales futuros.
7. **Trackea vehículos del cliente** como entidad de primera clase con telemetría manual y alertas push de servicios.
8. **Audita acciones de admin** con before/after para trazabilidad completa.
9. **Cubre features faltantes**: verificación de teléfono multicanal (WhatsApp + SMS fallback), recuperación de password, dirección estructurada, confirmaciones críticas.
10. **Optimiza flujo de impresión** en POS Sunmi P2 con doble comprobante (operador + cliente) al canjear premios.

### 1.4 Cambios fundamentales respecto al estado actual

| Aspecto | Hoy | Al completar el roadmap |
|---|---|---|
| Identidad del producto | "Club Turkaj +" (mezcla producto/cliente) | "Puntos+" (producto independiente con Turkaj como cliente) |
| Empresa | Hardcoded "Turkaj" | Configurable desde admin |
| Estaciones | 3 hardcoded | N estaciones gestionables |
| Precios | Globales | Globales o por estación (toggle) |
| Puntos por tier | 1pt/Q10 todos | 1 / 1.2 / 1.5 pt/Q10 según tier |
| Lavados gratis | No existe | PLATINO/BLACK: 1/mes en Turkaj 2 y 3 |
| QR de canje | Aprobación manual operador | QR único persistente para todo premio |
| Premio de rifa | Sin reglas formales de retiro | Plazo y estación configurables (default 15 días, Turkaj 1) |
| Canales de identidad | Solo app digital | App digital + tarjeta física |
| Auditoría admin | No existe | Before/after de cada cambio |
| Vehículos cliente | Solo storage JSONB | Entidad con telemetría + alertas push |
| Integración externa | Cero | API REST consumible por PROPER |
| Localización de canjes | No existe | Cada premio con N lugares válidos |
| Impresión POS al canjear | Lenta e inestable, copia única | Optimizada con SDK Sunmi, doble comprobante (operador + cliente), reimpresión, logs |
| Verificación de teléfono | No existe | WhatsApp primario + SMS fallback (Twilio) |
| Disclaimer legal | No existe | Footer permanente + sección "Acerca de" |

---

## 2. Decisiones de producto tomadas

Esta sección documenta las decisiones tomadas durante las conversaciones de planificación. Cada decisión incluye motivo para que se entienda por qué se eligió así.

### D1 — NO multi-tenant
**Decisión:** una sola empresa por instancia de Puntos+. Si en el futuro aparece otra empresa interesada, sería deploy independiente (otro proyecto Supabase + otro Vercel).
**Motivo:** simplifica enormemente arquitectura (schemas, auth, billing). Multi-tenant introduce complejidad significativa que no se justifica sin demanda confirmada.

### D2 — Nombre fijo "Puntos+"
**Decisión:** el nombre de la app es **"Puntos+"** (fijo, no dinámico). Reemplaza al nombre anterior "Club Turkaj +".
**Motivo:** Puntos+ es la plataforma; Turkaj es el cliente. Mezclarlos en el branding ("Club Turkaj +") confundía la propiedad del producto. Con nombre fijo, Puntos+ tiene identidad propia y Turkaj es uno de sus clientes.
**Implementación:** rebranding completo se hace en F3 (rediseño visual). Hasta entonces, la app sigue mostrando "Club Turkaj +" en producción.

### D3 — N estaciones configurables
**Decisión:** desde admin se pueden agregar/editar/eliminar estaciones (no limitado a 3).
**Motivo:** soporta crecimiento del negocio del cliente. Hoy son 3 estaciones, mañana pueden ser 5 o 10.

### D4 — Toggle de precios globales vs por estación
**Decisión:** admin elige si los precios son iguales en todas las estaciones o si cada una tiene los suyos.
**Motivo:** flexibilidad operativa. Hoy son iguales, pero en el futuro podría haber diferencias por ubicación.

### D5 — Club Business como spike
**Decisión:** Club Business (B2B para flotas) se trata como spike de viabilidad, no desarrollo.
**Motivo:** no hay cliente confirmado. Investigación acotada antes de invertir esfuerzo.

### D6 — Vehículos manuales con tracking básico
**Decisión:** vehículos como entidad con datos ingresados manualmente por el cliente. Incluye CRUD, servicios, kilometraje y rendimiento (Nivel B).
**Motivo:** integración con OBD-II o API de fabricantes está fuera de alcance. Manual es factible hoy y aporta valor real.

### D7 — Tarjeta física separada de app
**Decisión:** clientes con tarjeta física tienen perfil independiente. NO pueden usar la app simultáneamente.
**Motivo:** simplificación. Un cliente es "de app" o "de tarjeta", no ambos. Si quiere migrar, se hace conversión explícita.

### D8 — Consulta presencial para tarjeta física
**Decisión:** clientes con tarjeta física consultan puntos y canjes presencialmente en estación. NO hay app/web/WhatsApp para ellos.
**Motivo:** son clientes que eligieron no usar tecnología; respetar esa elección.

### D9 — API REST expuesta por Puntos+
**Decisión:** Puntos+ expone API, PROPER (sistema de facturación) la consume.
**Motivo:** PROPER ya confirmó interés. Nosotros controlamos el contrato.

### D10 — Asignación automática post-factura
**Decisión:** al cerrar factura en PROPER + escanear QR, se asignan puntos sin confirmación adicional.
**Motivo:** reducir tiempo de operador al mínimo. Confirmación manual hoy es fricción innecesaria.

### D11 — Validación NIT
**Decisión:** al asignar puntos, validar que el NIT de la factura coincida con el NIT del miembro (excepto consumidor final).
**Motivo:** prevenir abuso. Un cliente no debería poder reclamar puntos de facturas de otra persona.

### D12 — Auditoría Nivel 2
**Decisión:** log de admin con before/after de campos modificados.
**Motivo:** trazabilidad completa sin construir UI de rollback (que sería Nivel 3, más esfuerzo).

### D13 — Rediseño visual completo del cliente
**Decisión:** rediseño basado en mockup de inspiración y wireframe ejemplo1. Mantiene la paleta de colores existente como base inspiracional. Absorbe el rebranding completo a Puntos+ (logo, eliminación de referencias a Turkaj en visuales del producto).
**Motivo:** UI actual cumple pero no destaca. Nuevo diseño prioriza claridad y branding. Aprovecha la transformación visual para implementar identidad de Puntos+.

### D14 — Nueva bottom navigation
**Decisión:** 4 pestañas + QR central: Inicio, Canjes, Rifa, Vehículos.
**Motivo:** vehículos sube a tab principal porque va a ser feature destacada del rediseño.

### D15 — Lavado mensual gratis
**Decisión:** PLATINO/BLACK reciben 1 lavado mensual gratis, válido solo en Turkaj 2 y Turkaj 3.
**Motivo:** está en estrategia comercial. Restricción de ubicación porque solo esas dos estaciones tienen lavadero.

### D16 — Aceite/Revisión NO se implementa
**Decisión:** beneficio de aceite/revisión para BLACK queda fuera del alcance inicial.
**Motivo:** falta de instalaciones y personal. Se podría agregar más adelante cuando se monten esos servicios.

### D17 — Localizaciones de canje configurables
**Decisión:** cada premio (reward) tiene N localizaciones donde es válido (estaciones y/o tiendas asociadas).
**Motivo:** flexibilidad. Café en Tienda Betel, gaseosa en Súper 24, lavado en Turkaj 2 y 3.

### D18 — Tiendas asociadas gestionables
**Decisión:** admin puede agregar/editar/eliminar tiendas asociadas (Betel, Súper 24, futuras).
**Motivo:** el negocio crece y agrega aliados. No debe requerir deploy.

### D19 — NO descuentos en tienda (del PDF)
**Decisión:** los descuentos 5%/10% en tienda mencionados en el PDF NO se implementan.
**Motivo:** mantener la dinámica actual de canjes específicos. Implementar descuentos porcentuales agrega complejidad de integración con TPV.

### D20 — QR de canje persistente y universal
**Decisión:** al iniciar canje en la app, cliente recibe QR único. Válido hasta uso (no expira por tiempo). Se marca como consumido al escanearse. **Aplica a TODO premio canjeable**: canjes regulares, lavados mensuales gratis, y premios de rifa.
**Motivo:** mayor flexibilidad para el cliente que QR efímero. Seguridad por unicidad + estado en BD. Universal porque todos los premios necesitan el mismo control de fraude.

### D21 — Reportería de negocio simplificada
**Decisión:** dashboard admin con KPIs básicos (miembros por tier, puntos en circulación, canjes del mes). NO KPIs financieros del PDF en esta versión.
**Motivo:** los KPIs financieros requieren integración contable que está fuera del alcance.

### D22 — Premio de rifa con reglas configurables
**Decisión:** el ganador del premio mensual de rifa recibe un QR con plazo máximo configurable para reclamarlo en una estación configurable. Defaults: 15 días, Turkaj 1.
**Motivo:** evita ambigüedad sobre dónde y cuándo reclamar premios. Configurable porque las reglas pueden cambiar.

### D23 — Catálogo de vehículos híbrido
**Decisión:** catálogo de marcas y modelos pre-cargado con opciones comunes en Guatemala. Cliente puede escribir custom_brand/custom_model si no encuentra el suyo. Admin promociona customs a oficial periódicamente.
**Motivo:** balance entre completitud y flexibilidad.

### D24 — Alertas push de servicios con umbrales globales
**Decisión:** alertas de servicios pendientes con umbrales configurados globalmente por admin. Cliente puede silenciar alertas por vehículo individualmente.
**Motivo:** simplicidad operativa.

### D25 — App nativa: decisión técnica diferida
**Decisión:** la migración a app nativa para iOS y Android es candidato post-roadmap.
**Motivo:** prematuro decidir sin información de uso. La app nativa NO entra al roadmap principal.

### D26 — Sistema de referidos diferido
**Decisión:** sistema de referidos queda fuera del roadmap actual.
**Motivo:** prioridad menor que features core. Sin embargo, **la BD ya tiene infraestructura parcial** (`members.referral_count`, `referred_by`, `referral_bonus_paid`) que probablemente sea de un intento anterior incompleto. Cuando se priorice, hay base para empezar.

### D27 — Verificación de teléfono multicanal: WhatsApp primario + SMS fallback
**Decisión:** la verificación de teléfono usa Twilio como proveedor único, con dos canales: WhatsApp Business API como canal primario y SMS como fallback automático. Toda la orquestación se hace desde Supabase Edge Functions.
**Motivo:** WhatsApp tiene 80-90% penetración en Guatemala, mejor tasa de entrega, y costo 5-10x menor que SMS. Supabase como orquestador mantiene la arquitectura simple.
**Costo estimado:** $2-5 USD/mes recurrente.

### D28 — Disclaimer legal de Puntos+
**Decisión:** la app incluye un disclaimer legal en dos ubicaciones:
- **Footer permanente:** visible en todas las pantallas de la app, en formato pequeño pero claro.
- **Sección "Acerca de":** con el texto completo y contexto adicional sobre Puntos+.
**Texto del disclaimer:**
> *"Puntos+ es una app ajena a Shell Guatemala y aplica únicamente a gasolineras Turkaj en Chichicastenango."*
**Motivo:** protección legal contra reclamos de Shell Guatemala sobre uso indebido de marca. Aclara la independencia del producto Puntos+ respecto a la franquicia Shell. Implementación en F3 (rediseño visual) cuando se rehaga toda la identidad.

### D29 — Impresión de comprobante: doble copia al canjear
**Decisión:** al canjear un premio (en gasolinera o tienda asociada), se imprimen automáticamente DOS comprobantes desde el POS Sunmi P2:
- **Comprobante del operador:** respaldo del premio entregado (con datos del cliente, card code, puntos descontados, QR del canje, operador). Sin firmas.
- **Comprobante del cliente:** confirmación minimalista (premio, fecha, estación). Sin datos sensibles.
**En ambos:** el nombre del premio se imprime en fuente grande y negrita para máxima legibilidad.
**Impresión solo al canjear**, NO al acumular puntos (la factura PROPER ya cubre la acumulación).
**Si la impresión falla:** la app permite reimpresión bajo demanda desde el operador. No hay fallback digital (QR en pantalla).
**Motivo:** doble copia es estándar en sistemas de fidelización serios. Operador conserva respaldo legal; cliente sale con confirmación tangible. Sin firmas porque la auditoría se hace vía `print_logs` + `redemption_qrs`. La reimpresión es más universal que QR digital (no asume smartphone con batería/conexión).

---

## 3. Realidad operativa

### 3.1 Disponibilidad

- **Días por semana disponibles:** 3-5.
- **Horas por día disponible:** 3-6.
- **Estimación promedio semanal:** 15-25 horas.

### 3.2 Equipo

- **1 persona** (vos) + Claude Code como asistente.
- Sin otros desarrolladores en el proyecto.

### 3.3 Deadlines

- Sin fechas duras.
- Objetivo declarado: "lo antes posible".

### 3.4 Freezes comerciales

- Sin ventanas de freeze. Se puede desplegar a producción cualquier semana del año.

### 3.5 Gestiones administrativas en paralelo

Algunas gestiones operacionales requieren tiempo de aprobación de terceros y deben iniciarse en paralelo al desarrollo:

| Gestión | Inicio recomendado | Duración estimada | Fase que la requiere |
|---|---|---|---|
| Cuenta Twilio Business | Semana 1 | 1-2 días | F5 |
| Aprobación WhatsApp Business via Twilio (Meta) | Semana 1 | 1-4 semanas | F5 |
| Plantillas WhatsApp pre-aprobadas | Semana 2 (post-aprobación cuenta) | 2-7 días por plantilla | F5 |
| Diseño de logo Puntos+ | Antes de F3 | A criterio del dueño | F3 |
| Coordinación técnica con PROPER | Semana ~22 | 2-4 semanas | F7 |

### 3.6 Implicaciones para el roadmap

A 15-25 horas semanales, el alcance total estimado es de **7 a 10 meses calendario**.

---

## P0 — Tarea pre-roadmap: Bug-fix urgente ✅ COMPLETADO

### P0.1 Descripción del bug

**Síntoma:** al completar la primera etapa del registro de cuenta nueva y avanzar a la segunda etapa (después de completar datos personales), la pantalla queda en blanco.

### P0.2 Diagnóstico

`useState` condicional en `GoogleProfile.jsx:358` violando Rules of Hooks. Al cambiar de step1 a step2, el conteo de hooks cambiaba y React lanzaba error #300.

### P0.3 Fix

Mover el `useState(checkingPhone)` al tope del componente con los otros useStates.

### P0.4 Estado

✅ Completado. Commit `3c3283c`. Validado en producción.

---

## 4. Mapa general de fases

### 4.1 Tabla resumen

| Fase | Bloque | Esfuerzo | Calendario | Prioridad | Estado |
|---|---|---|---|---|---|
| P0 | Bug-fix pantalla blanca | 1-3 hs | Antes de F0 | Crítica | ✅ Completado |
| F0 | Setup de auditoría Nivel 2 | 23-31 hs | 1-2 sem | Crítica | ⏳ En curso (F0.1 ✅) |
| **FB** | **Integridad y trazabilidad de puntos** | **16-26 hs** | **3-5 sem** | **Crítica** | 🔜 Próxima |
| **FA** | **Optimización impresión POS Sunmi** | **42-59 hs** | **2-3 sem** | **Crítica** | ⏳ Pendiente |
| F1 | Configurabilidad empresa + estaciones + precios + KPIs | 61-78 hs | 3-5 sem | Crítica | Pendiente |
| F2 | Mejoras programa de lealtad | 75-97 hs | 4-6 sem | Crítica | Pendiente |
| F3 | Rediseño visual + rebranding completo Puntos+ | 95-120 hs | 5-7 sem | Alta | Pendiente |
| F4 | Tarjeta física + extensiones operador | 50-70 hs | 3-4 sem | Alta | Pendiente |
| F5 | Features faltantes (WhatsApp+SMS, password, dirección) | 56-73 hs | 2-3 sem | Media | Pendiente |
| F6 | Vehículos como entidad + alertas push | 72-93 hs | 3-5 sem | Media | Pendiente |
| F7 | API REST pública + integración PROPER | 55-74 hs | 3-5 sem | Media | Pendiente |
| F8 | Spike Club Business | 1 sem | 1 sem | Baja | Pendiente |
| F9 | Reportería enriquecida (opcional) | 40-55 hs | 2-3 sem | Opcional | Pendiente |

**Total estimado:** 33-49 semanas calendario (≈8-11 meses).

### 4.2 Diagrama de dependencias

```
P0 (Bug-fix) ✅ ──► F0 (Auditoría) ──► FB (Integridad Puntos) ──► FA (Impresión POS) ──► F1 (Empresa) ──► F2 (Lealtad) ──► F3 (Visual + Rebrand)
                                                                                                       │
                                                                                                       ├──► F4 (Tarjeta) ──► F7 (API/PROPER)
                                                                                                       │
                                                                                                       └──► F5 (Features) ──► F6 (Vehículos)
                                                                                                                                  │
                                                                                                                                  └──► F8 (Spike) ──► F9 (Reportería)
```

**Lectura del diagrama:**
- FB (integridad de puntos) va **inmediatamente después de F0** y antes que FA: sin trazabilidad de `members.points`, la auditoría Nivel 2 queda incompleta y el programa pierde confianza del cliente.
- FA (impresión) es ahora **prerequisito crítico** porque sin impresión estable, el producto no es completamente útil.
- F3 (visual + rebranding) absorbe la transformación completa de identidad a Puntos+.
- Todo lo demás mantiene dependencias previas.

### 4.3 Gestiones paralelas

```
Semana 1 ──► Iniciar cuenta Twilio + WhatsApp Business
Semana 1-5 ──► Aprobación Meta (en background)
Antes de F3 ──► Diseñar logo Puntos+ (en background)
Semana ~22 ──► Coordinación técnica con PROPER (en background)
```

---

## 5. Detalle por fase

### Fase F0 — Setup de auditoría Nivel 2

#### 5.0.1 Objetivo

Implementar el sistema de auditoría que va a registrar todas las acciones de admin antes de que se agreguen funciones admin nuevas.

#### 5.0.2 Alcance

**Entra:**
- Tabla `admin_audit_log` con before/after.
- RPC `log_admin_action` con SECURITY DEFINER.
- Vista admin para consultar log.
- Modal de "motivo del cambio" antes de edición crítica.

**NO entra:**
- Rollback de cambios.
- Auditoría de acciones del cliente.
- Reportes exportables.

#### 5.0.3 Sub-fases

1. **F0.1** ✅ Schema `admin_audit_log` + migration. Completado, commit `557e173`.
2. **F0.2** ⏳ RPC `log_admin_action` con SECURITY DEFINER y validación de reason_text para acciones sensibles.
3. **F0.3** Modificar RPCs existentes para registrar en el log. ⏳ En curso.
   - **F0.3.1** ✅ Completada — `update_fuel_prices` con auditoría atómica (commit `b2320a4`).
   - **F0.3.1.5** ✅ Completada — validación server-side de longitud de `reason_text` (commit `3359bdc`).
   - **F0.3.2** ✅ Completada — `ReasonModal` genérico reusable (commit `261128f`).
   - **F0.3.3** ✅ Completada — integración Settings ↔ ReasonModal ↔ RPC precios (commit `ed6c920`).
   - **F0.3.4** ✅ Completada — RPCs de operadores con auditoría (commit `30d710a`).
   - **F0.3.5–F0.3.8** Pendiente — integración cliente (OpManagement, AdminPremios, AdminPromos, MemberDetail) + client-first logging para mutaciones directas.
4. **F0.4** Crear `AuditLog.jsx` con tabla paginada + filtros.
5. **F0.5** Agregar modal de "motivo del cambio" a operaciones de edición.
6. **F0.6** Build + commits + push.
7. **F0.7** Testing en producción.

#### 5.0.4 Acciones sensibles (requieren reason_text obligatorio)

Confirmadas en F0.2:

**Administrativas:**
- `update_fuel_prices`
- `update_operator_password`
- `reset_operator_password`
- `toggle_operator_active`
- `delete_reward`, `delete_special_day`, `delete_promotion`
- `delete_raffle_entry`
- `update_raffle`

**Sobre perfiles de cliente (patrón híbrido):**
- `update_member_profile` (datos personales: nombre, phone, dpi, plate, nit, email, birthday, vehicles)
- `update_member_points`
- `update_member_gallons`
- `update_member_balances` (spent, visits, tickets, redeemed_count)
- `delete_member` (preparado para futuro)
- `assign_physical_card` (preparado para futuro)
- `unassign_physical_card` (preparado para futuro)

**Total: 16 acciones sensibles.**

#### 5.0.5 Estimación

23-31 horas. 1-2 semanas. F0.1 completado (2-3 hs).

#### 5.0.6 Dependencias

P0 completado.

---

### Fase FB — Integridad y Trazabilidad de Puntos

**Estado:** Pendiente
**Estimación:** 16-26 horas (3-5 sesiones)
**Posición:** Entre F0 y FA

**Contexto y Evidencia:**

Sesión post-F0.3.4 (junio 2026) detectó caso documentado: cliente
ángel macario (tel 42985694, id ba2d11a5-cb7f-4f38-839d-ded7a7b6b02c)
presenta 71 puntos actuales vs 50 puntos justificables por
activity_log (1 registro de bienvenida +19 + 5 compras = 50).
Discrepancia: +21 puntos sin trazabilidad.

Diagnóstico técnico ejecutado con 19 queries en Supabase:

- 0 surveys completadas por el cliente.
- 0 raffle_entries, 0 raffle_tickets, 0 participants.
- 0 redemptions (redeemed_count = 0).
- Ningún RPC documentado (register_purchase, complete_survey,
  redeem_reward, buy_raffle_tickets) pudo haber generado el excedente.
- Ninguna función PostgreSQL no documentada modifica points
  (query a pg_proc descartó funciones huérfanas).
- Sin triggers en tabla members.

CONCLUSIÓN: existe vía de modificación directa a members.points
sin auditoría. Probable causa: edición admin vía MemberDetail.jsx
durante desarrollo, o UPDATE manual desde SQL Editor. El código
está bien; falta protección arquitectónica contra mutaciones directas.

CASO SECUNDARIO: cliente marcelino tiriquiz (tel 32519384, id
e45e7e3f-b02f-4496-9c23-e838c320a934) tiene puntos exactos al
historial (41 = 15 bienvenida + 26 compras). Reporte original
de "bajaron puntos" es percepción del cliente sin sustento técnico.

**Objetivos:**

1. Garantizar que TODO cambio en members.points genere entrada
   en activity_log con tipo, descripción y referencia.
2. Eliminar vías de modificación directa no auditadas.
3. Decidir tratamiento del caso de Ángel.
4. Política formal documentada: solo RPCs auditados modifican
   members.points.

**Sub-fases:**

| Sub-fase | Descripción | Estimación |
|----------|-------------|------------|
| FB.1 | Inventario exhaustivo de modificadores de members.points | 1-2 hs |
| FB.2 | RPC universal modify_member_points con SECURITY DEFINER | 4-6 hs |
| FB.3 | Refactor del cliente: MemberDetail, OpRedeem y otros | 3-5 hs |
| FB.4 | Trigger BEFORE UPDATE protector con session variable | 3-5 hs |
| FB.5 | Reconstrucción del caso ángel macario | 1 hs |
| FB.6 | Migración de datos potencialmente afectados (otros clientes) | 2-4 hs |
| FB.7 | Testing exhaustivo + documentación | 2-3 hs |

**Dependencias:**

- F0.3.5 a F0.3.8 (cliente integrado con ReasonModal) DEBEN
  completarse antes para tener el patrón ReasonModal usable en FB.5.
- F0.3.8 específicamente (MemberDetail con diff Opción B) prepara
  el terreno para que FB.3 reemplace mutaciones directas.

**Decisiones pendientes para arranque:**

1. Tratamiento de Ángel: ajustar puntos a 50 o crear entrada
   manual "+21 ajuste con motivo".
2. Identificar otros clientes que pueda haber editado puntos
   manualmente (la decisión se toma en FB.6).

**Justificación estratégica:**

La integridad de puntos es base del programa de lealtad. Sin FB,
F0 (auditoría Nivel 2) queda incompleta: auditamos acciones admin
explícitas pero no la mutación directa que reveló este caso.
FA (impresión POS) puede esperar; sin FB el programa pierde
confianza del cliente.

---

### Fase FA — Optimización de impresión POS Sunmi P2

#### 5.FA.1 Objetivo

Garantizar que el flujo de canje de premios funcione de manera estable y profesional desde ya, con doble comprobante (operador + cliente) impreso automáticamente al canjear.

#### 5.FA.2 Por qué esta fase es crítica

Hoy en producción, los flujos de acumulación de puntos y canje de premios funcionan a nivel de datos, pero la impresión de comprobantes es problemática:
- Proceso largo (5-6 clics) para imprimir.
- Algunos dispositivos no imprimen.
- Cliente sale sin comprobante físico → reduce confianza.

**Resolver esto hace que el producto sea completamente útil desde ya**, sin esperar al rediseño visual (F3) o features avanzadas (F5+).

#### 5.FA.3 Alcance

**Entra:**
- **Wrapper de impresión `sunmiPrinter.js`** con SDK nativo de Sunmi P2 + fallback a `window.print()`.
- **Doble comprobante al canjear premio:**
  - Comprobante del operador (respaldo): datos del cliente, card code, puntos descontados, QR del canje, operador, estación, fecha. **Sin firmas.**
  - Comprobante del cliente (minimalista): premio, estación, fecha. Sin datos sensibles.
- **Nombre del premio destacado:** fuente grande + negrita en ambos comprobantes (vía comandos ESC/POS).
- **Auto-print** al confirmar canje (sin clics adicionales del operador).
- **Reimpresión bajo demanda** si la impresión falla o el papel se atasca.
- **Tabla `print_logs`** para trazabilidad: qué se imprimió, cuándo, qué operador, qué tipo de comprobante, status (success/failed/pending), referencia a reimpresión si aplica.
- **Configuración admin** de "auto-imprimir sí/no" por estación.
- **Vista admin** de logs de impresión para auditoría.

**NO entra:**
- Impresión al acumular puntos (la factura PROPER cubre eso).
- Saldo actual o próximo premio alcanzable en el comprobante.
- Fallback digital con QR en pantalla.
- Firma del cliente en el comprobante.

#### 5.FA.4 Cambios de BD

```sql
CREATE TABLE public.print_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id      text,  -- text por ahora; FK uuid cuando exista tabla stations en F1
  operator_id     uuid REFERENCES operators(id),
  member_id       uuid REFERENCES members(id),
  redemption_qr_id uuid,  -- referencia al canje
  copy_type       text NOT NULL CHECK (copy_type IN ('operator', 'client', 'reprint')),
  print_status    text NOT NULL CHECK (print_status IN ('success', 'failed', 'pending')),
  error_message   text,
  printer_model   text,
  printed_at      timestamptz NOT NULL DEFAULT now(),
  reprinted_from  uuid REFERENCES print_logs(id)  -- cadena de reimpresiones
);

CREATE INDEX idx_print_logs_redemption ON print_logs(redemption_qr_id);
CREATE INDEX idx_print_logs_operator ON print_logs(operator_id, printed_at DESC);
CREATE INDEX idx_print_logs_status ON print_logs(print_status, printed_at DESC);
```

**Configuración en `program_config`:**
```json
{
  "printing_config": {
    "auto_print_enabled": true,
    "station_overrides": {},
    "max_reprints_per_redemption": 3
  }
}
```

#### 5.FA.5 Cambios de cliente

**Módulo nuevo de impresión:**
- `src/lib/sunmiPrinter.js`: wrapper con detección automática Sunmi vs no-Sunmi.
- `src/lib/receiptTemplates.js`: templates de comprobantes (operador + cliente) con comandos ESC/POS para fuente grande/negrita en nombre del premio.

**Vistas modificadas:**
- `OpClients.jsx` u `OpRedeem.jsx`: integración del auto-print al confirmar canje.
- Operador ve botón "Reimprimir" si la impresión inicial falló.

**Vistas admin nuevas:**
- `src/views/admin/PrintingConfig.jsx`: toggle auto-print por estación + máximo de reimpresiones.
- `src/views/admin/PrintLogs.jsx`: tabla paginada de logs filtrable por estación, operador, status, fecha.

#### 5.FA.6 Sub-fases para Claude Code

1. **FA.1** Migration `print_logs` + RPCs `log_print` + `get_print_logs`. (4-6 hs)
2. **FA.2** Investigación SDK Sunmi P2 (documentación, ejemplos, comandos ESC/POS) + creación de `sunmiPrinter.js` wrapper. (8-10 hs)
3. **FA.3** Templates de comprobantes (operador + cliente) en `receiptTemplates.js` con fuente grande/negrita en nombre de premio. (6-8 hs)
4. **FA.4** Integración con flujo de canje existente (auto-print al confirmar). (6-8 hs)
5. **FA.5** UI para reimpresión desde operador + lógica de máximo de reimpresiones. (4-6 hs)
6. **FA.6** `PrintingConfig.jsx` admin (auto-print por estación). (4-5 hs)
7. **FA.7** `PrintLogs.jsx` admin (visualización de logs). (3-4 hs)
8. **FA.8** Testing exhaustivo en POS Sunmi reales (múltiples dispositivos, escenarios de éxito y falla). (6-10 hs)
9. **FA.9** Build + commits + push. (1-2 hs)

#### 5.FA.7 Estimación

**Total: 42-59 horas. A 15-25 hs/sem = 2-3 semanas.**

#### 5.FA.8 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| SDK Sunmi no accesible desde WebView | Media | Alto | Investigar documentación oficial; fallback `window.print()` mejorado |
| Diferencias entre modelos de POS Sunmi | Media | Medio | Testing en TODOS los POS de las 3 estaciones |
| Comandos ESC/POS no se renderizan correctamente | Baja | Medio | Templates probados iterativamente con cada POS |
| Auto-print genera tickets duplicados accidentales | Baja | Alto | Lógica de idempotencia: una impresión por canje + N reimpresiones explícitas |
| Papel se acaba sin alerta | Alta | Bajo | Si la API de Sunmi expone el estado, mostrar alerta; si no, manejarlo por proceso operativo |

#### 5.FA.9 Criterios de "listo"

- Al confirmar un canje, los DOS comprobantes (operador + cliente) se imprimen automáticamente sin clics adicionales.
- El nombre del premio aparece en fuente grande y negrita.
- Si la impresión falla, el operador ve un botón "Reimprimir" claro.
- Cada impresión queda registrada en `print_logs` con su status.
- Admin puede desactivar el auto-print por estación si lo necesita.
- Admin puede consultar logs de impresión con filtros.
- Testing pasa en al menos 2 POS Sunmi reales (de estaciones distintas).

#### 5.FA.10 Dependencias

- F0 completada (los logs de impresión se integran con auditoría general).

---

### Fase F1 — Configurabilidad empresa + estaciones + precios + KPIs

#### 5.1.1 Objetivo

Eliminar todo hardcoding relacionado con empresa, estaciones y precios. Dejar al admin con control total.

#### 5.1.2 Alcance

**Entra:**
- Tabla `company` (single-row).
- Tabla `stations` reemplazando estaciones hardcoded.
- Toggle "precios globales" vs "precios por estación".
- Vistas admin para gestionar empresa, estaciones, precios.
- Dashboard admin con KPIs básicos.

**NO entra:**
- Multi-tenant.
- Branding visual avanzado.

#### 5.1.3 Estimación

61-78 horas. 3-5 semanas.

#### 5.1.4 Dependencias

F0 + FA completadas.

---

### Fase F2 — Mejoras programa de lealtad

#### 5.2.1 Objetivo

Implementar la estrategia comercial: multiplicador de puntos por tier, lavados gratis con control de fraude, QR de canje persistente universal, localizaciones configurables.

#### 5.2.2 Alcance

**Entra:**
- Multiplicador 1 / 1.2 / 1.5 por tier.
- Eventos especiales escalonados 25/50/75 pts.
- Lavado mensual gratis para PLATINO/BLACK en Turkaj 2 y 3.
- QR de canje persistente universal (canjes + lavados + rifa).
- Premio de rifa con plazo y estación configurables.
- Localizaciones de canje configurables.
- Tiendas asociadas gestionables.

**NO entra:**
- Descuentos porcentuales en tienda.
- Aceite/Revisión.

#### 5.2.3 Estimación

75-97 horas. 4-6 semanas.

#### 5.2.4 Dependencias

F0, FA, F1 completadas.

---

### Fase F3 — Rediseño visual del cliente + rebranding completo Puntos+

#### 5.3.1 Objetivo

Implementar el rediseño visual completo del cliente Y completar el rebranding a Puntos+.

#### 5.3.2 Alcance

**Entra:**

**Rediseño visual:**
- Nuevo home con layout del wireframe ejemplo1.
- Tarjeta de tier ocupando ancho completo.
- Carrusel de promociones editables por admin.
- Carrusel de vehículos del cliente (placeholder hasta F6).
- Tres iconos: WiFi, Encuesta, Ubicaciones.
- Dos historiales expandibles con navegación por mes.
- Nueva bottom navigation con QR central.

**Rebranding completo:**
- Reemplazo de "Club Turkaj +" por "Puntos+" en TODOS los strings del código.
- Nuevo logo de Puntos+ (será provisto antes del inicio de F3).
- Title del documento HTML, manifest.json de PWA, splash screen.
- **Disclaimer legal (D28)** en footer permanente + sección "Acerca de".
- Eliminación de cualquier referencia visual a Turkaj del branding del producto.
- Mantiene paleta de colores actual como base inspiracional.

**NO entra:**
- Rediseño de canjes, rifa, vehículos (esas vistas se rediseñan en sus respectivas fases).
- Cambio de URL/repo (se considera por separado, en su momento).
- Cambio de paleta principal (se mantiene la actual).

#### 5.3.3 Pre-requisitos

- **Logo de Puntos+** diseñado y disponible antes de iniciar F3.

#### 5.3.4 Estimación

95-120 horas. 5-7 semanas.

#### 5.3.5 Dependencias

F2 completada + logo de Puntos+ listo.

---

### Fase F4 — Tarjeta física + extensiones del operador

#### 5.4.1 Objetivo

Soportar clientes con tarjeta física como entidad separada. Construir flujos del operador.

#### 5.4.2 Alcance

**Entra:**
- Tabla `physical_card_members`.
- Registro de miembro físico desde admin/operador.
- Bloqueo de "miembro físico" no puede usar la app.
- Flujo de migración físico → app.
- Extensiones del operador para clientes físicos.

**NO entra:**
- Optimización de impresión POS (ya en FA).
- App separada para clientes físicos.
- NFC en tarjeta física.

#### 5.4.3 Estimación

50-70 horas. 3-4 semanas.

(Reducida respecto a v2.1 porque la optimización de impresión se movió a FA.)

#### 5.4.4 Dependencias

F2 completada.

---

### Fase F5 — Features faltantes

#### 5.5.1 Objetivo

Cerrar features que faltan: verificación de teléfono multicanal (WhatsApp + SMS), recuperación de password, dirección estructurada, confirmaciones críticas.

#### 5.5.2 Alcance

**Entra:**
- Integración Twilio (WhatsApp + SMS) orquestada desde Supabase Edge Functions.
- Verificación de teléfono al registrar.
- Recuperación de password.
- Dirección estructurada (Departamento, Municipio, Cantón).
- Modal de confirmación al comprar tickets de rifa.

#### 5.5.3 Estimación

56-73 horas. 2-3 semanas.

#### 5.5.4 Dependencias

F3 + gestiones Twilio/WhatsApp completadas.

---

### Fases F6, F7, F8, F9

Sin cambios respecto a v2.1. Ver versiones anteriores del documento para detalle si hace falta consultarlas.

- **F6 — Vehículos como entidad + alertas push:** 72-93 hs.
- **F7 — API REST + integración PROPER:** 55-74 hs.
- **F8 — Spike Club Business:** 1 semana.
- **F9 — Reportería enriquecida (opcional):** 40-55 hs.

---

## 6. Apéndice A: Spike de Club Business (detalle)

### 6.1 Preguntas que el spike debe responder

1. **Comercial:** ¿hay 3+ clientes con compromiso de pago en los próximos 6 meses?
2. **Técnica:** ¿la arquitectura se monta sobre la BD actual sin refactor grande?
3. **Financiera:** ¿el modelo de precio cubre costos en 12 meses?
4. **Operativa:** ¿hay capacidad de soporte para clientes B2B?

### 6.2 Criterios GO / NO-GO

**GO si:** 3+ clientes interesados con compromiso firmado + arquitectura factible + modelo financiero positivo.
**NO-GO o POSPONER:** falta cualquiera de los tres.

---

## 7. Apéndice B: Deuda técnica conocida

### 7.1 Deuda de código

| Item | Severidad | Cuándo |
|---|---|---|
| `App.jsx` con 1591 líneas (medido junio 2026) — refactor a componentes más pequeños | Media | F3 |
| Credenciales de admins NO migradas a BD | Media | F1 |
| `OpRedeem.jsx` sin cablear al nuevo flujo de QR | Alta | F2 |
| `updateConfig` en `dataService.js` como código zombie | Baja | F7 |
| Warning de chunk size >500KB | Baja | Cuando bundle pase 1MB |
| Service Worker error con chrome-extension scheme | Cosmético | Ignorable |
| Sistema de push notifications con delivery inconsistente | Media | F5/F6 |
| Tests automatizados inexistentes | Alta | Después de F5 |
| **Botón "Compra" en MemberDetail.jsx:182 setea `modal='buy'` pero ningún componente lo renderiza (código zombie)** | Media | F2 o F4 |
| **Botón "Nuevo" en Members.jsx:55 y AdminDash.jsx:73 setean `modal='newC'` pero ningún componente lo renderiza** | Media | F2 o F4 |
| **Editar `gallons` manualmente NO actualiza `physical_cards.card_code` prefix (queda desincronizado con tier)** | Alta | F2 (cuando se rediseñe lógica de tier) |
| **Ediciones de admin sobre miembros NO se reflejan en `activity_log` del cliente** | Media | F2 (cuando se rediseñe activity_log) |
| **Sin manejo explícito de error UNIQUE en `dpi`/`phone` al editar miembro (solo console.error)** | Baja | F2 |
| **Infraestructura parcial de referidos en BD (`members.referral_count`, `referred_by`, `referral_bonus_paid`) sin lógica completa** | Baja | Cuando se priorice sistema de referidos |
| **`saving` useState en GoogleProfile.jsx:252 fuera del bloque agrupado** | Baja | F3 cuando se rediseñe |
| **Falta ESLint con regla `react-hooks/rules-of-hooks`** (habría detectado el bug P0 antes de producción) | Media | Antes de F1 idealmente |
| **`toggle_operator_active` es mutación directa, no RPC (`OpManagement.jsx:138`)** — no auditable server-side | Media | F0.3.5 (client-first logging) |
| **`update_operator` (editar operador) es mutación directa (`OpManagement.jsx:77`)** — no auditable server-side | Media | F0.3.5 (client-first logging) |
| **`reset_operator_password` no existe como RPC separado; entrada huérfana en lista sensible de `log_admin_action`** | Baja | Diferida (revisar en F2+) |
| **`members.points` modificable sin auditoría — caso ángel macario +21 pts (diagnóstico 19 queries)** | Alta | FB completa |

### 7.2 Deuda operacional

| Gestión | Inicio recomendado | Crítica para |
|---|---|---|
| Cuenta Twilio Business | Semana 1 | F5 |
| Aprobación WhatsApp Business via Twilio | Semana 1 | F5 |
| Plantillas WhatsApp pre-aprobadas (mínimo 2) | Semana 2 | F5 |
| Política de privacidad publicada | Semana 1 | F5 |
| Logo de empresa para WhatsApp Business | Semana 1 | F5 |
| **Logo de Puntos+ diseñado** | Antes de F3 | F3 |
| Coordinación técnica con PROPER | Semana ~22 | F7 |
| Cuenta Apple Developer ($99/año) | Cuando se decida app nativa | Post-roadmap |
| Cuenta Google Play ($25 una vez) | Cuando se decida app nativa | Post-roadmap |

---

## 8. Apéndice C: Lo que NO está en este roadmap

### 8.1 Definitivamente fuera

- Multi-tenant SaaS.
- Integración con OBD-II o telemetría real de vehículos.
- API de fabricantes de autos.
- Sistema de cupones porcentuales en tienda (descuentos 5%/10%).
- Aceite/Revisión gratis para BLACK.
- Web pública para consulta de saldo de clientes físicos.
- Gamificación (badges, niveles dentro de tier, etc.).
- Integración con redes sociales.
- Chatbot.
- Marketing automation (drip campaigns).
- A/B testing infrastructure.
- Internacionalización (i18n).
- Tema oscuro/claro selectable.
- 2FA para admins.
- Backups automatizados a S3.
- CDN propio.
- Notificaciones promocionales por WhatsApp (requiere consentimiento explícito).
- Impresión al acumular puntos.
- Fallback digital con QR en pantalla (al fallar impresión).
- Firma del cliente en comprobantes impresos.

### 8.2 Candidatos post-roadmap

**App nativa iOS y Android**
- Estado: pendiente de decisión técnica y de timing.
- Estrategias evaluadas: Capacitor (~95% reuso, 2-4 sem) vs React Native (~30% reuso, 8-12 sem).
- Solo aplica a vista del cliente.
- Trigger sugerido: PWA estable por 3+ meses con métricas que justifiquen.

**Sistema de referidos**
- Cliente A invita a B; ambos reciben puntos al confirmarse el registro.
- Esfuerzo: 2-3 semanas (~30-45 horas).
- Requiere F5 completada.
- **Nota:** la BD ya tiene infraestructura parcial (`referral_count`, `referred_by`, `referral_bonus_paid`) sin lógica completa. Cuando se priorice, hay base existente.

**Cambio de URL y nombre de repo**
- `club-turkaj.vercel.app` → posible `puntos-plus.vercel.app` o similar.
- Renombrar repo de GitHub.
- Cuándo: después de F3 (cuando el rebranding visual esté completo).
- Esfuerzo: 1-2 horas + actualización de referencias externas.

---

## 9. Apéndice D: Análisis del PDF estratégico

### 9.1 Lo incorporado

| Item del PDF | Dónde se implementa |
|---|---|
| 3 niveles ORO/PLATINO/BLACK | YA existe (F0 baseline) |
| Multiplicador 1 / 1.2 / 1.5 pts por Q10 | F2 |
| Eventos especiales 25 / 50 / 75 pts | F2 |
| WiFi ilimitado PLATINO/BLACK | F3 |
| 1 Lavado mensual para PLATINO/BLACK | F2 (Turkaj 2 y 3) |
| Control de fraude QR único (universal) | F2 (todo premio) |
| Reglas de degradación por inactividad | YA existe |
| Notificaciones push automáticas al día 10 | F5 |
| Estrategia de salvataje | YA existe |

### 9.2 Lo descartado

| Item del PDF | Motivo |
|---|---|
| Descuento 5% / 10% en tienda | Requiere integración con TPV de tiendas |
| 1 Aceite/Revisión para BLACK | Sin instalaciones ni personal |
| Cambio de aceite patrocinado | Decisión comercial pendiente |
| Métricas financieras (Q116 retorno neto) | F9 opcional |

---

## 10. Apéndice E: Cómo evolucionar este documento

### 10.1 Eventos que disparan actualización

- **Cierre de fase:** marcar como completada. Mover items a changelog.
- **Cambio de decisión:** anotar en sección 2 con fecha.
- **Riesgo materializado:** mover a "incidentes resueltos" con learnings.
- **Nueva deuda técnica:** agregar a apéndice B.
- **Nueva feature propuesta:** evaluar dónde encaja.

### 10.2 Revisiones programadas

- Cada fin de fase: revisión completa.
- Cada 3 meses: revisión de prioridades.
- Antes de cada Q comercial: alinear con negocio.

### 10.3 Versionado

Cambios mayores van en commits separados con mensaje `docs: actualizar ROADMAP — {motivo}`.

---

## Changelog

### Versión 2.3 — 13 de junio de 2026

- **AGREGADA fase FB:** Integridad y Trazabilidad de Puntos. Ubicada entre F0 y FA. Estimación 16-26 horas. Motivada por diagnóstico documentado del caso ángel macario (+21 puntos sin trazabilidad).
- **AGREGADA documentación de 4 nuevos ítems de deuda técnica** (`toggle_operator_active`, `update_operator`, `reset_operator_password`, `members.points` sin auditoría).
- **CORREGIDO conteo de acciones sensibles:** 15 → 16 (incluye `update_raffle` que se agregó durante F0.2).
- **CORREGIDO conteo de App.jsx:** 1583 → 1591 líneas.
- **MARCADAS como completadas** las sub-fases F0.3.1, F0.3.1.5, F0.3.2, F0.3.3, F0.3.4 con sus commits respectivos.
- Estimación total del proyecto actualizada (suma 16-26 hs / 3-5 sem de FB): 33-49 semanas.

### Versión 2.2 — 30 de mayo de 2026
**Cambios estratégicos:**
- **Cambio de identidad del producto:** "Club Turkaj +" → **"Puntos+"**. Puntos+ es la plataforma independiente; Turkaj es su primer cliente. Esta separación tiene implicaciones legales (frente a Shell Guatemala), comerciales (futuros clientes) y arquitectónicas (eliminación de hardcoding de Turkaj en visuales).
- D2 reescrita: "Naming dinámico" → "Nombre fijo Puntos+".
- **D28 nueva:** disclaimer legal obligatorio en footer permanente + sección "Acerca de".
- **D29 nueva:** doble comprobante al canjear (operador + cliente), sin firmas, con nombre del premio en fuente grande/negrita, con reimpresión bajo demanda en lugar de fallback digital.
- D26 actualizada con hallazgo de infraestructura parcial de referidos en BD.

**Cambios estructurales:**
- **FA nueva fase:** Optimización de impresión POS Sunmi P2. Entre F0 y F1. Esfuerzo: 42-59 hs. Promocionada a fase propia por su prioridad para hacer el producto útil desde ya.
- F3 expandida: absorbe rebranding completo a Puntos+ (logo, eliminación referencias Turkaj, disclaimer, manifest, splash).
- F4 reducida: sin sub-objetivo de impresión (ya está en FA).

**Hallazgos de deuda técnica nueva (sección 7.1):**
- Botones zombie en MemberDetail.jsx, Members.jsx, AdminDash.jsx (setean modal sin renderer).
- Editar `gallons` no actualiza `physical_cards.card_code` prefix.
- Ediciones de admin invisibles en `activity_log` del cliente.
- Sin manejo de error UNIQUE en dpi/phone.
- Infraestructura parcial de referidos en BD.
- `saving` useState fuera de orden en GoogleProfile.jsx.
- Falta ESLint con regla react-hooks/rules-of-hooks.

**Otros cambios:**
- Sección 1 reorganizada con identidad de Puntos+ como plataforma.
- Sección 4.1 actualizada con estado de fases (P0 ✅, F0 ⏳, FA próxima).
- Apéndice C agrega "Cambio de URL y nombre de repo" como candidato post-roadmap.
- Estimación total actualizada: 30-44 semanas (era 29-43).

### Versión 2.1 — 17 de mayo de 2026
**Cambios respecto a v2.0:**
- D27 nueva: verificación de teléfono multicanal (WhatsApp + SMS fallback) via Twilio orquestado desde Supabase.
- F5 reescrita completamente.
- Sección 3.5 nueva sobre gestiones administrativas en paralelo.
- Apéndice B reorganizado en "código" y "operacional".

### Versión 2.0 — 17 de mayo de 2026
- P0 agregado.
- D22-D26 nuevas.
- F2 expandida (QR universal).
- F4 con sub-objetivo de impresión.
- F6 con catálogo completo y alertas push.
- Apéndice C reorganizado.

### Versión 1.0 — 17 de mayo de 2026
- Documento inicial creado tras sesión de planificación.
- 10 fases (F0-F9).
- 21 decisiones de producto documentadas.

---

**Fin del documento.**
