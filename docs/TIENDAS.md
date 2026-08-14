# Puntos Plus en Play Store y App Store — Checklist

> Auditoría 14-ago-2026. La app se empaqueta como TWA (Android) o wrapper
> (iOS) sobre https://puntosplus.vercel.app — el paquete de tienda carga el
> mismo JS del servidor, así que toda mejora web aplica a la app de tienda.

## ✅ Ya cumplido en el código (14-ago)

- **PWA completa:** HTTPS, service worker con offline básico, instalable.
- **manifest.json completo:** `id`, `scope`, `orientation: portrait`, `lang`,
  `categories`, descripción larga, iconos **192 y 512** en variantes `any` y
  `maskable` (los 192 se generaron de los 512 oficiales).
- **Política de privacidad pública:** `/privacidad.html` — corregida: decía
  login con *Facebook* (era de una versión vieja); ahora declara **Google**,
  la **ubicación opcional** del beneficio WiFi (no se almacena) y las
  **notificaciones push** opcionales.
- **Eliminación de datos:** `/eliminacion.html` con la opción EN LA APP como
  vía principal (Menú → Mi Cuenta → Eliminar cuenta, RPC `delete_my_account`,
  inmediata) + correo + presencial.
- **Borrado de cuenta dentro de la app:** obligatorio en ambas tiendas
  (Apple 5.1.1(v) y Play desde 2024) — ✅ implementado desde el 6-ago.
- **Arranque liviano:** code splitting por rol (cliente 354 kB).

## 📱 Google Play (TWA — PWABuilder o Bubblewrap)

1. **Generar el paquete:** pwabuilder.com → URL `https://puntosplus.vercel.app`
   → paquete Android (elegir un `package_name` definitivo, p. ej.
   `com.turkaj.puntosplus` — NO se puede cambiar después).
2. **⚠️ assetlinks.json (CRÍTICO):** sin él la app abre con la barra del
   navegador visible. Crear `public/.well-known/assetlinks.json` con la
   huella SHA-256 del certificado de **firma de Play** (Play Console →
   Configuración → Firma de apps → certificado de la clave de firma de apps):

   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.turkaj.puntosplus",
       "sha256_cert_fingerprints": ["AA:BB:CC:...huella de Play Console..."]
     }
   }]
   ```
   Avisar a Claude con el package name y la huella para dejarlo desplegado.
3. **Play Console** (cuenta de desarrollador, USD 25 una única vez):
   - Ficha: descripción, mínimo 2 capturas de teléfono, ícono 512, gráfico
     de funciones 1024×500.
   - **Data Safety** (debe COINCIDIR con privacidad.html): se recopilan
     nombre, teléfono, correo, DPI, fecha de nacimiento, historial de
     compras; ubicación solo en uso y no persistida; datos cifrados en
     tránsito; el usuario puede pedir eliminación. Encargados: Supabase,
     Vercel, Google (auth).
   - URL de política de privacidad: `https://puntosplus.vercel.app/privacidad.html`
   - URL de eliminación de cuenta: `https://puntosplus.vercel.app/eliminacion.html`
   - Clasificación de contenido (apta para todos) y público objetivo (18+
     recomendado por ser programa de combustible, evita requisitos de niños).
4. **Push:** el TWA usa el web push del navegador — ya funciona, nada extra.
5. **Cámara:** solo la usa el rol operador (escáneres QR). El TWA pide el
   permiso vía web al usarla; no requiere declaración nativa adicional.

## 🍎 App Store (iOS) — más exigente

1. **Empaquetado:** PWABuilder iOS genera un proyecto Xcode; se necesita Mac
   y cuenta Apple Developer (USD 99/año).
2. **⚠️ Sign in with Apple (guideline 4.8) — DECISIÓN PENDIENTE del dueño:**
   como la app ofrece login con Google, Apple EXIGE ofrecer también
   "Sign in with Apple". Opciones:
   - (a) Implementarlo — Supabase Auth lo soporta (provider `apple`); requiere
     la cuenta de Apple Developer para las llaves.
   - (b) Ocultar el botón de Google SOLO en el build iOS y dejar únicamente
     teléfono + contraseña (sin login de terceros la regla no aplica).
3. **⚠️ Push en iOS:** el wrapper (WKWebView) NO soporta web push — la
   versión de App Store quedaría sin notificaciones, salvo que se integre
   push nativo (APNs) en el paquete. Nota: la PWA instalada desde Safari
   (iOS 16.4+) SÍ soporta web push sin pasar por la tienda — es una
   alternativa válida para iPhone mientras tanto.
4. **Riesgo guideline 4.2 (minimum functionality):** Apple rechaza "sitios
   envueltos" sin valor de app. Mitigación: en las notas de revisión
   describir la funcionalidad real (tarjeta digital con QR, niveles,
   canjes con confirmación en vivo, rifas, push) y proveer una cuenta demo
   de prueba (miembro con puntos) al revisor.
5. **Permisos con texto (Info.plist del wrapper):**
   - `NSLocationWhenInUseUsageDescription` — "Detecta si estás en una
     estación Turkaj para mostrarte la red WiFi del beneficio."
   - Cámara: NO declararla si el paquete de tienda es solo para clientes
     (el escáner es del operador).
6. **Borrado de cuenta en-app:** ✅ ya cumplido.

## Opcionales que suman

- **Screenshots en el manifest** (`screenshots`): mejoran el diálogo de
  instalación de la PWA y el score de PWABuilder — capturar 2-3 pantallas
  del cliente (inicio, canjes, tarjeta) en 1080×1920 y avisar para
  agregarlas.
- **`user-scalable=no`** en index.html: Apple a veces lo observa por
  accesibilidad (bloquea el zoom). Riesgo bajo; si la revisión lo objeta,
  se quita en un cambio de una línea.
- **Cuenta demo para revisores** (ambas tiendas): un miembro de prueba con
  puntos y un canje disponible.
