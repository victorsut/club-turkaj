# Club Turkaj + — Roadmap de Producto

> **Versión:** 2.1
> **Fecha de creación:** 17 de mayo de 2026
> **Última actualización:** 17 de mayo de 2026
> **Estado:** Vivo (este documento evoluciona con el proyecto)

---

## 0. Sobre este documento

### 0.1 Propósito

Este documento es el plan maestro de evolución de Club Turkaj +. Define qué se va a construir, en qué orden, con qué alcance, y por qué. No es un cronograma de plazos fijos sino un mapa de prioridades técnicas con estimaciones de esfuerzo razonables.

### 0.2 Cómo leerlo

- **Si tenés 5 minutos:** lee la sección 1 (Visión) y la sección 4 (Mapa general de fases).
- **Si tenés 30 minutos:** lee todo el documento de corrido.
- **Si vas a trabajar en una fase específica:** salta directo a la sección 5 con el número de fase que corresponda.
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

### 1.1 Qué es Club Turkaj + hoy

Club Turkaj + es una Progressive Web App (PWA) de programa de lealtad para gasolineras Turkaj I, II, III en Chichicastenango, Guatemala. Permite a clientes acumular puntos por consumo de combustible, canjear premios, participar en rifas mensuales y completar encuestas.

**Stack técnico actual:**
- Frontend: React 18.3.1 + Vite 6.4.2 (JSX, sin TypeScript)
- Backend: Supabase (PostgreSQL + RLS + Realtime + Edge Functions)
- Deploy: Vercel con autodeploy desde `main`
- Push notifications: Web Push API con VAPID
- Auth cliente: Google OAuth via Supabase Auth
- Auth admin/operador: RPCs propios con bcrypt server-side
- POS de operadores: Sunmi P2 (Android con impresora térmica integrada)

**Modelo de negocio actual:**
- Q10 = 1 punto (acumulación lineal sin tier)
- 3 tiers (ORO/PLATINO/BLACK) basados en galones acumulados
- Sistema de degradación por inactividad por tier
- Encuestas con boleto de rifa al completar 5/día
- Rifa mensual con premio configurable

**Estado de salud:** funcional en producción con ~27 miembros, 19 operadores activos, 38 entradas de rifa en circulación.

### 1.2 Qué será al completar este roadmap

Club Turkaj + será una plataforma de lealtad configurable que:

1. **Es configurable por empresa** (Turkaj hoy, otra empresa mañana sin tocar código).
2. **Implementa la estrategia comercial completa** del documento estratégico: multiplicador de puntos por tier, lavados gratis, eventos especiales diferenciados.
3. **Aplica QR único con control de fraude a TODO premio canjeable** incluyendo canjes regulares, lavados mensuales gratis, y premios de rifa.
4. **Tiene rediseño visual** que prioriza claridad, vehículos del cliente, y acceso rápido a beneficios.
5. **Soporta dos canales de identidad**: cuenta digital (app) y tarjeta física (operador-asistido).
6. **Expone API REST** consumible por sistemas de facturación externos (PROPER) y otros canales futuros.
7. **Trackea vehículos del cliente** como entidad de primera clase con telemetría manual y alertas push de servicios.
8. **Audita acciones de admin** con before/after para trazabilidad completa.
9. **Cubre features faltantes**: verificación de teléfono multicanal (WhatsApp + SMS fallback), recuperación de password, dirección estructurada, confirmaciones críticas.
10. **Optimiza flujo de impresión** en POS Sunmi P2 para canjes en pista y tienda.

### 1.3 Cambios fundamentales respecto al estado actual

| Aspecto | Hoy | Al completar el roadmap |
|---|---|---|
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
| Impresión POS | Lenta e inestable | Optimizada con SDK Sunmi nativo |
| Verificación de teléfono | No existe | WhatsApp primario + SMS fallback (Twilio) |

---

## 2. Decisiones de producto tomadas

Esta sección documenta las decisiones tomadas durante la conversación de planificación del 17 de mayo de 2026. Cada decisión incluye motivo para que se entienda por qué se eligió así.

### D1 — NO multi-tenant
**Decisión:** una sola empresa por instancia de la app.
**Motivo:** simplifica enormemente arquitectura (schemas, auth, billing). Si en el futuro se quiere multi-tenant, se hace como producto separado.

### D2 — Naming dinámico
**Decisión:** el nombre de la app se compone como "Club {empresa} +" donde `{empresa}` viene de configuración en BD.
**Motivo:** permite cambiar branding sin redeploy. Útil si Turkaj cambia de nombre comercial o si se vende la plataforma a otra empresa.

### D3 — N estaciones configurables
**Decisión:** desde admin se pueden agregar/editar/eliminar estaciones (no limitado a 3).
**Motivo:** soporta crecimiento del negocio. Hoy son 3 estaciones, mañana pueden ser 5 o 10.

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

### D9 — API REST expuesta por Club Turkaj +
**Decisión:** Club Turkaj + expone API, PROPER (sistema de facturación) la consume.
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
**Decisión:** rediseño basado en mockup de inspiración y wireframe ejemplo1.
**Motivo:** UI actual cumple pero no destaca. Nuevo diseño prioriza claridad y branding.

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
**Motivo:** evita ambigüedad sobre dónde y cuándo reclamar premios. Configurable porque las reglas pueden cambiar (ejemplo: cambiar la estación de retiro si Turkaj 1 cierra por reformas).

### D23 — Catálogo de vehículos híbrido
**Decisión:** catálogo de marcas y modelos pre-cargado con opciones comunes en Guatemala. Cliente puede escribir custom_brand/custom_model si no encuentra el suyo. Admin promociona customs a oficial periódicamente.
**Motivo:** balance entre completitud y flexibilidad. No requiere mantenimiento externo de catálogo.

### D24 — Alertas push de servicios con umbrales globales
**Decisión:** alertas de servicios pendientes con umbrales configurados globalmente por admin (ejemplo: 7 días o 500 km antes). Cliente puede silenciar alertas por vehículo individualmente.
**Motivo:** simplicidad operativa. Umbrales granulares por cliente añaden complejidad sin valor proporcional.

### D25 — App nativa: decisión técnica diferida
**Decisión:** la migración a app nativa para iOS y Android es candidato post-roadmap. Tecnología (Capacitor vs React Native) se decide cuando se inicie esa fase, basado en datos de uso real de la PWA.
**Motivo:** prematuro decidir sin información de uso. El roadmap actual prioriza estabilización y features. La app nativa NO entra como F11/F12 al roadmap principal.

### D26 — Sistema de referidos diferido
**Decisión:** sistema de referidos (puntos para quien refiere y quien acepta invitación) queda fuera del roadmap actual.
**Motivo:** prioridad menor que features core. Documentado en Apéndice C para considerar a futuro.

### D27 — Verificación de teléfono multicanal: WhatsApp primario + SMS fallback
**Decisión:** la verificación de teléfono usa Twilio como proveedor único, con dos canales: WhatsApp Business API como canal primario (más barato, mejor tasa de entrega en Guatemala) y SMS como fallback automático si WhatsApp falla o el cliente no tiene WhatsApp activo. Toda la orquestación se hace desde Supabase Edge Functions para mantener el stack unificado.
**Motivo:** WhatsApp tiene 80-90% penetración en Guatemala, mejor tasa de entrega (no depende de filtros de Tigo/Claro), y costo 5-10x menor que SMS. Twilio gestiona ambos canales con la misma API. SMS sigue siendo necesario para clientes edge que no usan WhatsApp. Supabase como orquestador mantiene la arquitectura simple sin agregar Firebase u otros providers de auth.
**Implementación:**
- Edge Functions de Supabase llaman a Twilio API.
- Plantillas pre-aprobadas por Meta para mensajes transaccionales.
- Lógica: intentar WhatsApp primero; si Twilio responde "no entregado" o "no es número de WhatsApp", fallback a SMS automático.
- Mismo código de verificación válido por ambos canales por 10 minutos.
**Costo estimado:** $2-5 USD/mes recurrente (incluyendo número virtual + ~100 verificaciones/mes con distribución típica WhatsApp/SMS).

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

