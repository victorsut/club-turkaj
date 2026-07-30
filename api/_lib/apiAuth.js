// api/_lib/apiAuth.js — núcleo de la API pública (F7a, PROPER).
// No es una ruta: Vercel ignora las carpetas con guión bajo.
//
// Toda la API externa corre con la SERVICE KEY (las tablas están
// cerradas a anon): la autorización la da la API key del cliente,
// validada server-side contra api_clients (bcrypt).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

// CORS: el POS llama server-to-server, pero dejamos la puerta abierta
// para pruebas desde herramientas web (no hay cookies de por medio).
export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
}

export function json(res, status, body) {
  res.status(status).json(body);
  return body;
}

// Códigos de error → HTTP. El cuerpo siempre lleva `error` (clave
// estable para programar) y `detail` (texto para el operador).
const STATUS = {
  missing_api_key: 401,
  invalid_api_key: 401,
  insufficient_scope: 403,
  invalid_card_code: 400,
  member_not_found: 404,
  redemption_not_found: 404,
  nit_mismatch: 422,
  nit_not_registered: 422,
  no_fuel_in_invoice: 422,
  amount_too_low: 422,
  invalid_gallons: 422,
  invalid_fuel_type: 422,
  invalid_station: 422,
  unknown_station: 422,
  missing_operator: 422,
  invalid_action: 400,
  already_delivered: 409,
  not_confirmed: 422,
  method_not_allowed: 405,
  server_error: 500,
};
export const statusFor = (code) => STATUS[code] || 400;

// Mensajes legibles por defecto (el POS puede mostrarlos tal cual).
const MESSAGES = {
  missing_api_key: 'Falta la llave de API',
  invalid_api_key: 'Llave de API inválida o desactivada',
  insufficient_scope: 'La llave no tiene permiso para esta operación',
  invalid_card_code: 'El código escaneado no es una tarjeta Puntos Plus',
  member_not_found: 'No hay ningún cliente con esa tarjeta',
  redemption_not_found: 'No existe un canje con ese código',
  no_fuel_in_invoice: 'La factura no incluye combustible: no acumula puntos',
  amount_too_low: 'El consumo de combustible mínimo para acumular es Q10',
  invalid_gallons: 'Los galones deben ser mayores a cero',
  invalid_fuel_type: 'Tipo de combustible inválido (super, regular, diesel)',
  invalid_station: 'La estación indicada no existe',
  unknown_station: 'No pudimos determinar la estación del colaborador',
  missing_operator: 'Falta el identificador del colaborador',
  invalid_action: 'Acción inválida (request, cancel o deliver)',
  already_delivered: 'Este premio ya fue entregado',
  not_confirmed: 'El cliente aún no ha confirmado la entrega en su app',
  server_error: 'Error interno, reintentá en unos segundos',
};
export const messageFor = (code, detail) => detail || MESSAGES[code] || 'Solicitud inválida';

// Autentica la llave del header Authorization: Bearer <key>.
// Devuelve { clientId, name } o lanza { code } manejable.
export async function authenticate(req, scope) {
  const raw = req.headers.authorization || '';
  const key = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  const { data, error } = await sbAdmin.rpc('api_authenticate', {
    p_key: key, p_scope: scope,
  });
  if (error) {
    console.error('[API:auth]', error.message);
    return { error: 'server_error' };
  }
  if (data?.error) return { error: data.error };
  return { clientId: data.client_id, name: data.name };
}

// Bitácora de la llamada (best-effort: nunca bloquea la respuesta).
export async function logRequest({ clientId, endpoint, idempotencyKey, request, response, status }) {
  try {
    await sbAdmin.rpc('api_log_request', {
      p_api_client_id: clientId || null,
      p_endpoint: endpoint,
      p_idempotency_key: idempotencyKey || null,
      p_request: request || null,
      p_response: response || null,
      p_status_code: status,
    });
  } catch (e) {
    console.error('[API:log]', e.message);
  }
}

// Respuesta previa de una Idempotency-Key ya usada con éxito.
export async function replay(clientId, idempotencyKey) {
  if (!idempotencyKey) return null;
  const { data } = await sbAdmin.rpc('api_replay', {
    p_api_client_id: clientId, p_idempotency_key: idempotencyKey,
  });
  return data || null;
}
