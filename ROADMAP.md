# Puntos Plus — Roadmap de Producto

> **Versión:** 4.2
> **Fecha de creación:** 17 de mayo de 2026
> **Última actualización:** 4 de septiembre de 2026
> **Estado:** Vivo (este documento evoluciona con el proyecto)
> **Alcance v4.2 (4-sep-2026):** **F6 VEHÍCULOS EN PRODUCCIÓN PARA TODOS** (rollout, mig `20260904`) + cierre de las decisiones **D24** (umbrales editables y silencio por vehículo, `20260904b`) y **D4** (precios por estación, `20260904c`), D22 reconciliada como cerrada, dashboard con canjes reales (`20260904d`), inicio con el arte del vehículo principal, rifa con carrusel de meses, historiales con filtros compactos, y Historial/Canjes/Rifa con bloque superior fijo. Deuda documental saldada (`ESTADO-PROYECTO.md`). Restante de desarrollo: solo GO-LIVE. Ver Changelog.
> **Alcance v4.1:** **F6 VEHÍCULOS CERRADA EN CÓDIGO** (15-ago → 3-sep-2026, verificada contra commits y migraciones): entidad + beta controlada, 50 artes por modelo, combustible y telemetría, consumos manuales, análisis y gráficas, push de servicio D24 con confirmación (E4), unificación jsonb→tabla (E2b) y retiro de Mi cuenta → Vehículos. Queda el **ROLLOUT** (encender `vehicles_beta.enabled`) en manos del dueño. Regla nueva (§0.3): cada cierre de etapa se refleja aquí el mismo día.
> **Alcance v4.0:** **RECONCILIACIÓN CON LA REALIDAD DEL REPO** (verificada contra código y migraciones el 15-ago-2026). Desde v3.0 se CERRARON: SEC-lite, **SEC.C completo** (C.1–C.6), **F7a** (API PROPER, `docs/API-PROPER.md`), **F1**, **F2 incluida PROMO-2** (lavados por consumo + beneficio recurrente mensual) y **F5 en código** (OTP de registro implementado con interruptor apagado hasta Twilio). **F4/F7b quedan EN PAUSA** por decisión del dueño (11-ago: tarjeta SOLO digital). La única fase grande de desarrollo restante es **F6 (Vehículos)**; F9 quedó parcialmente cubierta por el grupo Análisis del admin. Se agrega el track operativo **TIENDAS/LANZAMIENTO** (Play/App Store + checklist de go-live). Este documento sigue siendo el PLAN MAESTRO ÚNICO (producto + seguridad).
> **Alcance v3.0 (histórico):** re-planificación Nivel 2 — marca "Puntos Plus" (D30); F3 disuelta en R1a + track R1b; F7 dividida en F7a/F7b; nueva PROMO-1; SEC-lite slotteada; FB cerrada (D36).

---

## 0. Sobre este documento

### 0.1 Propósito

Este documento es el plan maestro de evolución de Puntos Plus. Define qué se va a construir, en qué orden, con qué alcance, y por qué. No es un cronograma de plazos fijos sino un mapa de prioridades técnicas con estimaciones de esfuerzo razonables.

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

**Regla operativa (3-sep-2026, pedido del dueño):** el ROADMAP se sincroniza EN EL MISMO COMMIT (o el inmediato) en que se cierra una etapa, se ejecuta una migración o se toma una decisión — no en reconciliaciones mensuales. Como mínimo se tocan: la fila de la fase en §4.1, el bloque de detalle en §5 y el Changelog.

---

## 1. Visión y contexto

### 1.1 Identidad del producto

**Puntos Plus** es una plataforma de fidelización digital independiente. **No es propiedad de Turkaj ni de Shell Guatemala.** Es un producto que las empresas (en su primer cliente: Turkaj) contratan para gestionar sus programas de lealtad.

**Diferencia importante:**
- **Puntos Plus** es la plataforma (producto).
- **Turkaj** es un cliente de Puntos Plus (gasolineras Turkaj I, II, III en Chichicastenango).
- **Shell Guatemala** NO es parte de Puntos Plus ni administra el programa.

Esta separación tiene implicaciones legales, comerciales y arquitectónicas:

| Aspecto | Implicación |
|---|---|
| Legal | Disclaimer obligatorio: "Puntos Plus es una app ajena a Shell Guatemala y aplica únicamente a gasolineras Turkaj en Chichicastenango." |
| Comercial | Si en el futuro otra empresa quiere usar Puntos Plus, es contrato independiente (no parte de Turkaj). |
| Arquitectura | Una instancia por empresa, pero el código del producto es independiente del cliente. No hay hardcoding de "Turkaj" en el branding visible. |

### 1.2 Qué es Puntos Plus hoy

Puntos Plus (anteriormente conocido como "Club Turkaj +") es una Progressive Web App (PWA) de programa de lealtad para gasolineras Turkaj I, II, III en Chichicastenango, Guatemala. Permite a clientes acumular puntos por consumo de combustible, canjear premios, participar en rifas mensuales y completar encuestas.

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

Puntos Plus será una plataforma de lealtad configurable que:

1. **Es configurable por empresa** (Turkaj hoy, otra empresa mañana sin tocar código).
2. **Implementa la estrategia comercial completa** del documento estratégico: multiplicador de puntos por tier, lavados gratis, eventos especiales diferenciados.
3. **Aplica QR único con control de fraude a TODO premio canjeable** incluyendo canjes regulares, lavados mensuales gratis, y premios de rifa.
4. **Tiene rediseño visual** que prioriza claridad, vehículos del cliente, y acceso rápido a beneficios, con identidad de marca Puntos Plus y disclaimer legal visible.
5. **Soporta dos canales de identidad**: cuenta digital (app) y tarjeta física (operador-asistido).
6. **Expone API REST** consumible por sistemas de facturación externos (PROPER) y otros canales futuros.
7. **Trackea vehículos del cliente** como entidad de primera clase con telemetría manual y alertas push de servicios.
8. **Audita acciones de admin** con before/after para trazabilidad completa.
9. **Cubre features faltantes**: verificación de teléfono multicanal (WhatsApp + SMS fallback), recuperación de password, dirección estructurada, confirmaciones críticas.
10. **Optimiza flujo de impresión** en POS Sunmi P2 con doble comprobante (operador + cliente) al canjear premios.

### 1.4 Cambios fundamentales respecto al estado actual

| Aspecto | Hoy | Al completar el roadmap |
|---|---|---|
| Identidad del producto | "Club Turkaj +" (mezcla producto/cliente) | "Puntos Plus" (producto independiente con Turkaj como cliente) |
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
**Decisión:** una sola empresa por instancia de Puntos Plus. Si en el futuro aparece otra empresa interesada, sería deploy independiente (otro proyecto Supabase + otro Vercel).
**Motivo:** simplifica enormemente arquitectura (schemas, auth, billing). Multi-tenant introduce complejidad significativa que no se justifica sin demanda confirmada.

### D2 — Nombre fijo "Puntos Plus"
**Decisión:** el nombre de la app es **"Puntos Plus"** (fijo, no dinámico). Reemplaza al nombre anterior "Club Turkaj +". *(v3.0: renombrado desde "Puntos+" — ver D30.)*
**Motivo:** Puntos Plus es la plataforma; Turkaj es el cliente. Mezclarlos en el branding ("Club Turkaj +") confundía la propiedad del producto. Con nombre fijo, Puntos Plus tiene identidad propia y Turkaj es uno de sus clientes.
**Implementación:** rebranding completo se hace en F3 (rediseño visual). Hasta entonces, la app sigue mostrando "Club Turkaj +" en producción.

### D3 — N estaciones configurables
**Decisión:** desde admin se pueden agregar/editar/eliminar estaciones (no limitado a 3).
**Motivo:** soporta crecimiento del negocio del cliente. Hoy son 3 estaciones, mañana pueden ser 5 o 10.

### D4 — Toggle de precios globales vs por estación
**Decisión:** admin elige si los precios son iguales en todas las estaciones o si cada una tiene los suyos.
**Motivo:** flexibilidad operativa. Hoy son iguales, pero en el futuro podría haber diferencias por ubicación.
**Implementación (v4.2, 4-sep-2026, mig `20260904c`):** ✅ COMPLETA. Interruptor `program_config.fuel_prices_mode.per_station` (RPC `set_fuel_prices_mode`, auditado) en Admin → Configuración → Precios de Combustible; con el modo encendido cada estación puede tener `stations.fuel_prices` propio (RPC `update_station_fuel_prices`, mismo modal con motivo; "Usar los precios globales" lo borra) y las que no lo tienen siguen con los globales. `register_purchase` resuelve el precio con `fuel_price_for(estación, combustible)`. La API de PROPER no cambia (galones reales de la factura). El dashboard de admin muestra los Q REALES de purchases.amount (get_admin_kpis); la multiplicación galones × precio global es solo el respaldo visual si el RPC no responde.

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

### D9 — API REST expuesta por Puntos Plus
**Decisión:** Puntos Plus expone API, PROPER (sistema de facturación) la consume.
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
**Decisión:** rediseño basado en mockup de inspiración y wireframe ejemplo1. Mantiene la paleta de colores existente como base inspiracional. Absorbe el rebranding completo a Puntos Plus (logo, eliminación de referencias a Turkaj en visuales del producto).
**Motivo:** UI actual cumple pero no destaca. Nuevo diseño prioriza claridad y branding. Aprovecha la transformación visual para implementar identidad de Puntos Plus.

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
**Implementación (v4.2, 2→4-sep-2026):** ✅ COMPLETA. Umbrales globales en `program_config.service_alerts` (aviso previo por fecha en días y por kilometraje en km; cadencia de recordatorios de vencido por fecha y por km), editables en Admin → Configuración → Alertas de servicio (RPC `set_service_alerts_config`, auditada; mig `20260904b`). Defaults 7 días / 500 km / cada 7 / cada 14. El cliente pinta el aviso naranja y el botón de confirmación con el MISMO umbral. Silencio por vehículo: interruptor "Recordatorios de servicio" en Datos y ajustes (`vehicles.alerts_muted`); el RPC de candidatos excluye los silenciados. La alerta se apaga al CONFIRMAR el servicio desde la notificación (E4).

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

### D28 — Disclaimer legal de Puntos Plus
**Decisión:** la app incluye un disclaimer legal en dos ubicaciones:
- **Footer permanente:** visible en todas las pantallas de la app, en formato pequeño pero claro.
- **Sección "Acerca de":** con el texto completo y contexto adicional sobre Puntos Plus.
**Texto del disclaimer:**
> *"Puntos Plus es una app ajena a Shell Guatemala y aplica únicamente a gasolineras Turkaj en Chichicastenango."*
**Motivo:** protección legal contra reclamos de Shell Guatemala sobre uso indebido de marca. Aclara la independencia del producto Puntos Plus respecto a la franquicia Shell. Implementación en F3 (rediseño visual) cuando se rehaga toda la identidad.

### D29 — Impresión de comprobante: doble copia al canjear
**Decisión:** al canjear un premio (en gasolinera o tienda asociada), se imprimen automáticamente DOS comprobantes desde el POS Sunmi P2:
- **Comprobante del operador:** respaldo del premio entregado (con datos del cliente, card code, puntos descontados, QR del canje, operador). Sin firmas.
- **Comprobante del cliente:** confirmación minimalista (premio, fecha, estación). Sin datos sensibles.
**En ambos:** el nombre del premio se imprime en fuente grande y negrita para máxima legibilidad.
**Impresión solo al canjear**, NO al acumular puntos (la factura PROPER ya cubre la acumulación).
**Si la impresión falla:** la app permite reimpresión bajo demanda desde el operador. No hay fallback digital (QR en pantalla).
**Motivo:** doble copia es estándar en sistemas de fidelización serios. Operador conserva respaldo legal; cliente sale con confirmación tangible. Sin firmas porque la auditoría se hace vía `print_logs` + `redemption_qrs`. La reimpresión es más universal que QR digital (no asume smartphone con batería/conexión).

---

### D30 — Marca "Puntos Plus" (17-jul-2026)
**Decisión:** la marca pasa de "Puntos+" a **"Puntos Plus"** (dos palabras). Wordmark con "Plus" destacado en rojo según la referencia visual. Slug técnico: `puntos-plus`.
**Motivo:** decisión del dueño al definir la identidad visual final (carpeta `REFERENCIAS INTERFAZ/` en la raíz del repo). Actualiza D2; el resto de D2 (nombre fijo, no dinámico) sigue vigente.

### D31 — Re-planificación v3.0: F3 disuelta, F7 dividida, nuevo orden (17-jul-2026)
**Decisión:** (a) F3 deja de existir como fase monolítica: el rebranding se ejecuta como **R1a** (exprés, inmediato) y el rediseño visual como **track R1b** (iterativo, una vista por sesión, en paralelo a las fases funcionales). (b) F7 se divide en **F7a** (API core PROPER, adelantada a la posición 5 del flujo) y **F7b** (physical-members, tras F4). (c) FA mantiene su posición crítica. Orden completo en §4.1/§4.2.
**Motivo:** prioridades del dueño (rebranding y API PROPER) + análisis de dependencias: el rebrand no tiene dependencia técnica dura sobre F1/F2; solo 2 de los 7 endpoints de F7 necesitan F4. Costo asumido: retocar vistas ya rediseñadas cuando F2 agregue features (~5-8 hs).

