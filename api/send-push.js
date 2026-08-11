// api/send-push.js — envío directo de una notificación push a un
// miembro (o varios). Punto de entrada genérico del motor: el tipo y
// el deep-link viajan en el payload y el SW rutea el click por `type`.
// Lo llama el navegador del OPERADOR (compra registrada manualmente);
// el cron de degradación y el POS de PROPER usan pushToMembers directo
// (no este endpoint). SEC.C.6: exige token de operador válido — antes
// no tenía auth y cualquiera podía enviar push masivo con el remitente
// legítimo "Puntos Plus" (vector de phishing).
import { pushToMembers, sb } from './_lib/push.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { member_id, member_ids, title, body, type, url, data, operator_token } = req.body;

    // SEC.C.6: solo un operador con sesión válida puede enviar.
    // validate_session_token lanza si el token es inválido/ausente.
    try {
      const { data: opId, error } = await sb.rpc('validate_session_token', {
        p_token: operator_token || '', p_role: 'operator',
        p_rpc_name: 'send_push', p_allow_null: false, p_params: null,
      });
      if (error || !opId) return res.status(401).json({ error: 'unauthorized' });
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const ids = member_ids || member_id;
    if (!ids || (Array.isArray(ids) && !ids.length)) {
      return res.status(400).json({ error: 'member_id required' });
    }

    const result = await pushToMembers(ids, { type, title, body, url, data });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[send-push]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
