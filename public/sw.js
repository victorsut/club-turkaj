// public/sw.js — Club Turkaj Service Worker
// Push Notifications + Cache Offline

const CACHE_NAME = 'club-turkaj-v2';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// ── Instalacion: pre-cachear recursos esenciales ──────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── Activacion: limpiar caches viejas ────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// ── Fetch: Cache First para assets, Network First para API ─
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

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
  let data = { title: 'Club Turkaj', body: 'Tenes una notificacion', icon: '/favicon.svg' };
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
