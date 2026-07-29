// api/v1/stations.js — catálogo de estaciones (F7a, PROPER).
//
// GET /api/v1/stations
// PROPER necesita el `station_id` de Puntos Plus para enviarlo en cada
// compra. Se consulta una vez y se guarda en la configuración del POS
// (cada dispositivo pertenece a una estación fija).
import { authenticate, json, cors, statusFor, messageFor, sbAdmin } from '../_lib/apiAuth.js';

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

  const { data, error } = await sbAdmin
    .from('stations')
    .select('id, name, address, active')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('[API:stations]', error.message);
    return json(res, 500, { error: 'server_error', message: messageFor('server_error') });
  }
  return json(res, 200, { ok: true, stations: data || [] });
}
