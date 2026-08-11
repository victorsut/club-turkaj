// src/lib/pushNotifications.js
import { sb } from './supabaseClient';
import { savePushSubscription } from '../services/secureReads';
import { getOperatorToken } from '../services/sessionTokens'; // SEC.C.6: send-push exige sesión de operador

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function subscribePush(memberId) {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY || !memberId) return false;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = sub.toJSON();
    if (sb) {
      // SEC.C.4: push_subscriptions quedó cerrada (antes cualquiera
      // podía leer o borrar las suscripciones de otros) — se guarda por
      // RPC con la sesión del miembro, que además deriva el member_id.
      const res = await savePushSubscription({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      });
      if (res.error) console.error('[Push] Save error:', res.error);
      else console.log('[Push] ✅ Subscribed');
    }
    return true;
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    return false;
  }
}

// Envío genérico del motor de notificaciones: type rutea el click en el
// SW ('purchase' abre el modal de calificación; otros usan url) y data
// lleva los campos extra que el SW devuelve al cliente.
export async function sendPushToMember(memberId, { title, body, type = 'general', url, data } = {}) {
  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId,
        title: title || 'Puntos Plus',
        body: body || 'Tenés una notificación',
        type,
        url,
        data: data || {},
        // SEC.C.6: el envío lo dispara el navegador del operador tras
        // registrar una compra — su token autoriza el push.
        operator_token: getOperatorToken()?.token || null,
      }),
    });
    const result = await res.json();
    console.log('[Push] Sent:', result);
    return result;
  } catch (err) {
    console.error('[Push] Send error:', err);
    return null;
  }
}
