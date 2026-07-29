// api/v1/redemptions.js — comprobante de premio por QR (F7a, PROPER).
//
// GET /api/v1/redemptions?code=TK-3F9A2C
// Devuelve los datos del canje para IMPRIMIR el comprobante desde el
// POS. No cambia el estado: la entrega la confirma el cliente en su
// dispositivo (flujo Puntos Plus intacto) y el operador la cierra en
// la app de Puntos Plus.
import { authenticate, logRequest, json, cors, statusFor, messageFor, sbAdmin } from '../_lib/apiAuth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'method_not_allowed', message: 'Usá GET' });
  }

  const auth = await authenticate(req, 'redemptions:read');
  if (auth.error) {
    return json(res, statusFor(auth.error), { error: auth.error, message: messageFor(auth.error) });
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
