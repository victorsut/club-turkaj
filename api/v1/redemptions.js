// api/v1/redemptions.js — flujo de canje de premios desde el POS (F7a.3, PROPER).
//
// El flujo COMPLETO de entrega vive en PROPER (decisión 30-jul): el
// operador escanea el QR del premio o escribe el código, pide la
// confirmación desde el POS, el cliente confirma en su celular
// (Puntos Plus) y PROPER imprime el comprobante. El comprobante SOLO
// existe en la entrega — al acumular puntos no se imprime nada.
//
// GET  /api/v1/redemptions?code=TK-3F9A2C
//      Datos del canje + confirm_status (sirve de POLL mientras se
//      espera la confirmación del cliente). No cambia el estado.
// GET  /api/v1/redemptions?card_code=CTOD-00042
//      Canjes PENDIENTES del miembro por su tarjeta (escaneada o
//      escrita) — paridad con la vista de operador.
// POST /api/v1/redemptions
//      Body: { code, action: 'request'|'cancel'|'deliver',
//              operator?: { external_id, name } }   (operator obligatorio en deliver)
//      request → marca pending y avisa al celular del cliente
//      cancel  → desiste (cierra el modal del cliente)
//      deliver → entrega atómica (exige confirmed) + payload del comprobante
import { authenticate, logRequest, json, cors, statusFor, messageFor, sbAdmin } from '../_lib/apiAuth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Broadcast Realtime server-side (REST, sin websocket): mismo canal y
// payload que emite el navegador del operador en la app propia
// (redeem-bc-<member_id> / confirm_request | confirm_cancel). El canal
// postgres_changes del cliente queda de respaldo, y al ABRIR la app el
// cliente detecta la solicitud vigente (get_my_redemptions).
async function broadcast(topic, event, payload) {
  try {
    const r = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [{ topic, event, payload }] }),
    });
    if (!r.ok) console.error('[API:redemptions] broadcast', r.status, await r.text());
  } catch (err) {
    console.error('[API:redemptions] broadcast:', err.message);
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── GET: consulta (comprobante / poll / pendientes por tarjeta) ──
  if (req.method === 'GET') {
    const auth = await authenticate(req, 'redemptions:read');
    if (auth.error) {
      return json(res, statusFor(auth.error), { error: auth.error, message: messageFor(auth.error) });
    }

    const cardCode = String(req.query.card_code || '').trim().toUpperCase();
    if (cardCode) {
      const { data, error } = await sbAdmin.rpc('api_list_pending_redemptions', { p_card_code: cardCode });
      if (error) {
        console.error('[API:redemptions]', error.message);
        return json(res, 500, { error: 'server_error', message: messageFor('server_error') });
      }
      const status = data?.error ? statusFor(data.error) : 200;
      await logRequest({ clientId: auth.clientId, endpoint: 'GET /v1/redemptions',
        request: { card_code: cardCode }, response: data, status });
      if (data?.error) return json(res, status, { error: data.error, message: messageFor(data.error) });
      return json(res, 200, data);
    }

    const code = String(req.query.code || '').trim().toUpperCase();
    const { data, error } = await sbAdmin.rpc('api_get_redemption', { p_code: code });
    if (error) {
      console.error('[API:redemptions]', error.message);
      return json(res, 500, { error: 'server_error', message: messageFor('server_error') });
    }
    if (data?.error) {
      const status = statusFor(data.error);
      await logRequest({ clientId: auth.clientId, endpoint: 'GET /v1/redemptions',
        request: { code }, response: data, status });
      return json(res, status, { error: data.error, message: messageFor(data.error) });
    }
    await logRequest({ clientId: auth.clientId, endpoint: 'GET /v1/redemptions',
      request: { code }, response: data, status: 200 });
    return json(res, 200, data);
  }

  // ── POST: request / cancel / deliver ──
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'method_not_allowed', message: 'Usá GET o POST' });
  }

  const auth = await authenticate(req, 'redemptions:write');
  if (auth.error) {
    return json(res, statusFor(auth.error), { error: auth.error, message: messageFor(auth.error) });
  }

  const b = req.body || {};
  const operator = b.operator || {};
  const action = String(b.action || '').trim().toLowerCase();

  const { data, error } = await sbAdmin.rpc('api_redemption_confirm', {
    p_api_client_id: auth.clientId,
    p_code:          String(b.code || '').trim(),
    p_action:        action,
    p_operator_ext:  String(operator.external_id || b.operator_external_id || '').trim() || null,
    p_operator_name: String(operator.name || b.operator_name || '').trim() || null,
  });

  if (error) {
    console.error('[API:redemptions]', error.message);
    await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/redemptions',
      request: b, response: { error: error.message }, status: 500 });
    return json(res, 500, { error: 'server_error', message: messageFor('server_error') });
  }

  if (data?.error) {
    const status = statusFor(data.error);
    const body = { error: data.error, message: messageFor(data.error, data.detail) };
    await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/redemptions',
      request: b, response: body, status });
    return json(res, status, body);
  }

  // Campos INTERNOS (para el broadcast): fuera de la respuesta pública.
  // El handler del cliente (App.jsx redeem-bc) exige el UUID en
  // payload.redemptionId — mismo contrato del broadcast del operador.
  const { member_id, reward_id, redemption_id, ...pub } = data;

  if (action === 'request') {
    await broadcast(`redeem-bc-${member_id}`, 'confirm_request', {
      redemptionId: redemption_id,
      rewardId: reward_id || null,
      rewardName: data.reward_name,
      cost: data.points_spent ?? 0,
    });
  } else if (action === 'cancel') {
    await broadcast(`redeem-bc-${member_id}`, 'confirm_cancel', { redemptionId: redemption_id });
  }

  await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/redemptions',
    request: b, response: pub, status: 200 });
  return json(res, 200, pub);
}
