// api/v1/members.js — identificación del cliente por QR (F7a, PROPER).
//
// GET /api/v1/members?card_code=CTOD-00042
// Devuelve nombre, nivel, saldo y con qué NIT se le puede facturar.
// Pensado para el momento ANTES de emitir: el POS avisa al colaborador
// si la factura debe ir a CF o puede ir al NIT del cliente.
import { authenticate, logRequest, json, cors, statusFor, messageFor, sbAdmin } from '../_lib/apiAuth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'method_not_allowed', message: 'Usá GET' });
  }

  const auth = await authenticate(req, 'purchases:write');
  if (auth.error) {
    return json(res, statusFor(auth.error), { error: auth.error, message: messageFor(auth.error) });
  }

  const cardCode = String(req.query.card_code || '').trim();
  const { data, error } = await sbAdmin.rpc('api_resolve_member', { p_card_code: cardCode });

  if (error) {
    console.error('[API:members]', error.message);
    return json(res, 500, { error: 'server_error', message: messageFor('server_error') });
  }
  if (data?.error) {
    const status = statusFor(data.error);
    await logRequest({ clientId: auth.clientId, endpoint: 'GET /v1/members',
      request: { card_code: cardCode }, response: data, status });
    return json(res, status, { error: data.error, message: messageFor(data.error, data.detail) });
  }

  await logRequest({ clientId: auth.clientId, endpoint: 'GET /v1/members',
    request: { card_code: cardCode }, response: data, status: 200 });
  return json(res, 200, data);
}