Algunas gestiones operacionales requieren tiempo de aprobación de terceros y deben iniciarse en paralelo al desarrollo, no esperar a su fase correspondiente:

| Gestión | Inicio recomendado | Duración estimada | Fase que la requiere |
|---|---|---|---|
| Cuenta Twilio Business | Semana 1 | 1-2 días | F5 |
| Aprobación WhatsApp Business via Twilio (Meta) | Semana 1 | 1-4 semanas | F5 |
| Plantillas WhatsApp pre-aprobadas | Semana 2 (post-aprobación cuenta) | 2-7 días por plantilla | F5 |
| Coordinación técnica con PROPER | Semana 20 | 2-4 semanas | F7 |

### 3.6 Implicaciones para el roadmap

A 15-25 horas semanales, el alcance total estimado es de **7 a 10 meses calendario**. Este es un alcance ambicioso para una sola persona. La estrategia de mitigación es:

1. **Priorización agresiva**: F0-F5 son fundamentos, F6-F9 son extensiones.
2. **Fases entregables**: cada fase termina con código en producción funcional, no a medias.
3. **Pausas estratégicas**: entre fases, semana de testing y observación de uso real.
4. **Gestiones administrativas paralelas**: iniciar trámites externos desde semana 1.

---

## P0 — Tarea pre-roadmap: Bug-fix urgente

Antes de arrancar F0, hay un bug crítico en producción que se debe resolver fuera de cualquier fase numerada.

### P0.1 Descripción del bug

**Síntoma:** al completar la primera etapa del registro de cuenta nueva y avanzar a la segunda etapa (después de completar datos personales), la pantalla queda en blanco.

**Observaciones:**
- Ocurre en todos los navegadores (Chrome móvil, Safari iOS, Chrome desktop).
- Es 100% reproducible al avanzar a la segunda etapa.
- Hay errores en consola: `Uncaught Error: Minified React error #300`.
- Stack trace minificado en `react-Dvwkxfce.js`.

### P0.2 Diagnóstico técnico preliminar

El error React #300 significa: *"Element type is invalid: expected a string or a class/function but got: undefined."*

**Causa probable:** un componente JSX está intentando renderizar `<undefined />`. Las causas más comunes:
1. Import incorrecto (named vs default).
2. Path del componente roto.
3. Componente condicional sin guard.

### P0.3 Plan de resolución

1. Reproducir en `npm run dev` (no producción) para obtener stack trace sin minificar.
2. Identificar el componente exacto que está rompiendo.
3. Aplicar fix.
4. Testing local del flujo completo de registro.
5. Commit como `fix: pantalla blanca en segunda etapa de registro`.
6. Push a `main`.

### P0.4 Esfuerzo estimado

1-3 horas.

### P0.5 Prioridad

**Máxima.** Este bug está perdiendo registros nuevos en producción. Se resuelve antes de F0.

---

## 4. Mapa general de fases

### 4.1 Tabla resumen

| Fase | Bloque | Esfuerzo | Calendario | Prioridad |
|---|---|---|---|---|
| P0 | Bug-fix pantalla blanca en registro | 1-3 hs | Antes de F0 | Crítica |
| F0 | Setup de auditoría Nivel 2 | 1-2 sem | Sem 1-2 | Crítico |
| F1 | Configurabilidad de empresa + estaciones + precios + KPIs básicos | 3-5 sem | Sem 3-7 | Crítico |
| F2 | Mejoras de programa de lealtad (multiplicador, lavados, QR universal con rifa, localizaciones) | 4-6 sem | Sem 8-13 | Crítico |
| F3 | Rediseño visual del cliente | 5-7 sem | Sem 14-20 | Alta |
| F4 | Tarjeta física + extensiones del operador + optimización impresión POS Sunmi | 4-6 sem | Sem 21-26 | Alta |
| F5 | Features faltantes (Verificación WhatsApp+SMS, password recovery, dirección, confirmaciones) | 2-3 sem | Sem 27-29 | Media |
| F6 | Vehículos como entidad + catálogo completo + alertas push | 3-5 sem | Sem 30-34 | Media |
| F7 | API REST pública + integración PROPER | 3-5 sem | Sem 35-39 | Media |
| F8 | Spike Club Business (investigación) | 1 sem | Sem 40 | Baja |
| F9 | Reportería de negocio enriquecida (opcional) | 2-3 sem | Sem 41-43 | Opcional |

**Total estimado:** 29-43 semanas calendario (≈7-10 meses).

### 4.2 Diagrama de dependencias

```
P0 (Bug-fix) ──► F0 (Auditoría) ──┐
                                  ├──► F1 (Empresa) ──► F2 (Lealtad) ──► F3 (Visual)
                                  │                                          │
                                  │                                          ├──► F4 (Tarjeta + Impresión) ──► F7 (API/PROPER)
                                  │                                          │
                                  └──────────────────────────────────────────┴──► F5 (Features) ──► F6 (Vehículos)
                                                                                                          │
                                                                                                          └──► F8 (Spike Business)
                                                                                                                  │
                                                                                                                  └──► F9 (Reportería)
```

### 4.3 Gestiones paralelas

```
Semana 1 ──► Iniciar cuenta Twilio + WhatsApp Business
Semana 1-5 ──► Aprobación Meta (en background)
Semana 20 ──► Coordinación técnica con PROPER (en background)
```

**Lectura del diagrama:**
- P0 es prerequisito de todo.
- F0 es base de todo (auditoría se usa en cada admin action).
- F1 desbloquea F2 y F3.
- F2 desbloquea F3.
- F7 depende de F4.
- F8 y F9 son finales y opcionales.
- **Las gestiones administrativas (Twilio + WhatsApp Business) deben iniciarse en semana 1** para que estén listas cuando llegue F5.

---

## 5. Detalle por fase

### Fase F0 — Setup de auditoría Nivel 2

#### 5.0.1 Objetivo

Implementar el sistema de auditoría que va a registrar todas las acciones de admin antes de que se agreguen funciones admin nuevas. Esto evita retrabajo en cada fase posterior.

#### 5.0.2 Alcance

**Entra:**
- Tabla `admin_audit_log` con campos: id, admin_id, timestamp, action_type, target_table, target_id, before_value (jsonb), after_value (jsonb), reason_text, ip_address (opcional).
- Trigger o RPC wrapper que captura before/after automáticamente al modificar tablas críticas.
- Vista admin para consultar log filtrable por: admin, fecha, tipo de acción, tabla afectada.
- Tablas críticas a auditar inicialmente: `members`, `operators`, `physical_cards`, `program_config`, `rewards`.
- Helper en `dataService.js` o `rpcServices.js` para invocar el log desde el cliente.

**NO entra:**
- Rollback de cambios (Nivel 3).
- Auditoría de acciones del cliente (solo admin).
- Reportes exportables del log (Excel, PDF).
- Notificaciones automáticas por acciones sospechosas.

#### 5.0.3 Cambios de BD

**Tablas nuevas:**
```sql
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  action_type text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  before_value jsonb,
  after_value jsonb,
  reason_text text,
  ip_address inet
);

CREATE INDEX idx_audit_admin ON admin_audit_log(admin_id, timestamp DESC);
CREATE INDEX idx_audit_target ON admin_audit_log(target_table, target_id, timestamp DESC);
CREATE INDEX idx_audit_action ON admin_audit_log(action_type, timestamp DESC);
```

**RPCs nuevos:**
- `log_admin_action(p_admin_id uuid, p_action text, p_target_table text, p_target_id uuid, p_before jsonb, p_after jsonb, p_reason text)` con SECURITY DEFINER.

**Modificaciones:**
- Cada RPC de modificación que ya existe (`update_fuel_prices`, `create_operator`, etc.) debe llamar internamente a `log_admin_action`.

#### 5.0.4 Cambios de cliente

**Vistas nuevas:**
- `src/views/admin/AuditLog.jsx`: tabla paginada con filtros.

