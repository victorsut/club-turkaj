// api/_lib/push.js — núcleo del motor de notificaciones.
// Compartido por /api/send-push (envíos directos: compra, etc.) y
// /api/degradation-alerts (cron diario). No es una ruta: Vercel
// ignora los archivos bajo carpetas con guión bajo.
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:clubturkaj@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Envía una notificación a TODOS los dispositivos suscritos de los
// miembros indicados y la registra en `notifications` (dedupe + futuro
// inbox). Las suscripciones muertas (410/404) se limpian solas.
//
// notification: { type, title, body, url, data }
//   · type  — 'purchase' | 'degradacion' | 'general' | ... (el SW rutea el click)
//   · url   — deep-link al tocar la notificación (default '/')
//   · data  — campos extra que el SW pasa al cliente (operatorId, purchaseId...)
export async function pushToMembers(memberIds, notification) {
  const ids = (Array.isArray(memberIds) ? memberIds : [memberIds]).filter(Boolean);
  if (!ids.length) return { sent: 0 };

  const { type = 'general', title, body, url = '/', data = {} } = notification;

  const { data: subs, error } = await sb
    .from('push_subscriptions')
    .select('*')
    .in('member_id', ids);
  if (error) throw new Error(error.message);

  const payload = JSON.stringify({
    title: title || 'Puntos Plus',
    body: body || 'Tenés una notificación',
    icon: '/logo.png',
    tag: `${type}-${Date.now()}`,
    type,
    url,
    ...data,
  });

  let sent = 0;
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
      }, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await sb.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }

  // Registro en `notifications` — best effort: si la migración aún no
  // corrió (o falta la service key), el push ya salió y no se revierte.
  try {
    await sb.from('notifications').insert(ids.map(id => ({
      member_id: id, type, title, body, data,
    })));
  } catch (e) { /* tabla ausente o sin permiso: solo se pierde el log */ }

  return { sent };
}
