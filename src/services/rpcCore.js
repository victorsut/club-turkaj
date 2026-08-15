// ============================================================
// Puntos Plus — RPC Core (helper compartido)
// ============================================================
// callRpc es el helper genérico que usan las familias de RPCs
// (rpcServices.js = negocio, adminRpcServices.js = admin/auditoría).
// Extraído en la división del 15-ago-2026 (regla de 500 líneas) —
// lógica VERBATIM, sin cambios.
// ============================================================

import { sb } from '../lib/supabaseClient';
import { notifySessionExpired } from './sessionExpiry'; // SEC.B.8.2: rechazo reactivo de sesión (28000)

// ──────────────────────────────────────────────
// Helper genérico para llamadas RPC
// ──────────────────────────────────────────────
export async function callRpc(fnName, params, { sessionToken } = {}) {
  // SEC.B.5.2: si el caller pasa un sessionToken (truthy), lo inyectamos
  // como p_session_token. callRpc NO adivina rol — el caller decide qué
  // token pasar (o ninguno). Si no viene, la RPC lo recibe como DEFAULT
  // NULL server-side (B.5.1) y por ahora lo ignora (validación real en B.6).
  if (sessionToken) {
    params = { ...params, p_session_token: sessionToken };
  }
  const { data, error } = await sb.rpc(fnName, params);
  if (error) {
    console.error(`[RPC:${fnName}]`, error.message);
    // SEC.B.8.2: rechazo de sesión strict (B.8.1). Detección centralizada:
    // avisa a la capa React (expireSession via singleton) y marca el flag para
    // que el call site se haga a un lado (no pise el toast lindo con el crudo).
    if (error.code === '28000') {
      notifySessionExpired();
      return { data: null, error, sessionExpired: true };
    }
    return { data: null, error };
  }
  // Las funciones RPC retornan JSONB; puede venir como string o ya parseado
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  // Si el resultado contiene un campo "error", es un error de negocio
  if (parsed?.error) {
    return { data: null, error: { message: parsed.error } };
  }
  return { data: parsed, error: null };
}