**Modificaciones:**
- Todas las acciones de admin (editar miembro, editar precios, etc.) deben recibir un campo `reason_text` antes de ejecutar.
- Modal de "Confirmar cambio" con textarea para el motivo, antes de guardar.

#### 5.0.5 Sub-fases para Claude Code

1. **F0.1** Diseñar schema de `admin_audit_log` y crear migration SQL.
2. **F0.2** Crear RPC `log_admin_action` con SECURITY DEFINER.
3. **F0.3** Modificar RPCs existentes para que registren en el log (empezar con `update_fuel_prices`).
4. **F0.4** Crear `AuditLog.jsx` con tabla paginada + filtros.
5. **F0.5** Agregar modal de "motivo del cambio" a las operaciones de edición existentes.
6. **F0.6** Build + commits + push.
7. **F0.7** Testing en producción con escenarios reales.

#### 5.0.6 Estimación de esfuerzo

- F0.1: 2-3 horas.
- F0.2: 2-3 horas.
- F0.3: 4-5 horas.
- F0.4: 8-10 horas.
- F0.5: 4-6 horas.
- F0.6: 1 hora.
- F0.7: 2-3 horas.

**Total: 23-31 horas. A 15-25 hs/sem = 1-2 semanas.**

#### 5.0.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Performance impact al loggear cada acción | Baja | Bajo | Tabla con índices, escritura async eventual |
| Log se llena demasiado rápido | Media | Bajo | Política de retención (eliminar > 1 año) en F-futuro |
| Falta de "reason_text" frustra a admins en uso diario | Media | Medio | UX clara, sugerir motivos comunes con quick-select |

#### 5.0.8 Criterios de "listo"

- Tabla `admin_audit_log` existe en producción con índices.
- RPC `log_admin_action` funciona y está testado.
- Al editar precios de combustible, el cambio queda registrado en el log con before/after.
- Vista `AuditLog.jsx` lista las entradas con filtros funcionales.
- Modal de "motivo" aparece antes de cada edición crítica.

#### 5.0.9 Dependencias

- P0 (bug-fix de pantalla blanca) completado.

---

### Fase F1 — Configurabilidad de empresa + estaciones + precios + KPIs básicos

#### 5.1.1 Objetivo

Eliminar todo hardcoding relacionado con empresa, estaciones y precios. Dejar al admin con control total sobre estos datos. Agregar dashboard con KPIs básicos.

#### 5.1.2 Alcance

**Entra:**
- Tabla `company` (single-row) con nombre, logo, configuración general.
- Tabla `stations` reemplazando estaciones hardcoded.
- Tabla `station_products` o columna en `stations` para productos disponibles por estación.
- Toggle "precios globales" vs "precios por estación".
- Vista admin para editar empresa.
- Vista admin para CRUD de estaciones.
- Vista admin para gestionar precios (extiende Settings actual).
- Naming dinámico en frontend: "Club {company.name} +".
- Dashboard admin con KPIs: total miembros por tier, puntos en circulación, canjes del mes, top 10 miembros, compras del mes.

**NO entra:**
- Multi-tenant.
- Configuración de imágenes/colores (branding visual avanzado).
- Gestión de productos como entidad separada (los 3 fuels siguen siendo super/regular/diesel).
- Reportes exportables.

#### 5.1.3 Cambios de BD

**Tablas nuevas:**
```sql
CREATE TABLE public.company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  logo_url text,
  contact_email text,
  contact_phone text,
  prices_mode text NOT NULL DEFAULT 'global',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude numeric,
  longitude numeric,
  has_carwash boolean DEFAULT false,
  has_store boolean DEFAULT false,
  active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.station_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id),
  fuel_type text NOT NULL CHECK (fuel_type IN ('super', 'regular', 'diesel')),
  price numeric(5,2) NOT NULL CHECK (price > 0 AND price <= 100),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(station_id, fuel_type)
);
```

**RPCs nuevos:**
- `update_company(p_data jsonb)` con SECURITY DEFINER + auditoría.
- `create_station(p_data jsonb)`, `update_station(p_id uuid, p_data jsonb)`, `delete_station(p_id uuid)`.
- `set_prices_mode(p_mode text)` toggle global/per_station.
- `update_station_price(p_station_id uuid, p_fuel text, p_price numeric)`.

**Modificación de `register_purchase`:**
- Si `prices_mode='global'`: lee de `program_config.fuel_prices` (como hoy).
- Si `prices_mode='per_station'`: lee de `station_prices` filtrando por `p_station_id`.

#### 5.1.4 Cambios de cliente

**Vistas nuevas:**
- `src/views/admin/CompanyConfig.jsx`: editar datos de empresa.
- `src/views/admin/StationsManagement.jsx`: CRUD de estaciones.
- Extensión de `Settings.jsx`: toggle global/per-station + UI condicional.
- Extensión de `AdminDash.jsx`: KPIs básicos.

**Modificaciones:**
- Frontend lee `company.name` de BD y arma "Club {name} +" dinámicamente.
- Hooks de carga inicial incluyen company y stations.
- Selector de estación en formularios de operador usa `stations` dinámica, no hardcoded.

#### 5.1.5 Sub-fases para Claude Code

1. **F1.1** Crear tabla `company` (single row inicial con "Turkaj") + migration.
2. **F1.2** Crear tabla `stations` + migración de datos actuales hardcoded.
3. **F1.3** Crear tabla `station_prices` + RPC `update_station_price`.
4. **F1.4** Modificar `register_purchase` para soportar ambos modos.
5. **F1.5** Crear RPCs: `update_company`, CRUD stations, `set_prices_mode`.
6. **F1.6** Hidratar `cfg.company`, `cfg.stations` en hooks de carga inicial.
7. **F1.7** Crear `CompanyConfig.jsx`.
8. **F1.8** Crear `StationsManagement.jsx`.
9. **F1.9** Extender `Settings.jsx` con toggle de modo y precios por estación.
10. **F1.10** Reemplazar "Club Turkaj +" hardcoded por dinámico (en App.jsx, ClientHome, etc.).
11. **F1.11** Extender `AdminDash.jsx` con KPIs básicos.
12. **F1.12** Build + commits + push + testing.

#### 5.1.6 Estimación de esfuerzo

- F1.1-F1.3: 6-8 horas.
- F1.4: 4-5 horas.
- F1.5: 6-8 horas.
- F1.6: 3-4 horas.
- F1.7: 6-8 horas.
- F1.8: 10-12 horas.
- F1.9: 8-10 horas.
- F1.10: 3-4 horas.
- F1.11: 12-15 horas.
- F1.12: 3-4 horas.

**Total: 61-78 horas. A 15-25 hs/sem = 3-5 semanas.**

#### 5.1.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migration de stations actuales pierde datos | Baja | Alto | Backup BD antes de migration, script verificable |
| Cambio en `register_purchase` rompe flujo en producción | Media | Alto | Testing exhaustivo en local + smoke test post-deploy |
| KPIs queries lentas con muchos datos | Baja | Medio | Índices apropiados, vistas materializadas si hace falta |
| Operadores con la app abierta no ven nuevas estaciones | Media | Bajo | Forzar reload cuando cambia stations (realtime sub) |

#### 5.1.8 Criterios de "listo"

- Admin puede editar nombre de empresa y se refleja en frontend.
- Admin puede agregar/editar/eliminar estaciones.
- Toggle de precios funciona y se respeta en `register_purchase`.
- Dashboard admin muestra KPIs en tiempo real.
- Cero hardcoding de "Turkaj" o "Turkaj I/II/III" en código.

#### 5.1.9 Dependencias

- F0 (auditoría) completada.

---

### Fase F2 — Mejoras de programa de lealtad

#### 5.2.1 Objetivo

Implementar la estrategia comercial del PDF: multiplicador de puntos por tier, lavados gratis con control de fraude, QR de canje persistente universal (incluyendo rifa), y localizaciones configurables.

#### 5.2.2 Alcance