### D32 — Motor de promociones gestionables (17-jul-2026)
**Decisión:** promociones con lógica real gestionadas desde admin: tablas `promo_rules` (vigencia, condiciones, efecto, límites) y `promo_applications` (trazabilidad), aplicadas server-side dentro de `register_purchase`. Efectos v1: `points_multiplier` (dobles puntos) y `bonus_points` (fase PROMO-1). Efecto `grant_reward` (lavado/servicio gratis por consumo mínimo en fechas específicas) se habilita en F2 (PROMO-2), porque necesita el QR universal/vouchers de D20. **Sin stacking:** si matchean varias reglas, gana la de mayor beneficio para el cliente. Evaluación de fechas/días en zona **America/Guatemala**.
**Motivo:** solicitud del negocio (dobles puntos en días/productos específicos, lavado gratis por consumo). Server-side para que el flujo del operador y el endpoint `/purchases` de PROPER compartan la misma lógica sin duplicación. El bono de `special_days` (cumpleaños/festivos) es independiente y no se toca.

### D33 — Promociones visuales con imágenes reales (17-jul-2026)
**Decisión:** las cards de promoción llevan imágenes reales y estilos llamativos (segunda referencia visual). `promotions` se extiende con `image_url`, `category` (combustible/tienda/servicios), `valid_until` y `promo_rule_id` opcional; imágenes en un bucket de Supabase Storage subidas desde admin. En el home, el cuadro rojo "PROMOCIONES" de la referencia se SUSTITUYE por las cards reales rotando automáticamente (comportamiento del carrusel actual). Cards sin regla = informativas; con regla vinculada = muestran datos reales y se apagan solas al vencer.
**Motivo:** las promos actuales (gradiente + icono) se ven simples; el negocio pide imágenes reales. D19 sigue vigente: el ejemplo "20% de descuento en lubricantes" de la referencia NO se implementa como mecánica (a lo sumo card informativa).

### D34 — Home: campana pospuesta, menú al header, Encuesta en vez de Shell (17-jul-2026)
**Decisión:** spec del home cerrada cuadro por cuadro con el dueño (detalle en §5.R1b). Claves: la campana de notificaciones se OMITE (la fase de notificaciones pasa a Apéndice C) y en su lugar el header lleva el botón del menú de usuario (ventana full-screen con el menú actual + "Acerca de"/disclaimer D28); el cuadro "Encuentra Shell" de la referencia se reemplaza por "Encuesta de Satisfacción" (cero Shell); la tarjeta de nivel omite la equivalencia en quetzales y tiene doble zona táctil (área general → detalle del nivel; área de puntos → pestaña Canjes); WiFi restringido a PLATINO/BLACK (en ORO se muestra deshabilitado por nivel); Vehículos con badge "PRÓXIMAMENTE" hasta F6.
**Motivo:** decisiones del dueño (17-jul-2026) sobre la referencia visual del home.

### D35 — Animaciones de navegación (17-jul-2026)
**Decisión:** dos animaciones firmadas: (a) **contenedor→ventana** — al abrir una ventana/modal desde un cuadro, el cuadro se expande hasta ocupar la vista (container transform) y al volver se contrae de regreso al cuadro de origen; (b) **pestañas** — al tocar una pestaña del bottom nav, la vista entra desde abajo, como saliendo de la pestaña. Complementos: press-scale en tarjetas, entrada escalonada del grid, count-up de puntos, barra de progreso animada. Todo con fallback bajo `prefers-reduced-motion`.
**Motivo:** solicitud explícita del dueño para la nueva identidad.

### D37 — Impresión de comprobantes desacoplada del POS (17-jul-2026)
**Decisión:** los POS en producción (Sunmi P2) y los candidatos (PAX A920Pro) **no permiten instalar aplicaciones** (MDM del proveedor de terminales), lo que descarta SDKs nativos y apps puente. Por lo tanto: (a) **FA se re-scopea a "FA-lite"**: `window.print()` optimizado — plantilla térmica dedicada (CSS `@page` 58/80 mm), auto-disparo al confirmar el canje, botón de reimpresión y `print_logs` best-effort. (b) **La impresión definitiva se hará vía PROPER (F7a):** la respuesta del endpoint de consumo de canjes incluirá el payload del comprobante (modelo neutro de la PAL) para que PROPER lo imprima con su propio sistema — cero clics, sin hardware nuevo. (c) **Gestión paralela con el proveedor de las terminales** para whitelisting MDM: si prospera, la PAL gana un driver nativo sin refactor. (d) La alternativa de impresoras de red con cloud-printing (Star CloudPRNT / Epson SDP, ~US$150-250/estación) queda documentada como plan B sin inversión por ahora.
**Motivo:** restricción MDM real verificada por el dueño con ambos dispositivos en mano + PROPER ya imprimirá en el flujo de facturación; se evita comprar hardware y desarrollar contra SDKs inaccesibles.

### D36 — Caso ángel macario: cerrado sin ajuste (17-jul-2026)
**Decisión:** los 71 puntos quedan tal cual (no se ajustan a 50 ni se crea entrada retroactiva). El caso se habló directamente con el cliente y se da por concluido. No se investiga retroactivamente a otros miembros.
**Motivo:** el trigger strict de FB.9 ya garantiza que ninguna mutación futura pase sin auditoría; el valor de la corrección retroactiva no justifica su costo relacional/operativo. Cierra las decisiones FB.5/FB.6 → **FB queda CERRADA**.

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
| Diseño de logo Puntos Plus | ✅ Entregado 17-jul (`REFERENCIAS INTERFAZ/logo.png` — P itálica negra + cruz roja en círculo bicolor) | — | R1b |
| Coordinación técnica con PROPER | YA (adelantada en v3.0) | 2-4 semanas | F7a |

### 3.6 Implicaciones para el roadmap

A 15-25 horas semanales, el alcance restante estimado (v3.0) es de **6 a 11 meses calendario**.

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

### 4.1 Tabla resumen (orden de ejecución v3.0)

| # | Fase | Bloque | Esfuerzo | Prioridad | Estado |
|---|---|---|---|---|---|
| — | P0 | Bug-fix pantalla blanca | 1-3 hs | Crítica | ✅ Completado |
| — | FB | Integridad y trazabilidad de puntos | 16-26 hs | Crítica | ✅ **CERRADA** — caso ángel resuelto sin ajuste (D36) |
| 0 | B0 | Flecos: F0.4 `AuditLog.jsx` (cierra F0) + confirmar F0.5 | 6-10 hs | Crítica | ✅ **COMPLETADO** (`c01e086`+`8b55c44`, smoke prod OK 17-jul) — **F0 CERRADA** |
| 1 | R1a | Rebrand exprés a "Puntos Plus" (strings, manifest, splash, push, legales, disclaimer D28) | 10-16 hs | Crítica | ✅ **CERRADA** (`6e195e4`+`faab783`, smoke prod OK 17-jul) |
| 2 | FA-lite | Impresión `window.print()` optimizada (D37) — plantilla térmica, auto-print, reimpresión, print_logs | 18-26 hs | Crítica | ✅ **CERRADA** (`37f1a92`+`af07171`, validada en Sunmi P2 el 17-jul; PAX A920Pro pendiente sin bloquear) |
| 3 | PROMO-1 | Motor de promociones v1 (dobles puntos / bonus por día-producto-monto) | 25-35 hs | Crítica | ✅ **CERRADA** (18-jul, `7422d26`+`16f5a24`, validada por el dueño en prod) — migs `20260718_promo1_motor_promociones.sql` + `20260718_promo1_fix_lectura_y_sufijo.sql`, vista Motor (`PromoRules.jsx`), promo en modal de estrellas, sufijo corto `🎉 x2 (+N)` en historial. Nota: los event triggers `auto_enable_rls` agregan policy RESTRICTIVA "Deny all by default" a toda tabla nueva — dropearla cuando se quiera SELECT de cliente. **PROMO-1b ✅ CERRADA** (18-jul, `e198eaa`, validada): efecto `grant_reward` habilitado sin vouchers — premio del catálogo otorgado como redemption cost-0 (código TK, Realtime, entrega OpRedeem, impresión FA-lite); comparación sin stacking por beneficio (extra pts vs points_cost) |
| 4 | SEC-lite | `authenticate_member` + cierre del vector cliente del raffle | 12-20 hs | Alta | ✅ **CERRADA** (25-jul, mig `20260725f`) — sesiones de miembro (`member_sessions`, 180 días) + `buy_raffle_tickets` exige sesión con rol explícito. Superada después por **SEC.C completo** (ver 4.1-bis) |
| 5 | F7a | API REST core para PROPER (sin physical-members) | 45-60 hs | Alta | ✅ **CERRADA** (29→30-jul, migs `20260729g/h`+`20260730`) — endpoints Vercel `api/v1/` (stations/members/purchases/redemptions con canje completo F7a.3), API keys bcrypt generadas en Admin, regla de NIT, idempotencia, operadores espejo, push server-side; documentada en `docs/API-PROPER.md`. Sin rate limiting formal ni `ApiLogs.jsx` (deuda menor §7.1). PENDIENTE del dueño: contacto técnico con PROPER |
| 6 | F1 | Configurabilidad empresa + estaciones + precios + KPIs | 61-78 hs | Alta | ✅ **CERRADA** (ago-2026) — `set_company_info`, estaciones en BD con WiFi/coordenadas/código PROPER (`AdminStations` con motivo), precios auditados (`update_fuel_prices`), KPIs reales (`get_admin_kpis` + `get_dash_monthly` + `get_station_top_members`). NO entró el toggle precios por estación (D4: siguen globales, sin necesidad real aún) |
| 7 | F2 | Lealtad completa: lavados, conversión por tier, localizaciones + **PROMO-2** | 85-115 hs | Alta | ✅ **CERRADA** (6-ago, migs `20260806/b/c`) — conversión y eventos POR TIER (F2.1: divisor Q/pt en vez de multiplicador), localizaciones de canje D17 (v1 informativa), tiendas asociadas D18, **PROMO-2 cerrada**: lavados por consumo como campañas `grant_reward` + beneficio RECURRENTE mensual (`max_uses_per_member_month`); el "voucher" es un canje costo-0 con código TK + impresión FA-lite (D20 cubierto por redemptions, sin sistema aparte). FLECO abierto: D22 plazo/estación del premio de rifa (solo el costo por boleto es configurable) |
| 8 | F4 | Tarjeta física + extensiones operador | 50-70 hs | Media | ⏸️ **EN PAUSA** (decisión del dueño 11-ago: tarjeta SOLO DIGITAL; la física es deseo a futuro que podría descartarse). Esquema listo (`physical_cards` con seed inactivo reversible) — NO implementar sin pedido explícito |
| 9 | F7b | Endpoints `/physical-members` (completa contrato PROPER) | 8-12 hs | Media | ⏸️ **EN PAUSA** (depende de F4) |
| 10 | F5 | Features faltantes (WhatsApp+SMS, password, dirección) | 56-73 hs | Media | ✅ **CERRADA EN CÓDIGO** (8-ago, mig `20260808c`) — OTP al registrar implementado (Twilio Verify + `/api/verify-phone` + `phone_verifications`; interruptor `phone_verification` APAGADO hasta configurar `TWILIO_*` en Vercel); dirección estructurada ✓ (`AddressPicker` + `geoGt.js`); confirmación de compra de boletos ✓ (sheet en ClientRaffle). Recuperación de password RESUELTA por decisión del dueño (14-ago): vía chat de WhatsApp — NO SMS/correo. PENDIENTE OPERATIVO: credenciales Twilio + encender el interruptor |
| 11 | F6 | Vehículos como entidad + alertas push | 72-93 hs | Media | ✅ **CERRADA EN CÓDIGO** (15-ago → 3-sep, v4.1; migs `20260815_f6e1/b`, `20260819_f6e2`, `20260902/b/c`, `20260903/b/c`) — entidad `vehicles` + BETA controlada, 50 artes por modelo (E1), combustible y telemetría (E2), análisis, consumos manuales, gráficas y push de servicio D24 (E3), confirmación de servicio desde la notificación (E4), unificación jsonb→tabla (E2b) y retiro de Mi cuenta → Vehículos. ✅ **ROLLOUT a todos los socios (4-sep, mig `20260904`):** beta retirada (tabla, config, RPCs y tarjeta de admin), placeholder PRÓXIMAMENTE eliminado — `VehiclesScreen` monta `VehiclesHome` directo |
| 12 | F8 | Spike Club Business | 1 sem | Baja | Pendiente |
| 13 | F9 | Reportería enriquecida (opcional) | 40-55 hs | Opcional | 🟡 **PARCIAL** — el grupo Análisis del admin (13-ago: AnClientes/AnOperadores/AnPromos/AnIntegridad con RPCs `report_*`, integridad auditada; sin método de pago — solo Q total) cubre el grueso; el resto queda opcional |
| — | **TIENDAS** | **Track operativo nuevo (v4.0):** publicación en Play Store (TWA/PWABuilder + `assetlinks.json`) y App Store (Sign in with Apple + push APNs, decisiones del dueño 14-ago) — checklist en `docs/TIENDAS.md` | 15-25 hs + gestiones | Alta | 🟡 **PREPARADO** (14-ago: manifest completo, privacidad/eliminación corregidas, iconos 192). BLOQUEADO por cuentas del dueño (Play Console + Apple Developer) + capturas 1080×1920 + cuenta demo |
| — | **GO-LIVE** | **Checklist de lanzamiento:** ~~rollout de Vehículos~~ (✅ 4-sep), encender motor de degradación (`set_degradation_enabled` — el contador de todos arranca en cero), encender `phone_verification` (con Twilio), revocar la API key "Pruebas" de PROPER, verificación general | 4-8 hs | Alta | 📋 Pendiente (los interruptores están apagados A PROPÓSITO hasta el lanzamiento oficial) |
| ∥ | **R1b** | **Track paralelo: rediseño visual iterativo por vistas** (Home → Promociones → Historiales → Menú → Canjes/Rifa) | 75-110 hs | Alta | 🔛 ACTIVO — **R1b.1 Home ✅ CERRADA** (17-jul, `4972e1d`→`dd50f30`, validada por el dueño: bento adaptable, cuadrados fijos Promos/Vehículo, degradados+iconos SVG, historiales con períodos derivados de datos + libro mayor de puntos, container transform con tinte de continuidad). **R1b.2 Promociones ✅ CERRADA** (18-jul, `dbe2ffd`→`6adb57c`, validada por el dueño) — cards verticales 3:4 en grid de 2 (vista PROMOCIONES con chips), 1:1 en el home (carrusel arrastrable, tap → vista); imagen 900×1200 como FONDO completo con textos encima (saltos de línea manuales, color por bloque via `text_colors` jsonb), preview admin a tamaño real; bucket promo-images solo-service-role + `/api/upload-promo-image`. **Actualización v4.0 (15-ago):** desde entonces el track cerró TODAS las vistas base del cliente — Menú (23-jul), modo claro/oscuro completo (24-jul), paleta por nivel + BLACK galaxia (23-jul→14-ago), Historiales con filtros por tipo + paginado (11-ago), Admin v2 con shell lateral y lienzo ancho (4→6-ago), divisiones <500 líneas de App/ClientHome/Settings/AdminDash (12→15-ago), code splitting por rol (cliente 354 kB, 14-ago) y **splash de entrada con monedas PP 3D** según referencia "idea intro" (15-ago). El track sigue ACTIVO para correcciones visuales puntuales según referencias |

