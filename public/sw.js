// public/sw.js — Puntos Plus Service Worker
// Push Notifications + Cache Offline

const CACHE_NAME = 'puntos-plus-__BUILD_HASH__';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/logo.png',
  '/manifest.json',
];

// ── Instalacion: pre-cachear recursos esenciales ──────────
self.addEventListener('install', (event) => {
  console.log('[SW] Install: cache name =', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(OFFLINE_URLS))
  );
  // No se llama skipWaiting() aqui: el SW nuevo queda en espera
  // hasta que el usuario pulse "Recargar" (mensaje SKIP_WAITING).
});

// ── Activacion: limpiar caches viejas ────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate: claiming clients');
  event.waitUntil(
    caches.keys().then(keys => {
      console.log('[SW] Existing caches:', keys);
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Mensaje desde el cliente: forzar activacion del SW en espera ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested from client');
    self.skipWaiting();
  }
});

// ── Fetch: Cache First para assets, Network First para API ─
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo cacheamos http(s). La Cache API rechaza put() para esquemas no-http,
  // y las extensiones del navegador inyectan requests chrome-extension:// que
  // entran a la rama de assets por su `destination` y rompen en el cache.put
  // ("Request scheme 'chrome-extension' is unsupported"). Allowlist http/https
  // cubre de paso moz-extension:, data:, blob:, etc. sin enumerarlos.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // No interceptar llamadas a Supabase ni a APIs externas
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('twilio.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return; // dejar pasar sin cache
  }

  // Para assets estaticos: Cache First
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Para la app principal (navegacion): Network First con fallback offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then(cached => cached || caches.match('/'))
      )
    );
    return;
  }
});

// ── Push Notifications ────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Puntos Plus', body: 'Tenes una notificacion', icon: '/logo.png' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  // El payload completo viaja en `data` (motor de notificaciones):
  // el click se rutea por `type` y los campos extra llegan al cliente.
  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'puntos-plus',
    renotify: true,
    data: Object.assign({}, data, { url: data.url || '/', type: data.type || 'general' }),
    actions: data.actions || [],
  };

  // Compra y premio: si la app está A LA VISTA, el modal Realtime de
  // calificación (o el chip de promo) ya lo cubre — no duplicar con una
  // notificación del sistema. Con la app cerrada, oculta o el teléfono
  // bloqueado no hay ventana visible → la notificación sí se muestra.
  // (Chrome permite omitir showNotification cuando hay una pestaña
  // visible del sitio; para otros tipos siempre se muestra.)
  event.waitUntil((async () => {
    if (data.type === 'purchase' || data.type === 'reward') {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (wins.some(w => w.visibilityState === 'visible')) return;
    }
    await self.registration.showNotification(data.title, options);
  })());
});

// Deep-link por tipo de notificación cuando la app está CERRADA
// (con la app abierta, el cliente recibe NOTIFICATION_CLICK y decide).
function urlForNotification(data) {
  if (data.type === 'purchase' && data.operatorId) {
    // Abre el modal de calificación + encuesta de ESA compra
    return '/?rate=' + data.operatorId +
      '&opName=' + encodeURIComponent(data.operatorName || '') +
      '&station=' + encodeURIComponent(data.stationName || '') +
      (data.purchaseId ? '&purchaseId=' + data.purchaseId : '') +
      (data.points != null ? '&pts=' + data.points : '') +
      (data.amount != null ? '&amount=' + data.amount : '');
  }
  return data.url || '/';
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = urlForNotification(data);

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