**Entra:**
- Multiplicador de puntos por tier en `register_purchase`: ORO 1x, PLATINO 1.2x, BLACK 1.5x.
- Eventos especiales escalonados: 25 / 50 / 75 pts según tier.
- Nuevo tipo de canje "Lavado mensual" para PLATINO/BLACK con cuota mensual (1 por mes).
- QR de canje persistente universal: aplica a canjes regulares, lavados mensuales, y premios de rifa.
- Premio de rifa con reglas configurables: plazo (default 15 días) y estación de retiro (default Turkaj 1).
- Sistema de localización de canjes: cada reward con N localizaciones (estaciones o tiendas).
- Tabla `partner_stores` para tiendas asociadas (Betel, Súper 24, etc.).
- Vista admin para gestionar tiendas asociadas.
- Vista admin para configurar localización de cada reward.
- Vista admin para configurar plazo y estación de retiro de rifa.
- Operador puede ver y validar QR de canje al escanear.
- Cron mensual para marcar premios de rifa expirados.

**NO entra:**
- Descuentos porcentuales en tienda (5%/10%).
- Aceite/Revisión (D16).
- Cambio dinámico de multiplicadores por tier (queda hardcoded en BD por ahora).
- Política automática de qué hacer con premio de rifa expirado (queda como decisión manual del admin).

#### 5.2.3 Cambios de BD

**Tablas nuevas:**
```sql
CREATE TABLE public.partner_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  station_id uuid REFERENCES stations(id),
  address text,
  active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.reward_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL REFERENCES rewards(id),
  location_type text NOT NULL CHECK (location_type IN ('station', 'partner_store')),
  location_id uuid NOT NULL,
  active boolean DEFAULT true,
  UNIQUE(reward_id, location_type, location_id)
);

CREATE TABLE public.redemption_qrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id),
  reward_id uuid REFERENCES rewards(id),
  qr_type text NOT NULL CHECK (qr_type IN ('standard_redemption', 'monthly_carwash', 'raffle_prize')),
  qr_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  consumed_at timestamptz,
  consumed_by_operator_id uuid REFERENCES operators(id),
  consumed_at_location_type text,
  consumed_at_location_id uuid,
  state text DEFAULT 'active'
);

CREATE TABLE public.monthly_carwash_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id),
  month int NOT NULL,
  year int NOT NULL,
  granted_at timestamptz DEFAULT now(),
  consumed_at timestamptz,
  consumed_qr_id uuid REFERENCES redemption_qrs(id),
  UNIQUE(member_id, month, year)
);
```

**Configuración en program_config:**
- Nueva clave `raffle_redemption` con JSONB: `{redemption_days: 15, redemption_station_id: "uuid-de-turkaj-1"}`.

**Modificaciones a tablas existentes:**
- `rewards`: agregar columna `reward_type` ('points_based' | 'monthly_grant' | 'raffle_prize').

**RPCs nuevos:**
- `create_redemption_qr(p_member_id uuid, p_reward_id uuid, p_qr_type text)`.
- `validate_and_consume_qr(p_qr_code text, p_operator_id uuid, p_location_type text, p_location_id uuid)`.
- `grant_monthly_carwash(p_member_id uuid)`.
- `expire_raffle_prizes()`.
- `update_raffle_config(p_days int, p_station_id uuid)`.

**Modificación de `register_purchase`:**
- Aplicar multiplicador según tier del miembro.

#### 5.2.4 Cambios de cliente

**Vistas nuevas:**
- `src/views/admin/PartnerStoresManagement.jsx`: CRUD de tiendas asociadas.
- `src/views/admin/RewardLocations.jsx`: configurar dónde es válido cada reward.
- `src/views/admin/RaffleConfig.jsx`: configurar plazo y estación de rifa.
- `src/views/admin/UnclaimedPrizes.jsx`: lista de premios de rifa no reclamados.

**Modificaciones:**
- `ClientCanjes.jsx` (o equivalente): mostrar QR persistente cuando se hace un canje.
- Vista del cliente: si ganó rifa, mostrar QR del premio con plazo restante y estación de retiro.
- `OpRedeem.jsx` o `OpClients.jsx`: nuevo flujo de "escanear QR de canje" + validar localización.
- Cliente ve "Lavado disponible este mes" en su perfil si es PLATINO/BLACK.
- Operador ve qué tiendas están autorizadas para cada reward al validar.

#### 5.2.5 Sub-fases para Claude Code

1. **F2.1** Migration para tablas nuevas.
2. **F2.2** Modificar `register_purchase` para aplicar multiplicador por tier.
3. **F2.3** Modificar lógica de `special_days` para puntos escalonados por tier.
4. **F2.4** Crear RPC `create_redemption_qr` + `validate_and_consume_qr` (genéricos para los 3 tipos).
5. **F2.5** Crear RPC `grant_monthly_carwash` + configurar cron.
6. **F2.6** Crear RPC `expire_raffle_prizes` + cron mensual.
7. **F2.7** Crear `PartnerStoresManagement.jsx`.
8. **F2.8** Crear `RewardLocations.jsx`.
9. **F2.9** Crear `RaffleConfig.jsx`.
10. **F2.10** Modificar flujo de canje cliente para mostrar QR persistente.
11. **F2.11** Modificar flujo operador para escanear y validar QR.
12. **F2.12** Agregar visualización de "lavado mensual disponible" en perfil cliente.
13. **F2.13** Agregar visualización de premio de rifa con plazo en perfil cliente.
14. **F2.14** Crear `UnclaimedPrizes.jsx` para admin.
15. **F2.15** Build + commits + push + testing.

#### 5.2.6 Estimación de esfuerzo

**Total: 75-97 horas. A 15-25 hs/sem = 4-6 semanas.**

#### 5.2.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cron de lavado mensual no se ejecuta | Media | Medio | Verificar config en Supabase, alerta si falla |
| QR de canje reusable (fraude) | Baja | Alto | Constraint UNIQUE + transacción atómica al consumir |
| Multiplicador rompe registros históricos | Baja | Bajo | Solo aplica a nuevas compras |
| Confusión cliente entre tipos de canje | Media | Bajo | UI clara: secciones separadas |
| Ganador de rifa pierde premio sin entender plazo | Media | Medio | UI prominente del plazo restante, notificaciones automáticas |

#### 5.2.8 Criterios de "listo"

- Cliente BLACK que gasta Q100 recibe 15 puntos (no 10).
- Cliente PLATINO/BLACK recibe 1 lavado gratis cada mes automáticamente.
- Cliente hace canje regular → recibe QR único → operador escanea → consumido.
- Cliente gana rifa → recibe QR del premio con plazo de retiro visible.
- Cliente puede ver en su app cuántos días le quedan para reclamar premio de rifa.
- QR consumido no puede usarse de nuevo.
- Operador NO puede validar QR en una location no autorizada para ese reward.
- Admin puede agregar tienda nueva y asignarle rewards.
- Admin puede cambiar plazo y estación de retiro de rifa.
- Admin ve lista de premios de rifa no reclamados.

#### 5.2.9 Dependencias

- F0 (auditoría) y F1 (stations) completadas.

---

### Fase F3 — Rediseño visual del cliente

#### 5.3.1 Objetivo

Implementar el rediseño visual completo del cliente basado en el mockup de inspiración y wireframe ejemplo1.

#### 5.3.2 Alcance

**Entra:**
- Nuevo home del cliente con layout del wireframe ejemplo1.
- Tarjeta de tier ocupando ancho completo: nombre del tier, visitas, progreso, puntos clickeables.
- Carrusel de promociones y anuncios editables por admin.
- Carrusel de vehículos del cliente (placeholder hasta F6).
- Tres iconos: WiFi (muestra contraseña según tier), Encuesta, Ubicaciones.
- Dos historiales expandibles: Compras y Canjes, con navegación por mes.
- Bottom navigation rediseñada: Inicio / Canjes / [QR] / Rifa / Vehículos.
- Adaptación de paleta de colores a inspiración manteniendo identidad por tier.
- Vista admin para editar promociones (CRUD).
- Vista admin para editar contraseñas WiFi por tier.

