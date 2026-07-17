// public/sw.js — Club Turkaj Service Worker
// Push Notifications + Cache Offline

const CACHE_NAME = 'club-turkaj-__BUILD_HASH__';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
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
  let data = { title: 'Puntos Plus', body: 'Tenes una notificacion', icon: '/favicon.svg' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    tag: data.tag || 'club-turkaj',
    renotify: true,
    data: {
      url: data.url || '/',
      type: data.type || 'general',
      operatorId: data.operatorId || null,
      operatorName: data.operatorName || null,
      stationName: data.stationName || null,
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = data.url || '/';

  if (event.action === 'rate' && data.operatorId) {
    url = `/?rate=${data.operatorId}&opName=${encodeURIComponent(data.operatorName || '')}&station=${encodeURIComponent(data.stationName || '')}`;
  }

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
