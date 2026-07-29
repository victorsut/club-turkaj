// api/v1/purchases.js — acumulación de puntos desde el POS (F7a, PROPER).
//
// POST /api/v1/purchases
// Body: { card_code, amount, gallons, fuel_type, nit, invoice_no,
//         station_id, operator: { external_id, name } }
// Header opcional (RECOMENDADO): Idempotency-Key
//   Si el POS reintenta por corte de red con la MISMA llave, se
//   devuelve la respuesta original sin volver a acreditar puntos.
import { authenticate, logRequest, replay, json, cors, statusFor, messageFor, sbAdmin } from '../_lib/apiAuth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'method_not_allowed', message: 'Usá POST' });
  }

  const auth = await authenticate(req, 'purchases:write');
  if (auth.error) {
    return json(res, statusFor(auth.error), { error: auth.error, message: messageFor(auth.error) });
  }

  const idemKey = String(req.headers['idempotency-key'] || '').trim();
  if (idemKey) {
    const prev = await replay(auth.clientId, idemKey);
    if (prev) return json(res, 200, { ...prev, replayed: true });
  }

  const b = req.body || {};
  const operator = b.operator || {};
  const payload = {
    p_api_client_id: auth.clientId,
    p_card_code:     String(b.card_code || '').trim(),
    p_amount:        b.amount != null ? Number(b.amount) : null,
    p_gallons:       b.gallons != null ? Number(b.gallons) : null,
    p_fuel_type:     String(b.fuel_type || '').trim(),
    p_nit:           b.nit != null ? String(b.nit) : 'CF',
    p_invoice_no:    b.invoice_no != null ? String(b.invoice_no) : null,
    p_station_id:    b.station_id || null,
    p_operator_ext:  String(operator.external_id || b.operator_external_id || '').trim(),
    p_operator_name: String(operator.name || b.operator_name || '').trim(),
  };

  const { data, error } = await sbAdmin.rpc('api_register_purchase', payload);

  if (error) {
    console.error('[API:purchases]', error.message);
    await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/purchases',
      idempotencyKey: idemKey, request: b, response: { error: error.message }, status: 500 });
    return json(res, 500, { error: 'server_error', message: messageFor('server_error') });
  }

  if (data?.error) {
    const status = statusFor(data.error);
    const body = { error: data.error, message: messageFor(data.error, data.detail) };
    // Los rechazos NO consumen la idempotency-key: el POS puede
    // corregir el dato (p. ej. el NIT) y reintentar con la misma.
    await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/purchases',
      request: b, response: body, status });
    return json(res, status, body);
  }

  await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/purchases',
    idempotencyKey: idemKey, request: b, response: data, status: 201 });
  return json(res, 201, data);
}