**NO entra:**
- Rediseño de canjes, rifa, vehículos (esas vistas se rediseñan en sus respectivas fases).
- Cambios en flujo de QR del cliente.
- Animaciones complejas.

#### 5.3.3 Cambios de BD

```sql
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  cta_text text,
  cta_action text,
  cta_target text,
  active boolean DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.wifi_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL CHECK (tier IN ('ORO', 'PLATINO', 'BLACK')),
  ssid text NOT NULL,
  password text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tier)
);
```

#### 5.3.4 Cambios de cliente

**Vistas modificadas:**
- `src/views/client/ClientHome.jsx`: rediseño completo según wireframe.
- `src/components/ui/BottomNav.jsx`: nueva estructura.
- `src/views/App.jsx`: actualizar lógica de navegación.

**Componentes nuevos:**
- `TierCardLarge.jsx`, `PromotionsCarousel.jsx`, `VehiclesCarousel.jsx`, `QuickActionsRow.jsx`, `ExpandableHistory.jsx`, `WifiModal.jsx`.

**Vistas admin nuevas:**
- `PromotionsManagement.jsx`, `WifiConfig.jsx`.

#### 5.3.5 Sub-fases para Claude Code

1. **F3.1** Migrations.
2. **F3.2** Crear `PromotionsManagement.jsx`.
3. **F3.3** Crear `WifiConfig.jsx`.
4. **F3.4** Refactor de `BottomNav.jsx`.
5. **F3.5** Crear `TierCardLarge.jsx`.
6. **F3.6** Crear `PromotionsCarousel.jsx`.
7. **F3.7** Crear `VehiclesCarousel.jsx` (placeholder).
8. **F3.8** Crear `QuickActionsRow.jsx`.
9. **F3.9** Crear `WifiModal.jsx`.
10. **F3.10** Crear `ExpandableHistory.jsx`.
11. **F3.11** Refactor completo de `ClientHome.jsx`.
12. **F3.12** Adaptación de estilos globales.
13. **F3.13** Build + commits + push + testing.

#### 5.3.6 Estimación de esfuerzo

**Total: 81-103 horas. A 15-25 hs/sem = 4-7 semanas.**

#### 5.3.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Pixel-perfect del mockup imposible sin diseñador | Alta | Bajo | Acordar que es "inspiración", no copia exacta |
| Cambios de estilos globales rompen otras vistas | Media | Medio | Testing en cada vista existente post-cambio |
| Carrusel performance lento con muchas imágenes | Baja | Bajo | Lazy loading + compresión de imágenes |
| Upload de imágenes para promociones | Media | Medio | Usar Supabase Storage con políticas RLS |

#### 5.3.8 Criterios de "listo"

- Cliente abre app y ve nuevo home con tarjeta de tier prominente.
- Click en puntos → redirige a Canjes.
- Carrusel de promociones cargado desde BD, clickeable.
- Bottom nav muestra 4 pestañas + botón QR central.
- WiFi modal muestra contraseña correcta según tier del cliente.
- Historial expandible permite navegar por mes.
- Vista en mobile (360px) y desktop (1440px) sin overflow.

#### 5.3.9 Dependencias

- F2 completada.

---

### Fase F4 — Tarjeta física + extensiones del operador + optimización impresión POS

#### 5.4.1 Objetivo

Soportar clientes con tarjeta física como entidad separada. Construir flujos del operador pensando en futura integración con PROPER. Optimizar drásticamente el flujo de impresión en POS Sunmi P2.

#### 5.4.2 Alcance

**Entra:**
- Tabla `physical_card_members` separada de `members`.
- Datos del miembro físico: nombre, DPI, dirección, fecha de nacimiento, NIT opcional, número de tarjeta física.
- Registro de miembro físico desde admin o operador.
- Bloqueo de "miembro físico" no puede usar la app.
- Flujo de migración: miembro físico → miembro app.
- Extensión del operador: ver puntos de cliente físico al escanear su QR.
- Extensión del operador: canjear premios de cliente físico desde pista.
- Operador puede ver localizaciones autorizadas al canjear.
- **Optimización de impresión en POS Sunmi P2:** integración con SDK nativo via wrapper específico, eliminación de pasos manuales, configuración admin de "auto-imprimir sí/no" por estación.

**NO entra:**
- App separada para clientes físicos.
- Web pública para consulta de saldo de físicos.
- Tarjeta física con NFC.
- Cambios en información contenida en el ticket.

#### 5.4.3 Cambios de BD

```sql
CREATE TABLE public.physical_card_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  dpi text UNIQUE,
  birth_date date,
  phone text,
  email text,
  nit text,
  address_department text,
  address_municipality text,
  address_canton text,
  address_detail text,
  physical_card_number text NOT NULL UNIQUE,
  registered_by_operator_id uuid REFERENCES operators(id),
  registered_at timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  migrated_to_member_id uuid REFERENCES members(id),
  migrated_at timestamptz,
  notes text
);

ALTER TABLE physical_cards ADD COLUMN assigned_type text DEFAULT 'app_member';
ALTER TABLE physical_cards ADD COLUMN physical_member_id uuid REFERENCES physical_card_members(id);
```

**Configuración en program_config:**
- Nueva clave `printing_config` con JSONB: `{auto_print_enabled: true, station_overrides: {}}`.

**RPCs nuevos:**
- `register_physical_member`, `assign_card_to_physical_member`, `get_physical_member_by_card`, `register_purchase_physical`, `redeem_for_physical_member`, `migrate_physical_to_app`.

#### 5.4.4 Cambios de cliente

**Vistas nuevas:**
- `PhysicalMembers.jsx`, `OpPhysicalRegister.jsx`, `OpPhysicalRedeem.jsx`, `PrintingConfig.jsx`.

**Modificaciones:**
- `OpClients.jsx`: detectar app vs físico al escanear.
- Auth cliente: bloquear emails de físicos.

**Nuevo módulo de impresión:**
- `src/lib/sunmiPrinter.js`: wrapper para SDK Sunmi con fallback a `window.print()`.

#### 5.4.5 Sub-fases para Claude Code

1. **F4.1** Migration `physical_card_members` + modificación de `physical_cards`.
2. **F4.2** RPCs de registro, lookup, asignación.
3. **F4.3** RPCs de compras y canjes para físicos.
4. **F4.4** `PhysicalMembers.jsx` admin.
5. **F4.5** `OpPhysicalRegister.jsx`.
6. **F4.6** Detección app vs físico en `OpClients.jsx`.
7. **F4.7** `OpPhysicalRedeem.jsx` con flujo en pista.
8. **F4.8** Validación al login.
9. **F4.9** RPC y UI de migración físico → app.
10. **F4.10** Investigación de SDK Sunmi P2 + creación de `sunmiPrinter.js`.
11. **F4.11** Integrar impresión optimizada en flujo de canjes.
12. **F4.12** Crear `PrintingConfig.jsx`.
13. **F4.13** Build + commits + push + testing en POS Sunmi reales.

#### 5.4.6 Estimación de esfuerzo

**Total: 76-100 horas. A 15-25 hs/sem = 4-6 semanas.**

#### 5.4.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Duplicación de DPI entre app y físico | Media | Medio | Validar DPI unique cross-tabla |
| Pérdida de puntos en migración físico→app | Baja | Alto | Transacción atómica + log |
| Operador confunde flujos | Alta | Bajo | UI clara con badge "FÍSICO" vs "APP" |
| Tarjetas físicas perdidas/duplicadas | Media | Medio | Política de "reasignación" con motivo |
| SDK de Sunmi no accesible desde web | Media | Medio | Fallback a `window.print()` mejorado + documentar limitación |
| Sunmi P2 actualiza firmware y rompe integración | Baja | Alto | Versionado del wrapper, testing continuo |

#### 5.4.8 Criterios de "listo"

