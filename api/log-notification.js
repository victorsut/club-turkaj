// api/log-notification.js — registro en `notifications` de un push que
// el Service Worker del dispositivo REALMENTE mostró (tipos suprimibles
// del motor: si la app estaba a la vista, no hubo notificación y no se
// registra nada — el modal Realtime cubrió ese caso). El notifId viaja
// en el payload del push; con varios dispositivos, todos reportan el
// mismo id y el upsert deduplica.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sb, LOG_ON_DISPLAY_TYPES, signNotif } from './_lib/push.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Comparación en tiempo constante de dos hex del mismo largo.
function sigOk(provided, expected) {
  const a = Buffer.from(String(provided || ''), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id, member_id, type, title, body, data, sig } = req.body || {};
    if (!UUID_RE.test(id || '') || !UUID_RE.test(member_id || '') || !LOG_ON_DISPLAY_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Payload inválido' });
    }

    // SEC.C.6: el registro solo procede si la firma coincide con la que
    // el motor puso en el payload del push. El SW la reenvía; un tercero
    // no puede forjarla (no conoce el secreto) → no puede plantar filas.
    if (!sigOk(sig, signNotif(id, member_id))) {
      return res.status(403).json({ error: 'firma inválida' });
    }

    const { error } = await sb.from('notifications').upsert({
      id,
      member_id,
      type,
      title: String(title || '').slice(0, 160),
      body: String(body || '').slice(0, 600),
      data: data && typeof data === 'object' ? data : {},
    }, { onConflict: 'id', ignoreDuplicates: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
