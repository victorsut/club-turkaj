// api/v1/purchases.js — acumulación de puntos desde el POS (F7a, PROPER).
//
// Se llama DESPUÉS de emitir la factura: no interviene en el flujo de
// facturación de PROPER, solo valida y acredita con los datos ya
// emitidos.
//
// POST /api/v1/purchases
// Body: { card_code, fuel_amount, gallons, fuel_type, nit, invoice_no,
//         total_amount?, operator: { external_id, name, station } }
// Header recomendado: Idempotency-Key (nº de factura)
import { authenticate, logRequest, replay, json, cors, statusFor, messageFor, sbAdmin } from '../_lib/apiAuth.js';
import { pushToMembers } from '../_lib/push.js';

// Regla del dueño (29-jul): al cliente solo el PRIMER nombre del personal.
// (Duplicado mínimo de src/lib/text.js — los endpoints no importan de src/.)
const firstName = (s) => String(s ?? '').trim().split(/\s+/)[0] || '';

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
  // `amount` se acepta como alias de fuel_amount por compatibilidad con
  // los primeros borradores del contrato.
  const fuelAmount = b.fuel_amount != null ? Number(b.fuel_amount)
    : (b.amount != null ? Number(b.amount) : null);

  const payload = {
    p_api_client_id: auth.clientId,
    p_card_code:     String(b.card_code || '').trim(),
    p_fuel_amount:   fuelAmount,
    p_gallons:       b.gallons != null ? Number(b.gallons) : null,
    p_fuel_type:     String(b.fuel_type || '').trim(),
    p_nit:           b.nit != null ? String(b.nit) : 'CF',
    p_invoice_no:    b.invoice_no != null ? String(b.invoice_no) : null,
    p_operator_ext:  String(operator.external_id || b.operator_external_id || '').trim(),
    p_operator_name: String(operator.name || b.operator_name || '').trim(),
    // La estación viaja con el colaborador (PROPER se la asigna); si no
    // llega, se usa la que ya tenga registrada el colaborador.
    p_station_ext:   String(operator.station || b.station || b.station_id || '').trim() || null,
    p_total_amount:  b.total_amount != null ? Number(b.total_amount) : null,
  };

  const { data, error } = await sbAdmin.rpc('api_register_purchase', payload);

  if (error) {
    console.error('[API:purchases]', error.message);
    await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/purchases',
      request: b, response: { error: error.message }, status: 500 });
    return json(res, 500, { error: 'server_error', message: messageFor('server_error') });
  }

  if (data?.error) {
    const status = statusFor(data.error);
    // Los rechazos de negocio devuelven contexto útil para el ticket
    // (nombre del cliente, NIT de la factura) además del mensaje.
    const body = {
      error: data.error,
      message: messageFor(data.error, data.detail),
      ...(data.member_name ? { member_name: data.member_name } : {}),
      ...(data.invoice_nit ? { invoice_nit: data.invoice_nit } : {}),
      ...(data.registered_nit_masked ? { registered_nit_masked: data.registered_nit_masked } : {}),
    };
    // Los rechazos NO consumen la idempotency-key.
    await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/purchases',
      request: b, response: body, status });
    return json(res, status, body);
  }

  // Campos INTERNOS del RPC (para el push): fuera de la respuesta pública —
  // el contrato con PROPER no cambia.
  const { member_id, operator_id, operator_name, ...pub } = data;

  // Push de calificación server-side (F7a.2): con PROPER los colaboradores
  // ya no usan nuestra vista de operador, así que el aviso que antes
  // disparaba el navegador del operador sale de acá. Si el cliente tiene
  // la app abierta, el SW lo suprime y el modal Realtime cubre el caso.
  // Best effort: un fallo de push nunca afecta la acreditación.
  try {
    const opFirst = firstName(operator_name);
    const promo = data.promo || null;
    const promoTag = promo
      ? (promo.effect_type === 'grant_reward'
        ? ` · 🎁 ${promo.reward_name} GRATIS`
        : ` · 🎉 ${promo.name} (+${promo.extra_points})`)
      : '';
    await pushToMembers(member_id, {
      type: 'purchase',
      title: promo ? '¡Compra con promoción!' : '¡Compra registrada!',
      body: `+${data.points_earned} pts · ${data.gallons} gal · Q${data.fuel_amount}${promoTag}`
        + `${data.tier_changed && data.tier ? ` · ¡Subiste a ${data.tier}!` : ''}`
        + `${opFirst ? ` — Atendido por ${opFirst}` : ''}`,
      data: {
        operatorId: operator_id,
        operatorName: opFirst,
        stationName: data.station,
        purchaseId: data.purchase_id || null,
        points: data.points_earned,
        amount: data.fuel_amount,
        actions: [
          { action: 'rate', title: 'Calificar' },
          { action: 'dismiss', title: 'Cerrar' },
        ],
      },
    });

    // Premio por promoción (grant_reward): push aparte con deep-link a
    // los canjes pendientes, donde vive el QR para reclamarlo.
    if (promo?.effect_type === 'grant_reward') {
      await pushToMembers(member_id, {
        type: 'reward',
        title: '¡Ganaste un premio!',
        body: `${promo.name ? promo.name + ': ' : ''}${promo.reward_name} gratis por tu compra. Abrí la notificación para ver el QR y mostralo al operador cuando quieras reclamarlo.`,
        url: '/?goto=pendientes',
        data: { rewardName: promo.reward_name, code: promo.redemption_code || null },
      });
    }
  } catch (err) {
    console.error('[API:purchases] push:', err.message);
  }

  await logRequest({ clientId: auth.clientId, endpoint: 'POST /v1/purchases',
    idempotencyKey: idemKey, request: b, response: pub, status: 201 });
  return json(res, 201, pub);
}