- Admin puede registrar cliente físico con todos los datos.
- Operador puede escanear tarjeta física y ver puntos + canjes posibles.
- Operador puede canjear premio de cliente físico en pista.
- Cliente físico migrado a app conserva sus puntos.
- Cliente físico intenta usar app → recibe mensaje claro.
- Impresión en POS Sunmi P2 funciona en 1-2 clics máximo.
- Si POS Sunmi tiene problemas, hay fallback que al menos imprime preview.

#### 5.4.9 Dependencias

- F2 (sistema de canjes y QR ya operativo).

---

### Fase F5 — Features faltantes (incluye verificación WhatsApp + SMS fallback)

#### 5.5.1 Objetivo

Cerrar features que faltan en la experiencia base: verificación de teléfono multicanal vía WhatsApp + SMS fallback (Twilio), recuperación de password, registro con dirección estructurada, confirmaciones críticas.

#### 5.5.2 Alcance

**Entra:**
- **Integración con Twilio orquestada desde Supabase Edge Functions:**
  - Canal primario: WhatsApp Business API.
  - Canal fallback: SMS.
  - Lógica automática de "intentar WhatsApp primero, fallback a SMS si falla".
- Verificación de teléfono al registrar cuenta nueva.
- Sistema de recuperación de password (vía WhatsApp con SMS fallback, o email).
- Campos de dirección estructurada en registro: Departamento, Municipio, Cantón.
- Modal de confirmación al comprar tickets de rifa.
- Catálogo de Departamentos/Municipios de Guatemala (precargado).

**NO entra:**
- Verificación de teléfono cada login (solo al registro).
- 2FA opcional.
- Detección automática de ubicación.
- Notificaciones promocionales por WhatsApp (requiere consentimiento adicional).

#### 5.5.3 Pre-requisitos administrativos (gestionar en paralelo desde semana 1)

| Gestión | Plazo | Estado para arrancar F5 |
|---|---|---|
| Cuenta Twilio Business creada | 1-2 días | Debe estar lista |
| Número virtual asignado | Inmediato post-cuenta | Debe estar listo |
| Aprobación WhatsApp Business via Twilio | 1-4 semanas | Debe estar aprobado |
| Plantillas WhatsApp aprobadas por Meta | 2-7 días c/u | Mínimo 2 plantillas aprobadas |

**Si las gestiones administrativas no están completas al llegar a la semana 27, F5 se inicia con SMS only y se agrega WhatsApp cuando se complete la aprobación.**

#### 5.5.4 Cambios de BD

**Tablas nuevas:**
```sql
CREATE TABLE public.geo_departments (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_order int
);

CREATE TABLE public.geo_municipalities (
  id serial PRIMARY KEY,
  department_id int NOT NULL REFERENCES geo_departments(id),
  name text NOT NULL,
  display_order int
);

CREATE TABLE public.password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('member', 'admin', 'operator')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  channel_attempted text NOT NULL CHECK (channel_attempted IN ('whatsapp', 'sms', 'whatsapp_then_sms')),
  channel_delivered text,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  attempts int DEFAULT 0,
  twilio_message_sid text,
  created_at timestamptz DEFAULT now()
);
```

**Configuración en program_config:**
- Nueva clave `verification_config` con JSONB:
```json
{
  "primary_channel": "whatsapp",
  "fallback_channel": "sms",
  "code_expiration_minutes": 10,
  "max_attempts": 5,
  "twilio_account_sid": "...",
  "twilio_whatsapp_template_id": "...",
  "twilio_whatsapp_number": "...",
  "twilio_sms_number": "..."
}
```

**Modificaciones:**
- `members`: agregar `address_department_id`, `address_municipality_id`, `address_canton text`, `phone_verified boolean DEFAULT false`.
- Seed inicial de departments y municipalities de Guatemala.

#### 5.5.5 Cambios de cliente

**Vistas modificadas:**
- Flujo de registro: paso de verificación de teléfono antes de completar.
- Login: opción "¿Olvidaste tu contraseña?".
- Compra de tickets rifa: modal de confirmación.

**Componentes nuevos:**
- `AddressSelector.jsx`, `PhoneVerificationModal.jsx` (genérico para ambos canales), `PasswordResetModal.jsx`, `ConfirmationModal.jsx` genérico.

**Edge Functions de Supabase:**
- `send-phone-verification`: orquesta envío vía Twilio (WhatsApp primero, SMS fallback).
- `verify-phone-code`: valida código contra BD.
- `send-password-reset`: dispara recuperación de password vía WhatsApp/SMS o email.

#### 5.5.6 Sub-fases para Claude Code

1. **F5.1** Migrations geo + seed Guatemala.
2. **F5.2** Migration `password_resets` + `phone_verifications`.
3. **F5.3** Crear Edge Function `send-phone-verification` con lógica WhatsApp → SMS.
4. **F5.4** Crear Edge Function `verify-phone-code`.
5. **F5.5** Crear Edge Function `send-password-reset`.
6. **F5.6** Crear `PhoneVerificationModal.jsx` (UI agnóstica del canal usado).
7. **F5.7** Crear `AddressSelector.jsx`.
8. **F5.8** Modificar flujo de registro con verificación + dirección.
9. **F5.9** Crear `PasswordResetModal.jsx` + flujo completo.
10. **F5.10** Crear `ConfirmationModal.jsx` genérico.
11. **F5.11** Aplicar confirmación a compra de tickets de rifa.
12. **F5.12** Build + commits + push + testing exhaustivo con números reales.

#### 5.5.7 Estimación de esfuerzo

- F5.1: 4-5 horas.
- F5.2: 2-3 horas.
- F5.3: 8-10 horas (Edge Function con lógica multicanal).
- F5.4: 4-5 horas.
- F5.5: 6-8 horas.
- F5.6: 5-6 horas.
- F5.7: 3-4 horas.
- F5.8: 6-8 horas.
- F5.9: 8-10 horas.
- F5.10: 3-4 horas.
- F5.11: 2-3 horas.
- F5.12: 5-7 horas (incluye pruebas con números reales en ambos canales).

**Total: 56-73 horas. A 15-25 hs/sem = 2-3 semanas.**

#### 5.5.8 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Aprobación WhatsApp Business demora más de 4 semanas | Media | Medio | Iniciar gestiones en semana 1. Plan B: arrancar con SMS only |
| Plantillas de Meta rechazadas | Media | Bajo | Plantillas conservadoras, sin lenguaje promocional |
| Cliente sin WhatsApp activo | Baja | Bajo | Fallback automático a SMS cubre este caso |
| Costo de Twilio aumenta más de lo esperado | Baja | Bajo | Rate limiting + monitoreo de uso |
| Token de password reset robado | Baja | Alto | Expiración corta (15 min) + un solo uso |
| Datos de geo Guatemala incompletos | Media | Bajo | Permitir cantón como texto libre |

#### 5.5.9 Criterios de "listo"

- Cliente nuevo recibe código de verificación por WhatsApp al registrarse.
- Si WhatsApp falla, recibe automáticamente por SMS sin requerir acción del cliente.
- Cliente puede recuperar password via WhatsApp/SMS o email.
- Registro pide Departamento → Municipio → Cantón en selects.
- Compra de tickets de rifa pide confirmación antes de descontar puntos.
- Logs de envío visibles en admin (canal usado, status de entrega).

#### 5.5.10 Dependencias

- F3 (rediseño visual).
- Gestiones administrativas con Twilio + Meta completadas en paralelo.

---

### Fase F6 — Vehículos como entidad + catálogo completo + alertas push

#### 5.6.1 Objetivo

Convertir vehículos en entidad de primera clase con CRUD completo, tracking manual de servicios, kilometraje y rendimiento. Incluye catálogo amplio de marcas y modelos comunes en Guatemala, y alertas push automáticas de servicios pendientes.

#### 5.6.2 Alcance