**Total restante estimado (v4.2):** ≈4-8 hs de desarrollo (solo go-live) + F8 (1 sem, baja) + F9 opcional restante + gestiones externas del dueño (PROPER, Twilio, Play/Apple). F6 (72-93 hs estimadas) se ejecutó entre el 15-ago y el 3-sep; el plan v3.0 de 550-750 hs queda ejecutado en ~95%.

> **Nota v3.0:** este orden ES la re-planificación (Nivel 2) que v2.4/v2.5
> difirieron. F3 ya no existe como fase monolítica: se disuelve en R1a + track
> R1b (D31). F7 se divide en F7a/F7b (D31). El Track de Seguridad entra al
> flujo por primera vez como SEC-lite (posición 4); SEC.C completo sigue sin
> slot. Los estados de P0/FB reflejan la realidad del repo.

### 4.1-bis Track de Seguridad (SEC)

> **v3.0:** el track deja de estar completamente sin slot. **SEC-lite** (= SEC.A
> con scope formal + cierre del vector cliente del raffle) entra al flujo en la
> posición 4 (§4.2), antes del go-live de la API pública. SEC.C completo (auth
> real rol ≠ anon para los 3 actores) y SEC.B.9 siguen sin slot — se re-evalúan
> al cerrar SEC-lite.

| Bloque | Qué | Estado | Posición en el flujo |
|---|---|---|---|
| **SEC-lite** (SEC.A+) | `authenticate_member` server-side + cierre del vector cliente de `buy_raffle_tickets` (rama 1a) | ✅ **CERRADA** (25-jul, mig `20260725f_sec_lite_auth_miembros.sql`) | Ejecutada en posición 4, antes del go-live de F7a como estaba planeado |
| SEC.B | Sesiones operador/admin (tokens de sesión) | ✅ **CERRADO** (B.3–B.8) | — |
| SEC.B.9 | `REVOKE EXECUTE FROM anon` en las 4 RPCs | ✅ **ABSORBIDA por SEC.C** (los REVOKE se ejecutaron dentro de las migraciones C.1–C.6) | — |
| SEC.C | Auth real para los 3 roles | ✅ **CERRADO** (bloques **C.1–C.6**, 28-jul→11-ago, migs `20260728d`→`20260811f`) — implementado como **sesiones con token en RPCs + cierre de la API abierta** (PII y hashes solo por RPC con sesión; escrituras directas revocadas; `admins`/`notifications`/`activity_log`/`raffle_tickets`/`surveys` cerradas; columnas mínimas en `members`/`operators`/`purchases`/`redemptions`): el objetivo de seguridad se logró sin cambiar los roles de Postgres. Auditoría completa del 11-ago en cero hallazgos abiertos (bloques 1 y 2 cerrados) | — |
| FIX-MODAL | Modal de calificación por INSERT de `purchases` | ✅ **CERRADO** | — |

> **v4.0:** el track de seguridad queda **COMPLETO** — no hay bloques SEC abiertos.

### 4.2 Diagrama de dependencias (v3.0)

```
B0 (Flecos) ──► R1a (Rebrand) ──► FA (Impresión POS) ──► PROMO-1 (Motor promos v1) ──► SEC-lite ──► F7a (API PROPER) ──► F1 (Empresa) ──► F2 (Lealtad + PROMO-2) ──► F4 (Tarjeta) ──► F7b (API física) ──► F5 (Features) ──► F6 (Vehículos) ──► F8 (Spike) ──► F9 (Reportería)

Track paralelo continuo (no bloquea la cadena):
R1b (Rediseño iterativo) — sesiones por vista intercaladas entre B0 y F2; requiere logo.
```

**Lectura del diagrama:**
- **FA mantiene su posición crítica** (decisión del dueño, jul-2026): sin impresión estable el producto no es completamente útil.
- **PROMO-1 va antes que F7a a propósito:** el motor vive dentro de `register_purchase`, así el endpoint `/purchases` de PROPER hereda las promociones sin lógica duplicada, y el cálculo de puntos queda estable antes de congelar el contrato de la API.
- **SEC-lite va antes del go-live de la API:** no se sube la visibilidad pública del producto con el vector cliente del raffle abierto.
- **F2 requiere F1** (localizaciones y tiendas necesitan la tabla `stations`). **PROMO-2** (efecto `grant_reward`: lavado/servicio gratis por consumo) vive dentro de F2 porque necesita la infraestructura de QR universal/vouchers (D20).
- **F4 ← F2** y **F7b ← F4** se mantienen de v2.5.
- Las vistas que F2 modifica (canjes) se rediseñan **al final** del track R1b para no trabajarlas dos veces.
- F5 depende de las vistas base del track R1b + gestiones Twilio (§5.5.4).

### 4.3 Gestiones paralelas

