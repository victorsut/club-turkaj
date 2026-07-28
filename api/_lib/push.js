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

// Tipos SUPRIMIBLES: el SW del dispositivo no los muestra si la app está
// a la vista (el modal Realtime ya cubre ese caso). Su registro en
// `notifications` NO se hace al enviar — lo hace el SW vía
// /api/log-notification SOLO cuando la notificación realmente se mostró
// (así el inbox no lista avisos que el cliente nunca vio como push
// porque estaba mirando el modal). El resto se registra al enviar.
export const LOG_ON_DISPLAY_TYPES = ['purchase', 'reward'];

// Envía una notificación a TODOS los dispositivos suscritos de los
// miembros indicados. Las suscripciones muertas (410/404) se limpian.
//
// notification: { type, title, body, url, data }
//   · type  — 'purchase' | 'reward' | 'degradacion' | 'general' | ...
//   · url   — deep-link al tocar la notificación (default '/')
//   · data  — campos extra que el SW pasa al cliente (operatorId, purchaseId...)
export async function pushToMembers(memberIds, notification) {
  const ids = (Array.isArray(memberIds) ? memberIds : [memberIds]).filter(Boolean);
  if (!ids.length) return { sent: 0 };

  const { type = 'general', title, body, url = '/', data = {} } = notification;
  const logOnDisplay = LOG_ON_DISPLAY_TYPES.includes(type);

  const { data: subs, error } = await sb
    .from('push_subscriptions')
    .select('*')
    .in('member_id', ids);
  if (error) throw new Error(error.message);

  let sent = 0;
  for (const memberId of ids) {
    const memberSubs = (subs || []).filter(s => s.member_id === memberId);
    if (!memberSubs.length) continue;

    // notifId POR MIEMBRO: si tiene varios dispositivos, todos loguean
    // el mismo id y el upsert de log-notification deduplica.
    const payload = JSON.stringify({
      title: title || 'Puntos Plus',
      body: body || 'Tenés una notificación',
      icon: '/logo.png',
      tag: `${type}-${Date.now()}`,
      type,
      url,
      ...(logOnDisplay ? { logOnDisplay: true, notifId: crypto.randomUUID(), memberId } : {}),
      ...data,
    });

    for (const sub of memberSubs) {
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
  }

  // Registro inmediato SOLO para tipos siempre-visibles (degradacion,
  // general...). Best effort: el push ya salió y no se revierte.
  if (!logOnDisplay) {
    try {
      await sb.from('notifications').insert(ids.map(id => ({
        member_id: id, type, title, body, data,
      })));
    } catch (e) { /* tabla ausente o sin permiso: solo se pierde el log */ }
  }

  return { sent };
}
