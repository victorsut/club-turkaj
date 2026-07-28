// api/send-push.js — envío directo de una notificación push a un
// miembro (o varios). Punto de entrada genérico del motor: el tipo y
// el deep-link viajan en el payload y el SW rutea el click por `type`.
// Lo usa el cliente (compra registrada por el operador); el cron de
// degradación usa /api/degradation-alerts.
import { pushToMembers } from './_lib/push.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { member_id, member_ids, title, body, type, url, data } = req.body;
    const ids = member_ids || member_id;
    if (!ids || (Array.isArray(ids) && !ids.length)) {
      return res.status(400).json({ error: 'member_id required' });
    }

    const result = await pushToMembers(ids, { type, title, body, url, data });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