```
YA (semana 1)      ──► Coordinación técnica con PROPER (adelantada desde la semana ~22; toma 2-4 semanas y F7a está en posición 5)
YA (semana 1)      ──► Logo de Puntos Plus (bloquea el arranque del track R1b, NO bloquea R1a)
~4 sem antes de F5 ──► Cuenta Twilio + WhatsApp Business + aprobación Meta + plantillas
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

> **Reconciliación v2.4:** estados actualizados con evidencia de commits. El plan
> original marcaba F0.3.5–F0.3.8 pendientes; en realidad están completas, más una
> F0.3.9 ejecutada que no estaba planificada.

1. **F0.1** ✅ Schema `admin_audit_log` + migration. Commit `557e173` (mig `20260530_admin_audit_log`).
2. **F0.2** ✅ RPC `log_admin_action` con SECURITY DEFINER y validación de reason_text. Commit `21fc585` (mig `20260530_log_admin_action_rpc`).
3. **F0.3** Modificar RPCs existentes para registrar en el log. ✅ Completa.
   - **F0.3.1** ✅ `update_fuel_prices` con auditoría atómica (commit `b2320a4`, mig `20260612_update_fuel_prices_with_audit`).
   - **F0.3.1.5** ✅ validación server-side de longitud de `reason_text` (commit `3359bdc`, mig `20260612_log_admin_action_length_validation`).
   - **F0.3.2** ✅ `ReasonModal` genérico reusable (commit `261128f`).
   - **F0.3.3** ✅ integración Settings ↔ ReasonModal ↔ RPC precios (commit `ed6c920`).
   - **F0.3.4** ✅ RPCs de operadores con auditoría (commit `30d710a`, mig `20260612_operator_rpcs_with_audit`).
   - **F0.3.5** ✅ `toggle_operator_active` RPC con auditoría + wrappers + OpManagement (commits `7d1b394`/`c8fb171`/`0e3da46`, mig `20260613_toggle_operator_active_rpc`).
   - **F0.3.6** ✅ auditoría de premios/festivos/rifas en AdminPremios (commits `f058f38`/`c3ceaad`/`c5ab18a`).
   - **F0.3.7** ✅ visibilidad + auditoría en AdminPromos (commits `6209d1f`/`1c4268e`).
   - **F0.3.8** ✅ `update_member_with_audit` (RPC + wrapper) + MemberDetail con diff Opción B + validaciones (commits `0dff54f`/`a3e2212`/`b2936b9`/`5149c20`/`008b392`, mig `20260617_update_member_with_audit`).
   - **F0.3.9** ✅ (no planificada) fixes de focus en AdminPromos + DatePickerSheet preventivo en GoogleProfile (commits `b7b2f5e`/`a9dda49`).
4. **F0.4** ✅ **CERRADA** (B0, commits `c01e086`+`8b55c44`, migs `20260717_get_admin_audit_log` + `20260717_audit_log_entity_name`) — RPC de lectura con sesión admin STRICT + `AuditLog.jsx` (filtros acción/entidad/fechas GT, paginado 20/pág, diff expandible, entidad afectada resuelta con nombre/teléfono). Migraciones ejecutadas y smoke en prod validado por el dueño (17-jul-2026). **Con esto F0 queda CERRADA.**
5. **F0.5** ✅ **Confirmado cubierto** (B0, 17-jul-2026) — auditoría de cobertura: `ReasonModal` integrado en las 5 vistas admin que mutan (Settings, OpManagement, AdminPremios, AdminPromos, MemberDetail); `AdminRaffle` verificado como presentación pura (cero llamadas a Supabase); las 6 acciones sensibles sin cobertura no tienen UI (preparadas para futuro según F0.2). Sin hueco real.
6. **F0.6** Build + commits + push. (continuo a lo largo de F0)
7. **F0.7** ✅ Testing en producción — hubo etapa de observación y testing exhaustivo en prod.

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

**Estado:** ✅ **CERRADA** (v3.0, 17-jul-2026) — infraestructura construida jun-2026; decisiones FB.5/FB.6 (caso ángel macario) **RESUELTAS sin ajuste** (D36).
**Estimación:** 16-26 horas (3-5 sesiones)
**Posición:** Entre F0 y FA

> **⚠️ Reconciliación v2.4 — RE-NUMERACIÓN del plan FB.** Las sub-fases se
> ejecutaron con una numeración distinta a la planificada en v2.3. Por decisión
> de reconciliación, el plan se **re-numera para coincidir con los commits**
> (historia git inmutable; lo que se ajusta es este documento). Ver la **NOTA DE
> EQUIVALENCIA** debajo de la tabla para mapear plan-viejo → plan-nuevo.

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

**Sub-fases (NUMERACIÓN RE-ALINEADA a los commits — estado real):**

| Sub-fase | Descripción | Estado | Evidencia |
|----------|-------------|--------|-----------|
| FB.1.5a | Versionar las 4 RPCs core de negocio (docs) | ✅ | `334f4a0`, mig `20260622_existing_rpcs_core` |
| FB.3 | `modify_member_points` (RPC universal, atomicidad gamma + whitelist) | ✅ | `0de6990`, mig `20260623_modify_member_points` |
| FB.4 | Wrapper cliente `modifyMemberPoints` | ✅ | `d4620b2` |
| FB.5 | 5 RPCs writers de points → SECURITY DEFINER + `set_config` flag | ✅ | `2e7dd40`, mig `20260624_fb5_core_rpcs_definer` |
| FB.6.2a | `grant_special_day_bonus` RPC + wrapper cliente | ✅ | `2d0ea58`, mig `20260624_grant_special_day_bonus` |
| FB.6.2b | `special_days.message` + corrección ortográfica | ✅ | `3267240`, mig `20260624_special_days_message` |
| FB.6.2c | Modal `SpecialDayBonusModal` personalizado por tier | ✅ | `8fa5328` |
| FB.6.2d | Edición de `message` en AdminPremios | ✅ | `2b4c244` |
| FB.6.3 | Migrar `checkSpecialDayBonus` a RPC `grant_special_day_bonus` | ✅ | `2b5b551` |
| FB.6.4 | Migrar `OpRaffle.doBuy` a `buyRaffleTickets` + eliminar `syncMember` | ✅ | `6086f47` |
| FB.7 | Trigger BEFORE UPDATE column-aware en `members.points` | ✅ | `f888968`, mig `20260624_fb7_points_guard_trigger` |
| FB.9 | Activar modo strict en `members_guard_points_write` | ✅ | `d6667f1`, mig `20260624_fb9_strict_mode` |

> **NOTA DE EQUIVALENCIA (plan v2.3 → numeración real v2.4)** — para que commits
> o docs que referencien la numeración vieja sigan siendo legibles:
> - Plan viejo **FB.1** (Inventario de modificadores) → aproximado por **FB.1.5a** (`334f4a0`, versionado de las 4 RPCs core).
> - Plan viejo **FB.2** (RPC universal `modify_member_points`) → ejecutado como **FB.3** (`0de6990`).
> - Plan viejo **FB.3** (Refactor del cliente) → ejecutado como **FB.4** (wrapper, `d4620b2`) + **FB.6.3**/**FB.6.4** (migración de call sites).
> - Plan viejo **FB.4** (Trigger BEFORE UPDATE) → ejecutado como **FB.7** (`f888968`).
> - Plan viejo **FB.5** (Reconstrucción caso ángel) → **NO ejecutado** → decisión ABIERTA (abajo).
> - Plan viejo **FB.6** (Migración de datos afectados) → **NO ejecutado** → decisión ABIERTA (abajo).
> - Plan viejo **FB.7** (Testing + doc) → parcialmente vía **FB.9** (strict) + observación; testing formal de FB 🔶 a confirmar.
> - Sin equivalente en el plan viejo (nuevos): **FB.5** (writers a DEFINER), **FB.6.2a–d** (special day bonus), **FB.9** (modo strict).
>
> Hay **huecos** en la numeración real (FB.1, FB.2, FB.6 base, FB.6.1, FB.8 no
> aparecen como commits): es la historia tal cual, no se inventan.

**Dependencias (ya satisfechas):**

- F0.3.5 a F0.3.8 (cliente integrado con ReasonModal) DEBían completarse antes
  para tener el patrón ReasonModal usable. **Ya están ✅** (ver §5.0.3).
- F0.3.8 (MemberDetail con diff Opción B) preparó el terreno para reemplazar
  mutaciones directas. **Ya está ✅.**

**Decisiones (RESUELTAS en v3.0 — D36):**

1. Tratamiento de Ángel: **los puntos quedan tal cual (71)**. El caso se habló
   directamente con el cliente y se da por concluido. Sin ajuste ni entrada
   retroactiva.
2. **No se investiga retroactivamente** a otros clientes: el trigger strict de
   FB.9 garantiza que ninguna mutación futura pase sin auditoría; la
   arqueología no justifica su costo.

**Justificación estratégica:**

La integridad de puntos es base del programa de lealtad. Sin FB,
F0 (auditoría Nivel 2) queda incompleta: auditamos acciones admin
explícitas pero no la mutación directa que reveló este caso.
FA (impresión POS) puede esperar; sin FB el programa pierde
confianza del cliente.

---

### Bloque B0 — Flecos de cierre (v3.0)

**Estado:** ✅ **COMPLETADO** (17-jul-2026, commits `c01e086`+`8b55c44`; smoke en prod validado por el dueño). **F0 queda CERRADA.**

**Objetivo:** cerrar formalmente F0 antes de abrir frentes nuevos.

**Entra:**
- **F0.4** — `AuditLog.jsx`: vista admin con tabla paginada del `admin_audit_log` + filtros (acción, admin, fecha). Única sub-fase pendiente de F0.
- **F0.5** — confirmación formal de que `ReasonModal` (F0.3.2) cubre el alcance original del "modal de motivo del cambio"; marcar F0 como CERRADA.

**Estimación:** 6-10 hs.

---

### Fase R1a — Rebrand exprés a "Puntos Plus"

**Estado:** ✅ **CERRADA** (17-jul-2026, commits `6e195e4` feat + `faab783` chore; smoke en prod validado por el dueño) — incluye `Wordmark.jsx` (logo tipográfico provisional, D30 del dueño: "usaremos el texto de la referencia, más adelante puede actualizarse"), `LegalFooter.jsx` (D28), T&C reescritos con sección INDEPENDENCIA DE MARCA, sección "Acerca de Puntos Plus" en el menú, y limpieza interna de comentarios/logs. `REFERENCIAS INTERFAZ/` versionada.

**Objetivo:** eliminar la marca "Club Turkaj" de todo lo visible al usuario YA, sin esperar el rediseño visual. Elimina la exposición legal frente a Shell Guatemala (D28/D30).

**Alcance medido (jul-2026):** "Turkaj" aparece 77 veces en 31 archivos de `src/` (mayoría comentarios/console.log, cosméticos) + ~15 puntos visibles al usuario.

**Entra:**
- `index.html` (title, apple-mobile-web-app-title, splash "Cargando…"), `manifest.json` (name/short_name), `sw.js` (título de push), `package.json`.
- Strings visibles en vistas (headers, textos, comprobante de `OpRedeem.jsx`).
- Páginas legales `privacidad.html` / `eliminacion.html`.
- **Disclaimer legal D28** en footer permanente + sección "Acerca de" (texto: "Puntos Plus es una app ajena a Shell Guatemala y aplica únicamente a gasolineras Turkaj en Chichicastenango.").
- Favicon provisional (el logo definitivo llega con R1b).

**NO entra:**
- Nombres de estación "Turkaj I/II/III" (datos del cliente, se quedan).
- Comentarios de código y console.log (se migran oportunísticamente).
- Cambio de URL/repo (post-R1b, Apéndice C).
- Rediseño visual (track R1b).

**Estimación:** 10-16 hs.

---

### Track R1b — Rediseño visual iterativo (absorbe el rediseño de F3)

**Modalidad (D31):** NO es una fase monolítica. Es un track paralelo de sesiones de diseño+implementación, una vista por sesión, intercaladas entre las fases B0→F2. Referencias visuales en `REFERENCIAS INTERFAZ/` (raíz del repo). **Prerrequisito: logo de Puntos Plus.**

**Lenguaje visual (de la referencia):** bento grid — fondo claro, tarjetas planas de color saturado, esquinas ~20px, icono blanco + título bold uppercase + subtítulo corto. La paleta ya existe en el código (gradientes de `AdminPromos.jsx`); se consolida como tokens en `styles.js`.

#### R1b.1 — Home (spec cerrada con el dueño, 17-jul-2026)

| Cuadro | Comportamiento acordado |
|---|---|
| Saludo | Sin acción. Personalizado en días festivos registrados (`special_days`, incl. cumpleaños `month=0`): "¡Feliz Navidad, Juan!". |
| Tarjeta de nivel | Tema por tier (ORO dorado, PLATINO gris metálico, BLACK galaxia `GalaxyDust`). Número grande = puntos canjeables; barra = galones hacia el siguiente tier. SIN "equivale a Q…" (omitido, D34). **Doble zona táctil:** área general → detalle del nivel; área de puntos → pestaña CANJES. |
| Promociones | El cuadro rojo estático de la referencia se SUSTITUYE por las cards de promoción reales rotando automáticamente (comportamiento del carrusel actual) en ese slot del grid. Tocar → vista Promociones full-screen (R1b.2). |
| Vehículo | Badge "PRÓXIMAMENTE". Tocar → pestaña Vehículos (placeholder hasta F6). |
| WiFi | Restringido a PLATINO/BLACK. En ORO se muestra deshabilitado indicando que es beneficio de nivel superior. |
| Encuesta de Satisfacción | Sustituye al "Encuentra Shell" de la referencia (cero Shell). Mismo flujo actual (timer 90 s) + contador visible del límite 5/día. El modal muestra la estación del último consumo (última fila de `purchases` del miembro). |
| Ubicación | Mapa/lista de estaciones con coordenadas (ya existen). |
| Historial de Canjes | Ventana full-screen (como Promociones), agrupada por mes, año y todo el historial, desde `activity_log`. Materializa el objetivo "historial refinado". |
| Historial de Compras | Ídem, filtrado por compras, mostrando puntos ganados (y promo aplicada cuando exista PROMO-1). |
| Menú (en lugar de campana) | La campana de notificaciones se OMITE (fase de notificaciones → Apéndice C). En su lugar, botón de menú de usuario → ventana full-screen con el menú actual (Mi Cuenta, Niveles, Inactividad, Términos) + "Acerca de" con disclaimer D28. |
| Bottom nav | Inicio, Canjes, **QR central**, Rifa, Vehículos (= D14). El QR central abre la tarjeta con código `CTOD/CTPD/CTBD` (generación SVG local existente). |

> Nota técnica: la nueva navegación toca `App.jsx` (1,591 líneas) — la sesión
> del Home incluye extraer la navegación a componente propio (paga parte de la
> deuda de refactor del Apéndice B).

#### R1b.2 — Vista Promociones (segunda referencia)

- Full-screen con back + chips de filtro por categoría (Todas / Combustible / Tienda / Servicios).
- Cards en 2 columnas: **imagen real** + color de fondo, título, condición ("Todos los miércoles", "Por compras de Q100 o más"), "Válido hasta DD/MM/AAAA", chevron a detalle.
- Card final "Canjea tus puntos por increíbles premios → Ver catálogo" → pestaña Canjes.
- **Cambios de datos (D33):** `promotions` + `image_url`, `category`, `valid_until`, `promo_rule_id` (opcional). Bucket de Supabase Storage para imágenes subidas desde admin.
- **Admin:** AdminPromos se extiende para subir imagen, elegir categoría, vigencia y estilo. Card linkeada a `promo_rule` muestra datos reales y se apaga sola al vencer; card sin regla es informativa.
- Nota D19: el "20% de descuento en lubricantes" de la referencia NO se implementa como mecánica; a lo sumo card informativa.

#### R1b.3+ — Sesiones siguientes

Historiales (si no cayeron en R1b.1) → Menú/Acerca de → Canjes/Rifa/QR (al final, post-F2, para no rediseñar dos veces lo que F2 modifica).

#### Animaciones solicitadas (D35)

- **Contenedor → ventana:** al tocar un cuadro que abre ventana/modal, el cuadro se expande hasta ocupar la vista (container transform); al volver, se contrae de regreso al cuadro de origen.
- **Pestañas:** al tocar una pestaña del bottom nav, la vista entra desde abajo, como saliendo de la pestaña.
- Base: press-scale ~0.97 en tarjetas, entrada escalonada del grid, count-up de puntos, barra de progreso animada, galaxia BLACK intacta.
- Todo con fallback bajo `prefers-reduced-motion`.

**Estimación del track:** 75-110 hs (Home 20-30 · Promociones 15-22 · Historiales 10-16 · Menú/Acerca 6-10 · Canjes/Rifa/QR 20-30).

---

### Fase PROMO-1 — Motor de promociones gestionables v1

**Objetivo (D32):** promociones creadas desde admin que se aplican automáticamente al registrar compras: dobles puntos (o bonus fijo) por día de semana, fecha específica, producto (combustible), monto mínimo, estación o tier.

**Punto de enganche:** `register_purchase` calcula los puntos en un único punto server-side (`v_points`, migración FB.5), protegido por FB.7 + SEC.B → las promos se aplican ahí y el endpoint `/purchases` de F7a las hereda sin duplicación.

**Cambios de BD:**
- Tabla `promo_rules`: vigencia (`starts_on`/`ends_on`, `weekdays[]`, `specific_dates[]`), condiciones (`fuel_types[]`, `min_amount`, `tiers[]`, `station_ids[]`), efecto (`points_multiplier` | `bonus_points` | `grant_reward` + `effect_value`/`reward_id`), límites (`max_uses_total`, `max_uses_per_member`), `active`.
- Tabla `promo_applications`: trazabilidad total (regla, miembro, compra, puntos base/finales, efecto jsonb), `UNIQUE(purchase_id, promo_rule_id)`.
- `grant_reward` queda DISEÑADO pero DESHABILITADO hasta F2/PROMO-2 (necesita QR universal/vouchers D20).

**Reglas de aplicación:**
- Evaluación de fechas/días en zona **America/Guatemala** (`now()` es UTC — sin conversión, una promo de sábado arrancaría viernes 6 pm).
- **Sin stacking (v1):** si matchean varias, gana la de mayor beneficio. El bono de `special_days` es independiente y no se toca.
- `activity_log` explícito: "Compra 5.2 gal súper · Q160 · 🎉 Dobles puntos (+16 extra)".
- El jsonb de retorno incluye la promo aplicada → la UI del operador la muestra y el comprobante de FA puede imprimir "DOBLES PUNTOS".

**Admin:** `PromoRules.jsx` con el patrón establecido (CRUD + ReasonModal + auditoría F0): crear regla, activar/desactivar, contador de usos, preview "¿aplicaría a una compra de Q150 de súper hoy en Turkaj II?".

**NO entra:** la parte visual de las cards con imagen (es R1b.2/D33); efecto `grant_reward` operativo (F2/PROMO-2); descuentos porcentuales en tienda (D19).

**Estimación:** 25-35 hs.

**Dependencias:** F0 (patrón auditoría) + FB — ambas ✅.

---

### Fase SEC-lite — `authenticate_member` + cierre del vector cliente del raffle

> **✅ CERRADA (25-jul-2026, migración `20260725f_sec_lite_auth_miembros.sql`):**
> `authenticate_member` emite sesiones de miembro (`member_sessions`, 180 días) y
> `buy_raffle_tickets` exige sesión con rol explícito — el vector sin token quedó
> cerrado. Superada después por **SEC.C completo** (C.1–C.6): la sesión de miembro
> pasó a cubrir TODAS las lecturas/escrituras del cliente, no solo el raffle.

**Objetivo:** cerrar la vulnerabilidad activa documentada en SEC.B: cualquiera con la apikey `anon` puede llamar `buy_raffle_tickets` con token NULL (rama 1a) y gastar puntos de CUALQUIER miembro. Primer scope formal de SEC.A.

**Entra:**
- RPC `authenticate_member` (login por teléfono server-side, reemplaza el `SELECT` directo a `members` de `signInWithPhone`) que emite token de sesión de miembro (patrón SEC.B.3: tabla `member_sessions`, TTL, revocación en logout).
- `buy_raffle_tickets`: eliminar el skip de la rama 1a para el vector cliente → exigir token de miembro válido O sesión Supabase Auth (`auth.uid()` para clientes OAuth).
- UX de expiración reutilizando `expireSession`/`sessionExpiry` (SEC.B.6.4/B.8.2).

**NO entra:** SEC.C completo (rol ≠ anon para operador/admin), SEC.B.9 (REVOKE), RLS de `purchases` — siguen como deuda dependiente de SEC.C.

**Estimación:** 12-20 hs.

**Dependencias:** SEC.B cerrado (✅). Debe completarse ANTES del go-live de F7a.

---

### Fase FA — Optimización de impresión POS Sunmi P2

> **⚠️ v3.0/D37 — RE-SCOPEADA A "FA-lite":** los POS no permiten instalar apps
> (MDM), así que el SDK Sunmi, ESC/POS directo y apps puente quedan fuera. FA-lite
> = `window.print()` optimizado (plantilla térmica `@page`, auto-disparo, doble
> comprobante D29, reimpresión, `print_logs` best-effort) sobre una capa de
> comprobante neutro (PAL) que en F7a se reutiliza como payload para que PROPER
> imprima con su sistema. Estimación re-scopeada: **18-26 hs**. El detalle
> original de esta sección (SDK Sunmi, ESC/POS) se conserva como referencia por
> si el whitelisting MDM del proveedor prospera.
>
> **✅ CERRADA (17-jul-2026):** commits `37f1a92` (receiptModel/receiptPrinter,
> iframe print, auto-print, toggle por dispositivo, mig `20260717_print_logs`) +
> `af07171` (fix historial por `collected_at`). Validada por el dueño en Sunmi
> P2: auto-print en 1 toque, doble comprobante, historial y reimpresión OK.
> Prueba en PAX A920Pro pendiente, no bloqueante (operan con Sunmi).

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

> **✅ CERRADA (ago-2026, v4.0):** identidad de empresa editable (`set_company_info`,
> selector de empresa del cliente), estaciones 100% en BD con WiFi/coordenadas/
> horario/código PROPER (`AdminStations` con motivo obligatorio, 12-ago), precios
> por RPC auditado (`update_fuel_prices`) y KPIs REALES en el inicio del admin
> (`get_admin_kpis`, `get_dash_monthly`, `get_station_top_members`) + grupo
> Análisis (13-ago). NO entró el toggle precios por estación (D4) — los precios
> siguen globales; se retomará solo si aparece la necesidad real.

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

> **✅ CERRADA (6-ago-2026, migraciones `20260806` F2.1 + `20260806b` PROMO-2 +
> `20260806c` D17/D18):** conversión y eventos especiales **POR TIER** (F2.1 —
> el "multiplicador 1/1.2/1.5" se implementó como DIVISOR Q/pt por nivel: ORO
> Q10 · PLATINO Q8 · BLACK Q6, editable en Admin, decidido con el tier PREVIO a
> la compra); localizaciones de canje configurables (D17, v1 informativa) y
> tiendas asociadas (D18, `partner_stores`); **PROMO-2 CERRADA**: los lavados
> por consumo son campañas `grant_reward` del motor (PROMO-1b) y el beneficio
> RECURRENTE ("1 lavado gratis al mes PLATINO/BLACK") lo habilita
> `max_uses_per_member_month`. El "voucher con QR universal" (D20) quedó cubierto
> por el flujo existente de redemptions (canje costo-0 con código TK, Realtime,
> entrega OpRedeem/POS, impresión FA-lite) — no se construyó un sistema aparte.
> ~~FLECO ABIERTO: D22~~ — **CERRADO** (mig `20260806d_d22_plazo_estacion_rifa`):
> plazo (`claim_days`, default 15) y estación de entrega (`claim_station_id`,
> default Turkaj 1) editables por rifa en `AdminRaffleForm`; el modal del
> ganador muestra la fecha límite y la estación. La nota de "fleco abierto"
> quedó desfasada hasta la reconciliación del 4-sep-2026.

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
- **PROMO-2 (D32):** habilitar el efecto `grant_reward` del motor de promociones — lavado/servicio gratis por consumo mínimo en fechas específicas emite un voucher (canje costo 0 con QR único D20) notificado por push.

**NO entra:**
- Descuentos porcentuales en tienda.
- Aceite/Revisión.

#### 5.2.3 Estimación

75-97 horas. 4-6 semanas.

#### 5.2.4 Dependencias

F1 completada (cadena v3.0: …F7a → F1 → F2). PROMO-1 construida (PROMO-2 extiende su motor).

---

### Fase F3 — Rediseño visual del cliente + rebranding completo Puntos Plus

> **⚠️ v3.0 — FASE DISUELTA (D31):** el rebranding se ejecuta en **R1a** y el
> rediseño visual en el **track R1b** (iterativo por vistas). Esta sección se
> conserva como referencia del alcance original; NO se ejecuta como fase.

#### 5.3.1 Objetivo

Implementar el rediseño visual completo del cliente Y completar el rebranding a Puntos Plus.

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
- Reemplazo de "Club Turkaj +" por "Puntos Plus" en TODOS los strings del código.
- Nuevo logo de Puntos Plus (será provisto antes del inicio de F3).
- Title del documento HTML, manifest.json de PWA, splash screen.
- **Disclaimer legal (D28)** en footer permanente + sección "Acerca de".
- Eliminación de cualquier referencia visual a Turkaj del branding del producto.
- Mantiene paleta de colores actual como base inspiracional.

**NO entra:**
- Rediseño de canjes, rifa, vehículos (esas vistas se rediseñan en sus respectivas fases).
- Cambio de URL/repo (se considera por separado, en su momento).
- Cambio de paleta principal (se mantiene la actual).

#### 5.3.3 Pre-requisitos

- **Logo de Puntos Plus** diseñado y disponible antes de iniciar F3.

#### 5.3.4 Estimación

95-120 horas. 5-7 semanas.

#### 5.3.5 Dependencias

F2 completada + logo de Puntos Plus listo.

---

### Fase F4 — Tarjeta física + extensiones del operador

> **⏸️ EN PAUSA (decisión del dueño, 11-ago-2026):** el sistema de tarjetas quedó
> cerrado en modo **SOLO DIGITAL** (emisión en `register_member`, upgrade de
> prefijo en `register_purchase_core`, resolutores validando
> `physical_cards.status='active'`). La tarjeta FÍSICA es un deseo a futuro que
> **podría descartarse** — NO implementar sin pedido explícito. El esquema quedó
> listo (13 seed `CTOD-00001..13` en `status='inactive'`, reversibles) y
> agregarla luego es aditivo (vista admin + RPCs assign/batch/block).

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

> **✅ CERRADA EN CÓDIGO (v4.0):** (1) **Verificación de teléfono al registrar**
> implementada (8-ago, mig `20260808c`): OTP por Twilio Verify vía
> `/api/verify-phone` + tabla `phone_verifications`; `register_member` exige
> verificación reciente con INTERRUPTOR `phone_verification` en `program_config`
> — **APAGADO** hasta que las variables `TWILIO_*` estén en Vercel (gestión del
> dueño). El cambio de número es solicitud por WhatsApp que aplica el admin.
> (2) **Recuperación de password:** RESUELTA por decisión del dueño (14-ago) —
> vía chat de WhatsApp (SupportSheet); NO habrá reset por SMS/correo.
> (3) **Dirección estructurada:** hecha (`AddressPicker.jsx` + `constants/geoGt.js`
> con departamentos/municipios de Guatemala; `members.address`).
> (4) **Confirmación al comprar boletos de rifa:** hecha (bottom sheet en
> ClientRaffle con costo y saldo resultante).
> **PENDIENTE OPERATIVO:** contratar/configurar Twilio y encender el interruptor
> (parte del checklist de GO-LIVE).

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

Vistas base del track R1b rediseñadas + gestiones Twilio/WhatsApp completadas.

---

### Fases F6, F8, F9

Sin cambios respecto a v2.1. Ver versiones anteriores del documento para detalle si hace falta consultarlas.

- **F6 — Vehículos como entidad + alertas push:** 72-93 hs. **✅ CERRADA Y EN
  PRODUCCIÓN PARA TODOS (15-ago → 4-sep-2026, v4.2).** Ejecutada en
  etapas, cada una validada por el dueño en su celular:
  - **E1 (15-ago, migs `20260815_f6e1` + `20260815b`):** tabla `vehicles` cerrada
    a la API abierta (RPCs `list/save/delete_my_vehicle` con sesión), ventana
    real `VehiclesHome` en BETA CONTROLADA (`program_config.vehicles_beta` +
    tabla `vehicles_beta`, gestión en Admin → Configuración), catálogo híbrido
    D23 filtrado por tipo con desplegables propios, servicio por FECHA o
    KILOMETRAJE (E1.1), descargo legal de marcas (22-ago, `c54b720`). **Arte
    por modelo (E1.3 → E1.26, 15-ago → 2-sep):** 50 ilustraciones SVG calcadas
    de referencias propias (19 motos, autos livianos, SUV, picops, microbuses,
    moto taxis, camiones ligeros), recoloreables por el socio (12 colores +
    color libre), lazy chunk por modelo; el pipeline de calco (trazadores,
    generador de componentes, comparador ref-vs-arte y analizador de manchas)
    vive en `tools/artes/` desde el 3-sep. Visor 3D (three.js) EN PAUSA.
  - **E2 (19-ago, mig `20260819_f6e2`):** combustible + telemetría — selector
    de vehículo y odómetro en el modal de calificación, auto-asignación por
    trigger (`purchases.vehicle_id`/`km_reading`), km/gal y km/día por
    vehículo. Validado con compras reales el 3-sep.
  - **E3 (2-sep, migs `20260902`, `20260902b`, `20260902c`):** análisis de
    combustible (rendimiento por tramo, costo por km, consumo por mes,
    historial con editor de reasignación a 30 días), consumos MANUALES fuera
    de Turkaj con llenados parciales (`vehicle_fuel_logs`, solo telemetría —
    cero puntos), pincel/datos como ediciones separadas, tendencia del
    rendimiento, costo mensual, tanque → autonomía, combustible habitual →
    detector de cargas ajenas, guardas suaves de odómetro/tanque, gráficas
    SVG puras (VehicleCharts) y **alertas push de servicio D24** (RPC
    `list_vehicle_service_alerts` solo service_role + cron
    `api/vehicle-service-alerts` 09:10 GT, patrón degradation-alerts).
  - **E4 (3-sep, mig `20260903_f6e4`):** confirmación de servicio desde la
    notificación (deep-link `/?goto=vehiculo`, NOTIFICATION_CLICK e inbox →
    `ServiceConfirmSheet`: fecha, km y próximo servicio con el intervalo
    anterior propuesto), botón en la vista cuando el servicio está en época,
    recordatorios SIN techo hasta confirmar (`last_service`/`last_service_km`).
  - **E2b (3-sep, migs `20260903b` + `20260903c`):** la tabla es la única
    fuente de verdad; `members.vehicles`/`plate` = espejo por trigger
    (`trg_vehicles_mirror`); los escritores legados del jsonb (wizard, admin)
    se reconcilian por placa (`trg_members_sync_vehicles`). **Mi cuenta →
    Vehículos RETIRADO (E2b.1):** toda la gestión vive en la pestaña. ⚠️
    Incidente: el backfill de `20260903b` borró 2 vehículos de la beta por
    reconciliar desde un jsonb desactualizado antes de espejar; reparado en
    `20260903c` (vehículos recreados, compras re-ligadas, regla de borrado
    endurecida) — ver Apéndice B.
  - **ROLLOUT (4-sep, mig `20260904_f6_rollout_vehiculos`):** decisión del
    dueño ("la ventana sí va para todos"). `list_my_vehicles` sin compuerta;
    tabla `vehicles_beta`, clave `program_config.vehicles_beta`, RPCs
    `admin_set/list_vehicles_beta` y la tarjeta de Admin → Configuración
    ELIMINADAS; `VehiclesSoon` (PRÓXIMAMENTE) sustituido por `VehiclesScreen`
    (carga la lista con spinner/reintento y monta `VehiclesHome`). El selector
    de vehículo del modal de calificación aplica a cualquier socio con
    vehículos. La misma migración limpia la placa duplicada ABC123 del socio
    de pruebas. El vehículo de Fernando M. NO se recrea (lo borró el dueño
    probando el 3-sep, 14:26).
  - **D24 flecos (4-sep, mig `20260904b`):** umbrales editables por admin
    (`program_config.service_alerts`, tarjeta Alertas de servicio) y silencio
    por vehículo (`vehicles.alerts_muted`, interruptor en Datos y ajustes);
    cron y RPC de candidatos leen la config; la vista usa los mismos umbrales.
  - **Artes Pulsar/CGL/DR:** validadas por el dueño el 4-sep ("todo bien").
  - **PENDIENTE:** (1) benchmark anónimo de rendimiento entre socios (idea del
    dueño 2-sep, a futuro); (2) retirar el campo `beta: true` de
    compatibilidad en `list_my_vehicles` cuando ya no queden PWA con el
    placeholder cacheado.
- **F8 — Spike Club Business:** 1 semana. Pendiente (baja).
- **F9 — Reportería enriquecida (opcional):** 40-55 hs. **🟡 PARCIAL (v4.0):**
  el grupo **Análisis** del admin (13-ago) cubrió el grueso — 4 vistas de
  consulta (AnClientes, AnOperadores, AnPromos, AnIntegridad) sobre RPCs
  `report_*` con integridad auditada; por decisión de alcance NO hay método de
  pago (solo Q total). Lo restante queda opcional post-lanzamiento.

---

### Fase F7 — API REST pública + integración PROPER

> **✅ F7a CERRADA (29→30-jul-2026, v4.0) · ⏸️ F7b EN PAUSA (depende de F4):**
> F7a se implementó como **funciones serverless de Vercel** (`api/v1/`, no Edge
> Functions de Supabase): `GET /stations`, `GET /members` (QR + NIT),
> `POST /purchases` (galones reales de la factura, regla de NIT, idempotencia
> por header, promos heredadas de `register_purchase_core`) y
> `GET|POST /redemptions` (canje completo desde el POS — F7a.3: request/cancel/
> deliver con comprobante que SOLO se imprime al entregar). Auth por API key
> bcrypt (`api_clients`, generación en Admin → Configuración → API externa),
> colaboradores de PROPER como operadores espejo (`operators.external_id`), push
> de calificación server-side. Documentación entregable en **`docs/API-PROPER.md`**
> (sustituye al Swagger planeado). NO se implementaron `ApiLogs.jsx` ni rate
> limiting formal (deuda menor §7.1). **PENDIENTE del dueño:** contacto técnico
> con PROPER para que integren (la API espera del lado de ellos).

> **✂️ v3.0 — FASE DIVIDIDA (D31):** **F7a** (adelantada, posición 5 del flujo):
> sub-fases F7.1–F7.4 + F7.6–F7.9 (todo menos physical-members) — 45-60 hs.
> **F7b** (tras F4): F7.5 + su parte de F7.10/F7.11 — 8-12 hs. La coordinación
> con PROPER se adelanta a la semana 1 (§4.3). Nota para el contrato: los puntos
> otorgados los calcula Puntos Plus server-side (incl. promociones PROMO-1 y el
> futuro multiplicador por tier de F2) — PROPER NO envía puntos calculados.

> **Detalle recuperado de v2.1** (`8332707`) e integrado en v2.5 — F7 conserva su
> posición en la cadena (F2 → F4 → F7), NO se adelanta. El cuerpo recuperado no
> contenía referencias de marca ni de calendario que armonizar (la mención de
> marca vivía en D9 §2, ya como "Puntos+"; el calendario de PROPER vive en §3.5/
> §4.3/§7.2 como "Semana ~22"). Estimación preservada (55-74 hs).

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

## Track de Seguridad (SEC)

> **Sección paralela** al track de producto (F0–F9, FA, FB), con nomenclatura
> propia (SEC.A / SEC.B / SEC.C, B.9). **NO está slotteada** en el diagrama de
> dependencias §4.2 — su orden relativo al producto es decisión de
> re-planificación (Nivel 2). Contenido **absorbido íntegro** desde
> `ESTADO-PROYECTO.md` en la reconciliación v2.4 (sin resumir). Cierre del
> agujero de permisos `anon` en las RPCs sensibles vía tokens de sesión.

### SEC.A — Login cliente-teléfono server-side (`authenticate_member`) ✅ CERRADO

> **v4.0:** cerrado vía **SEC-lite** (25-jul, mig `20260725f`) y ampliado por
> **SEC.C.1** (28-jul): `authenticate_member` + `member_sessions` (180 días) +
> `create_member_session_oauth` para Google. El texto de abajo queda como
> registro histórico del scope original.

**Estado (histórico v3.0):** no iniciado, **sin scope formal**. Hoy es solo un TODO inline (ver el
"Hallazgo de arquitectura" abajo): el **cliente-teléfono** hace `signInWithPhone`
= solo un `SELECT` a `members` (sin Supabase Auth) → **viaja como `anon`**. La
migración a una RPC `authenticate_member` server-side está pendiente de definir
alcance. Es lógicamente un sub-paso de la migración de auth (SEC.C). **No se
escribe scope acá** (sería re-planificación, Nivel 2).

### SEC.B — Sesiones de operador/admin (tokens de sesión) ✅ CERRADO

**SEC.B CERRADA en B.8. Estado: B.3 ✅ · B.4 ✅ · B.5 ✅ · B.6 ✅ (B.6.1 ✅ · B.6.2 ✅ · B.6.3 ✅ · B.6.4 ✅) · B.8 ✅ (B.8.1 ✅ · B.8.2 ✅).** (B.7, observación pasiva, se absorbió como observación activa corta en B.8.1. B.9 — REVOKE anon — reclasificado como **deuda dependiente de SEC.C**, ver abajo.)

**Commits del bloque:** B.3 `e650e8f` (mig `20260625_sec_b3_session_tokens`) · B.4 `09ca228` · B.5.1 `27a6a33` · B.5.2 `54505b8` · B.5.3 `32f9348` (mig `20260625_sec_b5_token_param`) · B.6.1 `95161fe` (mig `20260626_sec_b6_1_session_validation`) · B.6.2 `52d9d37` (mig `20260626_sec_b6_2_revoke_session`) · B.6.3 `418d030` · B.6.4 `82d03bc` · B.8.1 `1545904` (mig `20260627_sec_b8_1_session_strict`) · B.8.2 `df133f1` · cierre docs `443ab8f`.

**Control de acceso final (modelo anon+token):** las 4 RPCs sensibles
(`register_purchase`, `buy_raffle_tickets`, `update_member_with_audit`,
`modify_member_points`) están protegidas por la **validación strict del token de
sesión** (B.8.1: rechazo con ERRCODE 28000 ante token ausente/inválido/
revocado/expirado) + la **UX del rechazo** (B.8.2: logout + login + aviso). Eso
es lo máximo alcanzable sin auth real para operador/admin — ver el hallazgo de
arquitectura y B.9 al final del bloque.

#### SEC.B.4 — Persistencia de token de sesión en el cliente ✅

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

#### SEC.B.6.1 — Validación de sesión server-side (modo WARN) 🚧

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

#### SEC.B.6.2 — Revocación de sesión server-side ✅

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

#### SEC.B.6.3 — Revocación de sesión en logout (cliente) ✅ — cierra B.6

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

#### SEC.B.6.4 — Cierre proactivo de sesión expirada (cliente) ✅

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

#### SEC.B.8.1 — Validación de sesión en modo STRICT (flip warn→strict) ✅

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

#### SEC.B.8.2 — UX del rechazo de sesión (intercepción 28000 → expireSession) ✅

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

**Cierre del bloque:** con B.8.2, **SEC.B queda CERRADA**. El control de acceso
de las 4 RPCs sensibles es la validación strict del token (B.8.1) + la UX del
rechazo (B.8.2). B.9 (`REVOKE EXECUTE FROM anon`) NO se ejecuta — ver abajo por
qué pasa a depender de SEC.C.

### Hallazgo de arquitectura — operador/admin viajan como rol `anon`

**Raíz de por qué B.9 depende de SEC.C.** Hay un solo cliente Supabase
(`supabaseClient.js`) creado con la apikey `anon`. El rol PostgREST de cada
llamada lo determina el JWT del header `Authorization`: con sesión de Supabase
Auth viaja `authenticated`; sin ella, la apikey anon actúa como JWT → rol `anon`.

- **Operador / Admin:** login vía RPC `authenticate_operator` /
  `authenticate_admin` → guardan un **token custom** (`operator_sessions` /
  `admin_sessions`, SEC.B.3). **No** llaman `sb.auth.signIn*` → **viajan como
  `anon`**, con el token custom como parámetro `p_session_token`.
- **Cliente Google/Apple:** `sb.auth.signInWithOAuth` → sesión real → rol
  `authenticated`.
- **Cliente teléfono:** `signInWithPhone` solo hace `SELECT` a `members` (sin
  Supabase Auth; TODO migrar a RPC `authenticate_member`) → **viaja como `anon`**.

Consecuencia: **operador, admin y cliente-teléfono — los tres son `anon`** a
nivel PostgREST. Por eso el sistema de token custom de SEC.B existe: es el único
control de acceso posible mientras esos actores no tengan identidad autenticada.
(Evidencia empírica: la observación de B.8.1 mostró al operador —rol anon—
registrando compras con token válido y bloqueado con token inválido vía 28000.)

### SEC.B.9 — REVOKE EXECUTE FROM anon — DEUDA DEPENDIENTE DE SEC.C (no ejecutado)

**Estado:** investigado, **NO ejecutado** (no hay REVOKE seguro que aplicar hoy).
Reclasificado de "paso pendiente de SEC.B" a **deuda dependiente de SEC.C**.

**Por qué no es viable ahora:** query `has_function_privilege` confirmó que las 4
RPCs tienen `EXECUTE` para `anon`. Como operador, admin y cliente-teléfono viajan
como `anon` (hallazgo de arquitectura ↑), `REVOKE EXECUTE FROM anon` sobre
**cualquiera** de las 4 **bloquearía a actores legítimos**. No hay variante de
REVOKE parcial que funcione: las 4 son alcanzadas por anon (las 3 de
operador/admin + `buy_raffle_tickets`, que además sirve al cliente-teléfono y al
vector cliente de la rama 1a → SEC.C).

**Precondición para aplicarlo:** REVOKE anon recién es aplicable cuando
operador/admin/cliente-teléfono tengan **identidad autenticada con rol ≠ anon**
(migración de auth = SEC.C). Recién ahí se podría revocar anon en las 3 de
operador/admin (y, cuando el cliente-teléfono migre, también acotar
`buy_raffle_tickets`).

**Qué aportaría (defensa en profundidad, NO la única protección):** el control de
acceso real **ya está cubierto** por la validación strict del token (B.8.1) — un
anónimo sin credencial recibe 28000 antes de cualquier mutación. El REVOKE sería
una segunda capa (ni siquiera poder ejecutar la función sin el rol), no la única
barrera.

**Nota técnica para cuando se encare:** para bloquear `anon` de verdad NO basta
`REVOKE FROM anon` — las 4 RPCs tienen `EXECUTE` otorgado a `PUBLIC` por defecto
(confirmado por query: `anon` es miembro de `PUBLIC`). Haría falta
`REVOKE EXECUTE ... FROM PUBLIC` además de `FROM anon`.

### SEC.C — Auth real (rol ≠ anon para los 3 roles) ✅ CERRADO

> **v4.0 — CERRADO (bloques C.1–C.6, 28-jul→11-ago-2026, migs `20260728d`→
> `20260811f`):** el objetivo se logró por una vía DISTINTA a la definición
> implícita — en vez de migrar los roles de Postgres, se cerró la **API abierta**
> y toda operación sensible pasó a **RPCs con token de sesión** por rol:
> C.1 sesiones de miembro (PII solo por `get_my_member`/`update_my_profile`;
> fichas staff por `list_members_full`); C.2 cierre de lecturas (`activity_log`,
> `raffle_tickets`, ventanas mínimas en `purchases`/`redemptions`); C.3 cierre de
> escrituras directas (flujo de confirmación/entrega en RPCs atómicas);
> C.4 catálogo solo por `admin_write_catalog` auditado; C.5 privacidad de
> nombres; C.6 cierre de RPCs heredadas + inbox de notificaciones. Con esto se
> cerraron también el vector del raffle, SEC.B.9 (REVOKE dentro de las
> migraciones C) y la RLS abierta de `purchases`. Auditoría integral del 11-ago:
> bloques seguridad y bugs en cero hallazgos abiertos. El texto de abajo queda
> como registro histórico.

**Estado (histórico v3.0):** pendiente, **documentado solo como dependencia** (no tiene sección de
scope; escribirlo es re-planificación, Nivel 2). Definición implícita: migrar
operador/admin/cliente-teléfono a **identidad autenticada con rol ≠ `anon`** (hoy
los tres viajan como `anon`, ver hallazgo de arquitectura).

**Qué cierra SEC.C (referencias hacia adelante que dependen de él):**
- El **vector cliente del raffle** (`buy_raffle_tickets` con token NULL legítimo,
  rama 1a): cualquiera con apikey `anon` puede gastar puntos de cualquier
  `member_id`. B.6/B.8 lo dejan abierto a propósito.
- **SEC.B.9** (`REVOKE EXECUTE FROM anon` + `FROM PUBLIC`): solo aplicable cuando
  los 3 roles tengan identidad ≠ anon.
- La **RLS abierta de `purchases`** (anotada en FIX-MODAL: 2 policies `using=true`).
- **SEC.A** (login cliente-teléfono server-side) es lógicamente un sub-paso.

### FIX-MODAL — Modal de calificación por INSERT de `purchases` ✅ CERRADO

El modal de calificación de operador (estrellas) se disparaba mal tras
rifa/canje/encuesta. **Causa raíz (confirmada con log de prod):** el handler
Realtime de `members` infería "hubo combustible" por el delta
`newVisits > prevVisits` contra `lastVisitsRef`, una línea base que quedaba
stale-baja (eventos perdidos por socket suspendido / seed desde caché vieja) y
se combinaba con el `last_operator_id` pegajoso → modal con el operador
equivocado. La rifa no sube `visits`; solo entregaba el `visits` real a un ref
viejo (log: `visits: 45 prevVisits(ref): 43`).

**Fix de fondo (señal directa, no proxy):** commit `5b630a4`.
- Migración `20260629_fix_modal_purchases_realtime.sql`: `ALTER PUBLICATION
  supabase_realtime ADD TABLE purchases` (idempotente).
- Modal: nuevo canal `purchases-${me.id}` que escucha **INSERT en `purchases`**
  (filtro `member_id`), tomando `operator_id`/`station_id` de la fila. Una fila
  de `purchases` se crea SOLO por `register_purchase` (combustible) →
  rifa/canje/encuesta **estructuralmente no pueden** abrir el modal. Reemplaza
  el disparo C/D inferido.
- Historial: la recarga de `activity_log` se **desacopla del delta de visits** —
  ahora recarga en cada UPDATE de `members` (arregla un bug latente: las
  acciones del propio cliente —rifa/canje/encuesta— no refrescaban su historial
  local).
- Borrado: `lastVisitsRef`, `realtimeReadyRef`, el efecto seed, el cálculo del
  delta y el bloque del modal C/D viejo.

**Caminos vivos del modal:** A (push click, SW), B (URL `?rate=`), y el canal
`purchases` (foreground / in-app, señal correcta). El operador calificado sale
siempre de la compra real; `stationName` se resuelve desde `purchases.station_id`
vía el array `stations` (`last_station` no se mantenía; no se tocó).

**Deuda abierta (anotada, no en este fix):** RLS de `purchases` demasiado
abierta (revisar con SEC.C); el error de `sw.js` con esquema `chrome-extension`
quedó **RESUELTO** aparte (commit `5270f98`).

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
| **Incidente 3-sep (F6 E2b):** el backfill de `20260903b` reconcilió la tabla `vehicles` desde un `members.vehicles` desactualizado ANTES de espejar y borró 2 vehículos de la beta (Hero Eco Deluxe de Ezer M. con 3 compras re-ligadas; Hero Eco 100 de Fernando M.). Reparado en `20260903c`; color/km/aceite/próximo servicio de ambos NO recuperables (reingreso por el socio). LECCIÓN: en toda unificación, espejar primero y NUNCA borrar filas con datos propios desde una fuente legada | Alta (cerrado) | ✅ 3-sep-2026 |
| ~~`ESTADO-PROYECTO.md` desactualizado (junio 2026)~~ — reescrito el 4-sep-2026 contra el repo (626 archivos, 268 en src) y la base (38 tablas, 125 funciones, Realtime, buckets, crons, env, RPCs por familia) | Baja (cerrado) | ✅ 4-sep-2026 |
| ~~Placeholder `VehiclesSoon` + compuerta de beta en `list_my_vehicles` quedarán muertos tras el rollout de F6~~ — retirados en el rollout (mig `20260904`); queda solo el campo `beta: true` de compatibilidad en el payload | Baja (cerrado) | ✅ 4-sep-2026 |
| `App.jsx` con 1591 líneas (medido junio 2026) — refactor a componentes más pequeños | Media | F3 |
| Credenciales de admins NO migradas a BD | Media | F1 |
| `OpRedeem.jsx` sin cablear al nuevo flujo de QR | Alta | F2 |
| `updateConfig` en `dataService.js` como código zombie | Baja | F7 |
| Warning de chunk size >500KB | Baja | Cuando bundle pase 1MB |
| ~~Service Worker error con chrome-extension scheme~~ | Cosmético | ✅ **RESUELTO** (`5270f98`) — guard `url.protocol` http/https al tope del handler fetch |
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

### 7.1-bis Deudas resueltas (reconciliación v2.4)

| Item | Evidencia |
|---|---|
| Service Worker error con esquema `chrome-extension` al cachear | ✅ `5270f98` — guard `url.protocol` (allowlist http/https) al tope del handler `fetch` |
| Service Worker sin versionado de cache | ✅ `f47c257` — `CACHE_NAME` con `__BUILD_HASH__` + registro eager + flujo de update + `activate` que limpia caches viejas |
| `OpRaffle` con estado huérfano (`opRafClient`/`Scan`/`Qty`, `opSearch`) sin cablear al ctx | ✅ `9b4c6b3` |
| Modal de calificación disparándose en rifa/canje (delta de visits + `last_operator_id` pegajoso) | ✅ `5b630a4` (FIX-MODAL) — ver Track de Seguridad |

### 7.2 Deuda operacional

| Gestión | Inicio recomendado | Crítica para |
|---|---|---|
| Cuenta Twilio Business | Semana 1 | F5 |
| Aprobación WhatsApp Business via Twilio | Semana 1 | F5 |
| Plantillas WhatsApp pre-aprobadas (mínimo 2) | Semana 2 | F5 |
| Política de privacidad publicada | Semana 1 | F5 |
| Logo de empresa para WhatsApp Business | Semana 1 | F5 |
| **Logo de Puntos Plus diseñado** | YA (bloquea R1b) | R1b |
| Coordinación técnica con PROPER | YA (adelantada v3.0) | F7a |
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
- ✅ **EJECUTADO 27-jul-2026:** `club-turkaj.vercel.app` → `puntos-plus.vercel.app`, repo renombrado a `victorsut/puntos-plus`, nombre formalizado en código y documentos. Transición hecha en fase de pruebas (pre-lanzamiento) precisamente para no romper PWAs instaladas a escala.

**Fase de notificaciones (campana + inbox in-app)**
- La campana del header de la referencia visual se pospuso (D34): en su lugar va el botón de menú de usuario.
- Alcance futuro: centro de notificaciones in-app (inbox persistente) integrado con el push existente.
- Cuándo: post-roadmap, o junto a F5/F6 si el uso lo justifica.

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

### Versión 4.2 — 4 de septiembre de 2026

**F6 Vehículos en producción para TODOS los socios** — rollout decidido por el
dueño ("la ventana sí va para todos"):

- **Beta retirada (mig `20260904_f6_rollout_vehiculos`):** `list_my_vehicles`
  ya no consulta compuerta alguna; se eliminan la tabla `vehicles_beta`, la
  clave `program_config.vehicles_beta`, las RPCs `admin_set_vehicles_beta` /
  `admin_list_vehicles_beta` y la tarjeta "Beta de Vehículos" de Admin →
  Configuración. El payload conserva `beta: true` solo para PWA con el
  placeholder cacheado (fleco anotado en F6).
- **Frontend:** `VehiclesSoon` (PRÓXIMAMENTE) eliminado; `VehiclesScreen` carga
  la lista (spinner, error con Reintentar) y monta `VehiclesHome` como chunk
  perezoso con el mismo reintento del 3-sep. El selector de vehículo del modal
  de calificación deja de exigir beta.
- **Datos:** placa duplicada ABC123 del socio de pruebas "Fulano de tal"
  limpiada en la misma migración (regla: se conserva la fila más antigua por
  socio+placa). Verificado en Supabase que la reparación `20260903c` sí corrió;
  el vehículo de Fernando M. fue borrado después por el dueño en una prueba
  (`delete_my_vehicle`, 3-sep 14:26) y NO se recrea.
- **Inicio → cuadro VEHÍCULO (referencia PANTALLA DE INICIO):** sin rótulo
  PRÓXIMAMENTE; el socio con vehículos ve el ARTE de su principal en su color
  sobre el mismo fondo del cuadro (`home/VehicleBentoTile`, caché por socio en
  localStorage para pintar al instante + refresco por `list_my_vehicles`); sin
  vehículos, el carrito de siempre. Verificado con arnés `tools/harness/`
  (captura ORO/PLATINO/BLACK, con y sin vehículo). **Encaje del arte (misma
  tarde, referencias POR CORREGIR):** la sombra pegaba con el título y cada
  arte usa distinto el lienzo → el cuadro MIDE el contorno real del dibujo
  (`getBBox`, sombra incluida) y lo escala y centra en el área libre sobre el
  título (90 % del ancho / 86 % del alto, tope ×1.3); se re-mide al llegar el
  chunk calcado y al cambiar el tamaño del cuadro. Verificado con 7 casos
  (Navi, Hilux, sedán y moto genéricos, CX-5, Hiace, Torito).
- **Rifa → cambio de mes con ARRASTRE (pedido del dueño):** la tarjeta del
  premio pasa a un carrusel por mes (año en curso hasta el actual) con la
  MISMA animación del cambio de vehículo: sigue al dedo, resistencia en los
  extremos, encaje con rebote, activa a escala completa y vecinas atrás;
  puntos y flechas ‹ › fijan la dirección; compra y participantes entran
  escalonados desde esa dirección; la altura del carril sigue a la tarjeta
  activa. El gesto se extrajo a `hooks/useSwipeTrack` (+ `slideIn`) y
  Vehículos lo consume también (sin cambio visual). Arnés `tools/harness/
  raffle.html` con ctx simulado; capturas claro/oscuro verificadas.
- **D24 cerrada (misma tarde, mig `20260904b`):** umbrales de las alertas de
  servicio EDITABLES por el admin (aviso previo por fecha/km y cadencia de los
  recordatorios de vencido; tarjeta nueva en Configuración, RPC auditada) y
  SILENCIO por vehículo (interruptor "Recordatorios de servicio" en Datos y
  ajustes, `vehicles.alerts_muted`; el RPC de candidatos lo excluye). Cron
  `api/vehicle-service-alerts` y la ventana Vehículos leen la misma config.
- **Validación del dueño (4-sep):** rollout, cuadro Vehículo del inicio, carrusel
  de la rifa, D24 y las artes Pulsar/CGL/DR — "todo bien".
- **Deuda documental saldada:** `ESTADO-PROYECTO.md` reescrito como referencia
  técnica vigente (stack, árbol del repo, accesos por rol, schema por dominio,
  Realtime, triggers, 125 RPCs por familia, endpoints y crons, variables de
  entorno, funcionalidad por vista, reglas vigentes, estaciones, herramientas
  de verificación, pendientes). El plan sigue viviendo en este ROADMAP.
- **Reconciliación de flecos:** D22 (plazo y estación del premio de rifa)
  estaba IMPLEMENTADO desde el 6-ago (`20260806d`, formulario de rifa y modal
  del ganador) — la nota de "fleco abierto" en §5.2 era un desfase; se marca
  cerrado. Queda D4 como único fleco de producto: precios de combustible por
  estación (hoy globales en `program_config.fuel_prices`).
- **`DEPLOY.md`** renombrado a Puntos Plus.
- **D4 cerrada (mig `20260904c`):** precios de combustible globales o POR
  ESTACIÓN — interruptor auditado en la tarjeta Precios de Combustible
  (`settings/FuelPricesCard`, extraída de Settings), precio propio por estación
  con el mismo modal y motivo (`FuelPricesModal` con `station`), "Usar los
  precios globales" para volver, y `register_purchase` resuelve el precio con
  `fuel_price_for`. Arnés `tools/harness/d4.html` verificado.
- **Dashboard: puntos canjeados REALES (mig `20260904d`):** `get_admin_kpis`
  agrega `redemptions` (cantidad y suma de `points_spent`, total y mes en
  curso; también solo entregados); el cuadro "Canjeados" del inicio usa la
  suma real y el promedio del catálogo × cantidad queda como respaldo con la
  etiqueta "(estimado)" si el RPC no responde.
- **Historiales: filtros compactos (pedido del dueño):** de hasta tres filas
  de chips (período · mes/año · tipo) a UNA fila de períodos derivada de los
  datos (Hoy · meses · años · Todo) y el filtro de TIPO como icono de embudo
  con menú anclado en la esquina derecha (mismo hueco del reloj de
  pendientes en Canjes; acento + punto cuando hay un tipo elegido); el
  subtítulo dice qué se está viendo ("12 canjes · Sep 2026"). Aplica a
  Compras y Puntos y a Canjes (`history/HistoryFilters`). Validado en el
  celular; segunda pasada el mismo día: orden de la fila Todo · años · Hoy ·
  meses (reciente → antiguo) para historiales largos, y encabezado + fila
  PEGAJOSOS al desplazar la lista (se cambia de filtro desde el fondo).
- **Canjes y Rifa con bloque superior FIJO (pedido del dueño, misma tarde):**
  en la pestaña Canjes el título y las categorías quedan pegados al desplazar
  los premios; en Rifa el encabezado, el carrusel del premio y (en pantallas
  altas) la compra de boletos quedan fijos y solo la lista de participantes
  se desplaza. Como el lienzo raíz de la app lleva `overflow-x: hidden` (un
  scroll container que nunca se desplaza) el sticky contra la ventana no
  aplica: ambas vistas pasan a ser su PROPIO contenedor de scroll
  FIJO al viewport (`position: fixed`, bottom 55 = BottomNav, `overflow-y: auto`,
  `overscroll-behavior: contain`), igual que HistorySheet. La primera versión
  (`height: 100dvh` sin fijar) dejaba que el documento se desplazara en el
  celular y escondiera los títulos — corregida el mismo día.
- **GO-LIVE:** el rollout de Vehículos sale del checklist; restante ≈4-8 hs
  (solo go-live).

### Versión 4.1 — 3 de septiembre de 2026

**F6 Vehículos cerrada en código** — verificada contra los commits del 15-ago
al 3-sep y las migraciones ejecutadas en producción:

- **F6 E1 (15-ago → 2-sep):** entidad `vehicles` con BETA controlada, catálogo
  híbrido D23, servicio por fecha o km, descargo legal de marcas y **50 artes
  SVG por modelo** calcadas de referencias propias (pipeline en `tools/artes/`).
- **F6 E2 (19-ago):** combustible + telemetría (selector y odómetro al calificar,
  auto-asignación por trigger, km/gal, km/día).
- **F6 E3 (2-sep):** análisis de combustible, consumos manuales, gráficas y
  **push de servicio D24** (cron diario). D24 implementado con umbrales FIJOS
  (7 días / 500 km) y sin silencio por vehículo — anotado como fleco.
- **F6 E4 (3-sep):** confirmación de servicio desde la notificación; los
  recordatorios siguen hasta confirmar.
- **F6 E2b (3-sep):** unificación — la tabla es la verdad, el jsonb legado es
  espejo por trigger; **Mi cuenta → Vehículos retirado** (decisión del dueño:
  toda la gestión en la pestaña). Incidente del backfill (2 vehículos borrados)
  reparado el mismo día en `20260903c` (Apéndice B).
- **Validaciones del dueño (3-sep):** telemetría, selector con compras reales
  y E4 — "todo funciona bien".
- **GO-LIVE** suma el rollout de Vehículos y la revocación de la API key
  "Pruebas" de PROPER.
- **Fix de robustez (3-sep, tarde):** pantalla en blanco al abrir Vehículos
  justo después de un deploy (el chunk perezoso con hash viejo ya no existía y
  React.lazy tumbaba el árbol) → `ChunkBoundary` en ScreenRouter (recarga una
  vez, luego Reintentar con la BottomNav viva), reintento del import de
  VehiclesHome y `/assets/` excluido del rewrite SPA (404 limpio en vez de
  HTML). La "pantalla negra de verificación" que vio el dueño es el Security
  Checkpoint de Vercel (rutina de la plataforma, no de la app).
- **Pulido de Vehículos (3-sep, tarde):** Eliminar sale de la vista y pasa a
  una ZONA DE RIESGO dentro de Datos y ajustes (aviso + casilla "Entiendo que
  no se puede deshacer" + botón rojo); hojas de personalizar, datos y servicio
  sobre `BottomSheet` nuevo con apertura/cierre animados, arrastre hacia abajo
  para cerrar y tap fuera.
- **Animación al cambiar de vehículo (3-sep, tarde):** el carrusel de artes
  sigue al dedo (touch-action pan-y, resistencia en los extremos, encaje con
  rebote), la tarjeta activa a escala completa y las vecinas atrás y
  atenuadas; los cuadros de información entran escalonados en la dirección
  del cambio y la sección de combustible los sigue (Web Animations API, sin
  remontar componentes).
- **Historial de cargas por vehículo (3-sep, tarde):** al desplegarlo muestra
  solo las cargas del vehículo seleccionado; "Ver todas (N)" abre el historial
  general (todos los vehículos + cargas sin asignar, donde vive el editor de
  reasignación) y "Solo este vehículo" regresa; cambiar de vehículo vuelve al
  filtro.
- **Regla operativa nueva (§0.3):** el ROADMAP se sincroniza en el mismo commit
  en que se cierra una etapa — este documento llevaba 19 días desfasado.
- **Restante de desarrollo:** ≈15-30 hs (rollout + flecos D22/D4/D24 + go-live)
  + F8 (baja) + F9 opcional + gestiones externas. `ESTADO-PROYECTO.md` sigue
  en su versión de junio (deuda documental, Apéndice B).

### Versión 4.0 — 15 de agosto de 2026

**Reconciliación con la realidad del repo** — verificada contra código y
migraciones (no contra memoria). Un mes de ejecución (17-jul → 15-ago) cerró la
mayor parte del plan v3.0:

- **CERRADAS desde v3.0:** SEC-lite (25-jul) · **SEC.C completo** C.1–C.6
  (28-jul→11-ago, vía sesiones con token + cierre de la API abierta; absorbe
  SEC.B.9 y el vector del raffle — el track de seguridad queda SIN bloques
  abiertos) · **F7a** API PROPER (29→30-jul, serverless Vercel + canje completo
  desde el POS + `docs/API-PROPER.md`) · **F1** (empresa/estaciones/precios/KPIs;
  sin toggle precios por estación D4) · **F2 incluida PROMO-2** (6-ago:
  conversión y eventos POR TIER F2.1, localizaciones D17, tiendas D18, lavados
  por consumo + beneficio recurrente mensual `max_uses_per_member_month`; D20
  cubierto por redemptions costo-0) · **F5 en código** (8-ago: OTP de registro
  con Twilio Verify APAGADO hasta credenciales; dirección estructurada;
  confirmación de boletos; password → WhatsApp por decisión del dueño 14-ago).
- **EN PAUSA por decisión del dueño (11-ago):** F4 tarjeta física (sistema
  cerrado SOLO DIGITAL; esquema listo, no implementar sin pedido) y F7b.
- **PARCIAL:** F9 — grupo Análisis del admin (13-ago) cubre el grueso.
- **Track R1b:** todas las vistas base cerradas (menú, modo claro/oscuro, paleta
  por nivel, historiales con filtros, Admin v2, code splitting por rol,
  divisiones <500 líneas, splash de entrada con monedas PP 15-ago); sigue activo
  para correcciones puntuales.
- **NUEVOS tracks operativos:** **TIENDAS** (Play/App Store — preparado 14-ago,
  checklist en `docs/TIENDAS.md`; bloqueado por cuentas Play Console/Apple
  Developer del dueño; decisiones: Sign in with Apple SÍ + APNs SÍ) y
  **GO-LIVE** (encender motor de degradación y `phone_verification`).
- **Restante de desarrollo:** **F6 Vehículos** (única fase grande), flecos D22
  (plazo/estación del premio de rifa) y D4, F8 spike (baja), resto de F9
  (opcional). ≈95-135 hs + gestiones externas (PROPER, Twilio, tiendas).

### Versión 3.0 — 17 de julio de 2026

**RE-PLANIFICACIÓN (Nivel 2)** — la primera desde v2.1; v2.4/v2.5 fueron
reconciliaciones. Decisiones nuevas D30–D36.

- **MARCA:** "Puntos+" → **"Puntos Plus"** (D30). Renombrada en todo el documento
  (las entradas históricas de este changelog conservan "Puntos+"). Slug técnico:
  `puntos-plus`.
- **NUEVO ORDEN** (§4.1/§4.2): B0 → R1a → FA → PROMO-1 → SEC-lite → F7a → F1 →
  F2(+PROMO-2) → F4 → F7b → F5 → F6 → F8/F9, con R1b como track paralelo
  continuo. FA mantiene su posición crítica por decisión del dueño.
- **F3 DISUELTA** (D31): R1a (rebrand exprés, §5.R1a) + track R1b (rediseño
  iterativo por vistas, §5.R1b) con la spec del Home cerrada cuadro por cuadro
  (D34), la vista Promociones (D33) y las animaciones firmadas (D35), basadas en
  `REFERENCIAS INTERFAZ/`.
- **F7 DIVIDIDA** (D31): F7a core PROPER adelantada a posición 5; F7b
  physical-members tras F4. Coordinación PROPER adelantada a la semana 1.
- **NUEVA FASE PROMO-1** (D32): motor de promociones gestionables server-side en
  `register_purchase` (`promo_rules` + `promo_applications`, sin stacking,
  timezone America/Guatemala). PROMO-2 (`grant_reward`: lavado por consumo)
  dentro de F2.
- **PROMOS VISUALES** (D33): `promotions` + image_url/category/valid_until +
  Supabase Storage; en el home, el cuadro rojo se sustituye por el carrusel de
  cards reales.
- **SEC-LITE SLOTTEADO** (posición 4, §5.SEC-lite): primer scope formal de SEC.A
  + cierre del vector cliente del raffle, antes del go-live de la API.
- **FB CERRADA** (D36): caso ángel macario resuelto sin ajuste (hablado con el
  cliente); sin investigación retroactiva de otros miembros.
- **CAMPANA POSPUESTA** (D34): fase de notificaciones a Apéndice C; el botón del
  header abre el menú de usuario.
- Estimación restante actualizada: ≈550-750 hs (6-11 meses).

### Versión 2.5 — 29 de junio de 2026

Completar F7 + corregir la inconsistencia de dependencias de F4. **NO se cambió
el orden** (FB→FA→F1 sigue; F7 sigue en su cadena F2→F4→F7, no se adelantó).

- **DETALLE DE F7 RECUPERADO E INTEGRADO:** §5.F7 dejó de ser la elipsis "sin
  cambios respecto a v2.1" y ahora tiene el detalle completo recuperado de v2.1
  (`8332707`): objetivo, alcance (7 endpoints REST), 2 tablas (`api_clients`,
  `api_request_log`), 11 sub-fases (F7.1–F7.11), riesgos, criterios de "listo" y
  dependencias (F4 + confirmación PROPER). Estimación preservada (55-74 hs). El
  cuerpo recuperado no tenía strings de marca ni fechas a armonizar (la marca
  vivía en D9 §2, ya "Puntos+"; el calendario PROPER vive en §3.5/§4.3/§7.2 como
  "Semana ~22").
- **INCONSISTENCIA F4 CORREGIDA → F4 ← F2 (no F3):** el diagrama §4.2 ahora pone
  `F2 → F4 → F7`. El `F3 → F4` anterior era un **remanente del F4 grande de v2.1**
  (que incluía la optimización de impresión); al separarse **FA** en v2.2, F4 se
  redujo a tarjeta física + extensiones operador, que reutiliza el
  canje/QR-universal/localizaciones (D17/D18/D20) de **F2** — sin dependencia
  técnica sobre F3 (solo cosmética). §5.4.4 ya decía F4 ← F2; ahora el diagrama
  coincide. F7 sigue colgando de F4 (expone endpoints `/physical-members/*` que
  necesitan la infra de F4). F5 sigue dependiendo de F3.
- **Intacto:** el resto del orden (FB→FA→F1→F2…), §0–§3, §4.3, §5.FA/F1–F6/F8/F9,
  Track de Seguridad, apéndices.

### Versión 2.4 — 29 de junio de 2026

**Reconciliación (Nivel 1) + fusión de documentos. NO re-planificación:** no se
reordenó nada ni se slotteó seguridad en el flujo F0→F9.

- **FUSIÓN:** ROADMAP.md pasa a ser el **plan maestro único** (producto +
  seguridad). El **Track de Seguridad** se absorbió íntegro (sin resumir) desde
  `ESTADO-PROYECTO.md`, que quedó **recortado a referencia técnica** + puntero al
  ROADMAP.
- **NUEVA sección "Track de Seguridad (SEC)"** — paralela, sin posición en §4.2:
  SEC.A (no iniciado, sin scope), SEC.B (✅ CERRADO, B.3–B.8 con commits/migraciones),
  hallazgo de arquitectura anon+token, SEC.B.9 (deuda dependiente de SEC.C, con
  la nota `REVOKE … FROM PUBLIC`), SEC.C (pendiente, solo dependencia), FIX-MODAL
  (✅ CERRADO).
- **RECONCILIADO F0:** estado real F0.1–F0.3 ✅ (incl. F0.3.5–F0.3.9, con commits);
  F0.4 pendiente (`AuditLog.jsx` no existe), F0.5 🔶 (cubierto por ReasonModal, a
  confirmar), F0.7 ✅.
- **RECONCILIADO + RE-NUMERADO FB:** de "🔜 Próxima" a "✅ Construido" (migraciones
  `fb5`/`fb7`/`fb9`, `existing_rpcs_core`, `modify_member_points`,
  `grant_special_day_bonus` + refactor cliente). Sub-fases re-numeradas para
  coincidir con los commits, con **NOTA DE EQUIVALENCIA** plan-viejo → plan-nuevo.
  Decisiones **FB.5/FB.6 (caso ángel macario) siguen ABIERTAS**.
- **Deudas resueltas marcadas** (§7.1-bis): sw chrome-extension (`5270f98`),
  versionado de cache (`f47c257`), `OpRaffle` estado huérfano (`9b4c6b3`),
  FIX-MODAL (`5b630a4`).
- **Huecos preservados como abiertos** (no resueltos ni priorizados): caso ángel,
  SEC.A sin scope, credenciales admin no migradas, RLS de purchases (→ SEC.C).
- **Intacto:** §0–§3, §4.2, §4.3, §5.FA–§5.F9, Apéndices A/C/D/E, §7.2, §9.

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
- Sección 1 reorganizada con identidad de Puntos Plus como plataforma.
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