**Entra:**
- Tabla `vehicles`, `vehicle_services`, `vehicle_kilometers`.
- Cálculo de rendimiento.
- Tab "Vehículos" en cliente con CRUD.
- Selector de vehículo al registrar compra (opcional).
- Asociación de compras a vehículos.
- **Catálogo amplio de marcas y modelos** (~20-30 marcas × 10-30 modelos cada una).
- Custom brand/model si no encuentra.
- Admin promociona customs.
- **Alertas push automáticas** con umbrales globales (default 7 días / 500 km antes).
- Cliente silencia alertas por vehículo individual.
- Cron diario evaluador.

**NO entra:**
- Integración OBD-II / API fabricantes.
- Predicción de fallas.
- Galería de fotos.
- Umbrales por cliente individual.

#### 5.6.3 Cambios de BD

```sql
CREATE TABLE public.vehicle_brands (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_order int
);

CREATE TABLE public.vehicle_models (
  id serial PRIMARY KEY,
  brand_id int NOT NULL REFERENCES vehicle_brands(id),
  name text NOT NULL,
  year_from int,
  year_to int
);

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id),
  brand_id int REFERENCES vehicle_brands(id),
  model_id int REFERENCES vehicle_models(id),
  custom_brand text,
  custom_model text,
  year int,
  plate text,
  color text,
  fuel_type text CHECK (fuel_type IN ('super', 'regular', 'diesel')),
  current_kilometers int,
  oil_type text,
  notes text,
  active boolean DEFAULT true,
  alerts_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.vehicle_kilometers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  kilometers int NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'manual'
);

CREATE TABLE public.vehicle_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  service_type text NOT NULL,
  performed_at timestamptz NOT NULL,
  kilometers_at_service int,
  oil_type text,
  notes text,
  next_service_at timestamptz,
  next_service_at_km int,
  cost numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ADD COLUMN vehicle_id uuid REFERENCES vehicles(id);
```

**Configuración en program_config:**
- Nueva clave `service_alerts_config` con JSONB de umbrales e intervalos.

**Seed inicial del catálogo:**
- Toyota, Honda, Nissan, Mitsubishi, Hyundai, Kia, Mazda, Ford, Chevrolet, Volkswagen, Suzuki, etc. con modelos populares.

#### 5.6.4 Cambios de cliente

**Vistas nuevas:**
- `ClientVehicles.jsx`, `VehicleDetail.jsx`, `ServiceAlertsConfig.jsx`, `VehicleCatalogManagement.jsx`.

**Modificaciones:**
- `OpClients.jsx`: selector de vehículo al registrar compra.

**Componentes nuevos:**
- `VehicleCard.jsx`, `ServiceTimeline.jsx`, `EfficiencyChart.jsx`, `AlertsToggle.jsx`.

**Edge Functions:**
- `evaluate-service-alerts`: cron diario.

#### 5.6.5 Sub-fases para Claude Code

1. **F6.1** Migrations + seed catálogo amplio.
2. **F6.2** RPCs CRUD vehicles + services + kilometers.
3. **F6.3** Lógica de cálculo de rendimiento.
4. **F6.4** Lógica de alertas.
5. **F6.5** Edge Function de cron diario.
6. **F6.6** `ClientVehicles.jsx` lista + crear.
7. **F6.7** `VehicleDetail.jsx`.
8. **F6.8** Selector de vehículo en operador.
9. **F6.9** Actualizar `VehiclesCarousel.jsx` con datos reales.
10. **F6.10** `ServiceAlertsConfig.jsx` admin.
11. **F6.11** `VehicleCatalogManagement.jsx` admin.
12. **F6.12** Integración con sistema de notificaciones push.
13. **F6.13** Build + commits + push + testing.

#### 5.6.6 Estimación de esfuerzo

**Total: 72-93 horas. A 15-25 hs/sem = 3-5 semanas.**

#### 5.6.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Catálogo demasiado grande | Media | Bajo | Permitir custom_brand/custom_model |
| Cliente registra datos incorrectos | Alta | Bajo | Validaciones + permitir corrección |
| Rendimiento confuso con varios fuels | Media | Medio | Calcular por fuel separadamente |
| Alertas push no llegan (permisos denied) | Alta | Medio | Sistema "best effort" + visible en app |
| Cron de alertas no se ejecuta | Media | Medio | Monitoreo del cron |

#### 5.6.8 Criterios de "listo"

- Cliente puede agregar vehículo eligiendo de catálogo o custom.
- Cliente registra servicio con fecha y kilometraje.
- App muestra próximo servicio sugerido.
- Cliente recibe notificación push 7 días antes del servicio.
- Cliente puede silenciar alertas por vehículo.
- App calcula rendimiento (km/galón).
- Operador puede asociar compra a vehículo.
- Admin puede ajustar umbrales globales de alertas.
- Admin ve customs y puede promoverlos.

#### 5.6.9 Dependencias

- F3 (BottomNav con tab Vehículos).

---

### Fase F7 — API REST pública + integración PROPER

#### 5.7.1 Objetivo

Exponer endpoints REST autenticados que PROPER puede consumir.

#### 5.7.2 Alcance

**Entra:**
- Endpoints REST (Edge Functions):
  - `POST /api/v1/auth/token`
  - `POST /api/v1/purchases`
  - `GET /api/v1/members/{card_code}`
  - `POST /api/v1/redemptions/validate`
  - `POST /api/v1/redemptions/consume`
  - `GET /api/v1/physical-members/{card_number}`
  - `POST /api/v1/physical-members/redemptions`
- API keys por integración.
- Rate limiting.
- Logging.
- Documentación OpenAPI/Swagger.
- Validación de NIT.

**NO entra:**
- API para clientes finales.
- WebSocket / SSE.
- GraphQL.
- Webhooks salientes.

#### 5.7.3 Cambios de BD

```sql
CREATE TABLE public.api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key_hash text NOT NULL,
  active boolean DEFAULT true,
  rate_limit_per_minute int DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE public.api_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_client_id uuid REFERENCES api_clients(id),
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code int,
  request_body jsonb,
  response_body jsonb,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);
```

#### 5.7.4 Cambios de cliente

**Vistas admin nuevas:**
- `ApiClients.jsx`, `ApiLogs.jsx`.

#### 5.7.5 Sub-fases para Claude Code

1. **F7.1** Diseñar contrato de API (OpenAPI).
2. **F7.2** Edge Function de auth.
3. **F7.3** Edge Function de purchases.
4. **F7.4** Edge Functions de members + redemptions.
5. **F7.5** Edge Functions de physical-members.
6. **F7.6** Implementar rate limiting.
7. **F7.7** `ApiClients.jsx` admin.
8. **F7.8** `ApiLogs.jsx` admin.
9. **F7.9** Generar documentación Swagger.
10. **F7.10** Coordinación con PROPER + testing integrado.
11. **F7.11** Build + deploy + go-live.

#### 5.7.6 Estimación de esfuerzo

**Total: 55-74 horas. A 15-25 hs/sem = 3-5 semanas.**

#### 5.7.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| PROPER demora en su integración | Alta | Medio | API lista, espera del lado de ellos |
| Spec de API no cubre caso real | Media | Alto | Iteración con PROPER antes de freeze |
| API key expuesta | Baja | Alto | Logs de uso anómalo + rotación |
| Performance bajo carga | Baja | Medio | Load testing antes de go-live |

#### 5.7.8 Criterios de "listo"

- API documentada con Swagger.
- PROPER consume `/purchases` y funciona.
- Admin puede crear/revocar API keys.
- Logs visibles en admin.
- Rate limiting protege contra abuso.

#### 5.7.9 Dependencias

- F4 completada.
- Confirmación de PROPER que están listos.

---

### Fase F8 — Spike de Club Business

#### 5.8.1 Objetivo

Investigación de viabilidad de Club Business como producto B2B. **NO se construye código en producción.** Entregable: documento de hallazgos con recomendación GO / NO-GO.

#### 5.8.2 Alcance

**Entra:**
- Investigación técnica.
- Prototipo descartable.
- Análisis de mercado.
- Modelo de negocio.
- Comparación con competidores.
- Documento final con recomendación.

**NO entra:**
- Código en producción.
- BD final.
- UI definitiva.

