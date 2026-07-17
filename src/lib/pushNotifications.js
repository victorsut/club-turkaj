// src/lib/pushNotifications.js
import { sb } from './supabaseClient';

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
      const { error } = await sb.from('push_subscriptions').upsert({
        member_id: memberId,
        endpoint: subJson.endpoint,
        keys_p256dh: subJson.keys.p256dh,
        keys_auth: subJson.keys.auth,
      }, { onConflict: 'member_id,endpoint' });
      if (error) console.error('[Push] Save error:', error);
      else console.log('[Push] ✅ Subscribed');
    }
    return true;
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    return false;
  }
}

export async function sendPushToMember(memberId, notification) {
  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId,
        title: notification.title || 'Puntos Plus',
        body: notification.body || 'Tenés una notificación',
        data: {
          type: 'purchase',
          operatorId: notification.operatorId,
          operatorName: notification.operatorName,
          stationName: notification.stationName,
          actions: [
            { action: 'rate', title: '⭐ Calificar' },
            { action: 'dismiss', title: 'Cerrar' },
          ],
        },
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
