// src/lib/swRegistration.js
// ============================================================
// Registro del Service Worker + deteccion de actualizaciones.
// ============================================================
// Registra /sw.js de forma eager para todos los clientes y
// notifica a la UI cuando hay una version nueva esperando.
// ============================================================

let updateAvailableCallback = null;
let waitingWorker = null;

export function setUpdateAvailableCallback(cb) {
  updateAvailableCallback = cb;
}

export function applyUpdate() {
  if (!waitingWorker) {
    console.warn('[SW Registration] No waiting worker found');
    return;
  }

  // Registrar el listener PRIMERO: se disparara cuando el SW nuevo
  // tome control tras skipWaiting. { once: true } evita reloads multiples.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW Registration] Controller changed, reloading');
    window.location.reload();
  }, { once: true });

  // DESPUES enviar el mensaje para activar el SW en espera.
  console.log('[SW Registration] Sending SKIP_WAITING to waiting worker');
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW Registration] Service Worker not supported');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[SW Registration] Registered:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          console.log('[SW Registration] New SW installing');

          newWorker.addEventListener('statechange', () => {
            console.log('[SW Registration] New SW state:', newWorker.state);

            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Es un UPDATE (no install inicial): ya habia un SW controlando.
              console.log('[SW Registration] Update available');
              waitingWorker = newWorker;
              if (updateAvailableCallback) {
                updateAvailableCallback();
              }
            }
          });
        });
      })
      .catch(err => {
        console.error('[SW Registration] Registration failed:', err);
      });
  });
}