#### 5.8.3 Entregables

1. Documento `CLUB_BUSINESS_SPIKE.md` en el repo.
2. Prototipo descartable.
3. Lista de clientes potenciales y feedback.

#### 5.8.4 Timebox

**1 semana de trabajo intenso o 2 semanas part-time.**

#### 5.8.5 Dependencias

- F0-F7 idealmente completadas.

---

### Fase F9 — Reportería de negocio enriquecida (opcional)

#### 5.9.1 Objetivo

Dashboard de admin con KPIs financieros del PDF estratégico.

#### 5.9.2 Alcance

**Entra:**
- Métricas financieras estimadas.
- Vista admin con gráficos.
- Exportación a Excel/CSV.
- Comparativas mes a mes.

**NO entra:**
- Integración con sistema contable.
- Reportes en tiempo real.

#### 5.9.3 Estimación de esfuerzo

**40-55 horas. 2-3 semanas.**

#### 5.9.4 Dependencias

- F1, F2, F6.

---

## 6. Apéndice A: Spike de Club Business (detalle)

### 6.1 Preguntas que el spike debe responder

1. **Comercial:** ¿hay 3+ clientes con compromiso de pago en los próximos 6 meses?
2. **Técnica:** ¿la arquitectura cuenta-principal-subcuentas se monta sobre la BD actual sin refactor grande?
3. **Financiera:** ¿el modelo de precio cubre costos de desarrollo en 12 meses?
4. **Operativa:** ¿hay capacidad de soporte para clientes B2B?

### 6.2 Criterios de GO / NO-GO

**GO si:**
- 3+ clientes interesados con compromiso firmado.
- Arquitectura factible sin refactor mayor.
- Modelo financiero positivo a 12 meses.

**NO-GO o POSPONER si:**
- Menos de 3 clientes interesados.
- Requiere refactor mayor.
- Modelo financiero no cierra.

---

## 7. Apéndice B: Deuda técnica conocida

### 7.1 Deuda de código

| Item | Severidad | Cuándo |
|---|---|---|
| `App.jsx` con 1583 líneas — refactor a componentes más pequeños | Media | Aprovechar durante F3 |
| Credenciales de admins NO migradas a BD | Media | F1 |
| `OpRedeem.jsx` sin cablear al nuevo flujo de QR | Alta | F2 |
| `updateConfig` en `dataService.js` como código zombie | Baja | F7 |
| Warning de chunk size >500KB | Baja | Cuando bundle pase 1MB |
| Service Worker error con chrome-extension scheme | Cosmético | Ignorable |
| Sistema de push notifications con delivery inconsistente | Media | F5/F6 |
| Tests automatizados inexistentes | Alta | Después de F5 |

### 7.2 Deuda operacional

| Gestión | Inicio recomendado | Crítica para |
|---|---|---|
| **Cuenta Twilio Business** | Semana 1 | F5 |
| **Aprobación WhatsApp Business via Twilio** | Semana 1 | F5 |
| **Plantillas WhatsApp pre-aprobadas (mínimo 2)** | Semana 2 | F5 |
| Política de privacidad publicada (requisito para WhatsApp) | Semana 1 | F5 |
| Logo de empresa (requisito para WhatsApp Business) | Semana 1 | F5 |
| **Coordinación técnica con PROPER** | Semana 20 | F7 |
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
- Notificaciones promocionales por WhatsApp (requiere consentimiento y opt-in adicional).

### 8.2 Candidatos post-roadmap (a evaluar más adelante)

**App nativa iOS y Android**
- Estado: pendiente de decisión técnica y de timing.
- Estrategias evaluadas:
  - **Capacitor**: ~95% reuso de código, 2-4 semanas, performance suficiente, riesgo de rechazo App Store 20-30%.
  - **React Native**: ~30% reuso de código, 8-12 semanas, mejor performance, riesgo de rechazo 15-20%.
- Decisión técnica se toma cuando se inicie, basado en datos de uso real de la PWA.
- Solo aplica a vista del cliente. Operador permanece como web en POS Sunmi.
- **Trigger sugerido:** PWA estable por 3+ meses + uno de:
  - 500+ usuarios activos con retención >40%.
  - Cliente B2B pidió app nativa explícitamente.
  - Limitación técnica de PWA bloquea feature crítica.

**Sistema de referidos**
- Cliente A invita a B; ambos reciben puntos al confirmarse el registro.
- Esfuerzo estimado: 2-3 semanas (~30-45 horas) cuando se priorice.
- Requiere F5 completada para anti-fraude.
- Decisiones pendientes:
  - Cantidad de puntos a A y B.
  - Cuándo se acreditan los puntos.
  - Límite de referidos por cliente.
  - Si requiere tier mínimo para referir.
  - Visibilidad del tracking.

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
| Cambio de aceite patrocinado por proveedor | Decisión comercial pendiente |
| Métricas financieras (Q116 retorno neto) | F9 opcional |

---

## 10. Apéndice E: Cómo evolucionar este documento

### 10.1 Eventos que disparan actualización

- **Cierre de fase:** marcar como completada. Mover items a changelog.
- **Cambio de decisión:** anotar en sección 2 con fecha.
- **Riesgo materializado:** mover de "riesgos" a "incidentes resueltos" con learnings.
- **Nueva deuda técnica:** agregar a apéndice B.
- **Nueva feature propuesta:** evaluar dónde encaja.

### 10.2 Revisiones programadas

- **Cada fin de fase:** revisión completa.
- **Cada 3 meses:** revisión de prioridades.
- **Antes de cada Q comercial:** alinear con negocio.

### 10.3 Versionado

Cambios mayores van en commits separados con mensaje `docs: actualizar ROADMAP — {motivo}`.

---

## Changelog

### Versión 2.1 — 17 de mayo de 2026
**Cambios respecto a v2.0:**
- Agregada decisión D27: Verificación de teléfono multicanal (WhatsApp primario + SMS fallback) via Twilio orquestado desde Supabase Edge Functions.
- F5 reescrita completamente: incluye Edge Functions para Twilio multicanal, tabla `phone_verifications` (renombrada de `sms_verifications`), config en `program_config`, plantillas WhatsApp.
- Sección 3 actualizada: agregada subsección 3.5 sobre gestiones administrativas en paralelo (Twilio + WhatsApp Business).
- Sección 1.2 ítem 9 actualizado: "verificación por Twilio" → "verificación de teléfono multicanal (WhatsApp + SMS fallback)".
- Sección 1.3 actualizada: agregada fila para verificación de teléfono.
- Apéndice B (deuda técnica) reorganizado en "código" y "operacional". Agregadas gestiones administrativas críticas con plazos.
- Apéndice C actualizado: agregada exclusión explícita de "notificaciones promocionales por WhatsApp".
- F5 esfuerzo ajustado: 56-73 hs (era 42-55).
- Estimación total ajustada: 29-43 semanas calendario (era 28-40).

### Versión 2.0 — 17 de mayo de 2026
**Cambios respecto a v1.0:**
- Agregado P0 (bug-fix pantalla blanca en registro) como tarea pre-roadmap.
- Reescrita sección 1.2 ítem 3 para clarificar que QR de control de fraude aplica a todo premio canjeable.
- Agregadas decisiones D22 (premio de rifa configurable), D23 (catálogo vehículos híbrido), D24 (alertas push), D25 (app nativa diferida), D26 (referidos diferidos).
- F2 expandida con QR universal y reglas de rifa.
- F4 expandida con optimización de impresión POS Sunmi P2.
- F6 expandida con catálogo completo y alertas push.
- Removidas las fases F10 (referidos) y F11/F12 (app nativa).
- Apéndice C reorganizado.
- Estimación total ajustada: 28-40 semanas (era 27-37).

### Versión 1.0 — 17 de mayo de 2026
- Documento inicial creado tras sesión de planificación.
- 10 fases definidas (F0-F9).
- 21 decisiones de producto documentadas.
- Estimación total: 27-37 semanas calendario.

---

**Fin del documento.**
