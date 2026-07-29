// ──────────────────────────────────────────────
// Puntos Plus — secureReads (SEC.C.2, 29-jul-2026)
// ──────────────────────────────────────────────
// Lecturas con sesión de activity_log, redemptions, purchases y
// raffle_tickets. El SELECT abierto de esas tablas quedó revocado
// (migración 20260729_sec_c2_cierre_lecturas.sql): todo pasa por
// RPCs SECURITY DEFINER que validan el token de miembro, operador
// o admin. Ante error (RPC ausente, sesión legada sin token o
// vencida) devuelven vacío — las vistas muestran listas vacías y
// el resto de la app no se rompe.

import { sb } from '../lib/supabaseClient';
import { getMemberToken, getOperatorToken, getAdminToken } from './sessionTokens';

// Token de staff: admin manda si hay ambos (misma regla del
// efecto custsFull de App.jsx).
function staffSession() {
  const admin = getAdminToken();
  if (admin?.token) return { token: admin.token, role: 'admin' };
  const op = getOperatorToken();
  if (op?.token) return { token: op.token, role: 'operator' };
  return null;
}

async function rpcRows(name, params, tag) {
  const { data, error } = await sb.rpc(name, params);
  if (error) { console.warn(`[SecureReads:${tag}]`, error.message); return null; }
  return data;
}

// ── activity_log ───────────────────────────────

// Libro mayor del PROPIO miembro (requiere token de miembro).
export async function fetchMyActivity(memberId, limit = 1000) {
  const tok = getMemberToken();
  if (!tok?.token) return [];
  return (await rpcRows('list_activity', {
    p_session_token: tok.token, p_role: 'member',
    p_member_id: memberId, p_limit: limit,
  }, 'myActivity')) || [];
}

// Actividad para staff: de UN miembro (ficha) o global (member_id
// null — mapa del admin: filtro por estación, actividad reciente).
export async function fetchActivityStaff(memberId = null, limit = 200) {
  const s = staffSession();
  if (!s) return [];
  return (await rpcRows('list_activity', {
    p_session_token: s.token, p_role: s.role,
    p_member_id: memberId, p_limit: limit,
  }, 'activityStaff')) || [];
}

// ── redemptions ────────────────────────────────

// Canjes del propio miembro — única vía con redemption_code (QR).
export async function fetchMyRedemptions(limit = 200) {
  const tok = getMemberToken();
  if (!tok?.token) return [];
  return (await rpcRows('get_my_redemptions', {
    p_session_token: tok.token, p_limit: limit,
  }, 'myRedemptions')) || [];
}

// Pendientes de entrega de un miembro (operador/admin).
export async function fetchPendingRedemptionsStaff(memberId) {
  const s = staffSession();
  if (!s) return { data: null, error: 'Sin sesión' };
  const { data, error } = await sb.rpc('list_member_pending_redemptions', {
    p_session_token: s.token, p_role: s.role, p_member_id: memberId,
  });
  return { data, error: error?.message || null };
}

// Canje por código TK (escaneo directo del QR del premio).
export async function fetchRedemptionByCode(code) {
  const s = staffSession();
  if (!s) return { data: null, error: 'Sin sesión' };
  const { data, error } = await sb.rpc('get_redemption_by_code', {
    p_session_token: s.token, p_role: s.role, p_code: code,
  });
  return { data, error: error?.message || null };
}

// Historial de entregas de un operador (él mismo, o admin de cualquiera).
export async function fetchOperatorRedemptions(operatorId, { since = null, limit = 100 } = {}) {
  const s = staffSession();
  if (!s) return [];
  return (await rpcRows('list_operator_redemptions', {
    p_session_token: s.token, p_role: s.role,
    p_operator_id: operatorId, p_since: since, p_limit: limit,
  }, 'opRedemptions')) || [];
}

// Poll del flujo de confirmación (operador).
export async function fetchRedemptionStatus(redemptionId) {
  const s = staffSession();
  if (!s) return null;
  const data = await rpcRows('get_redemption_status', {
    p_session_token: s.token, p_role: s.role, p_id: redemptionId,
  }, 'redemptionStatus');
  return data?.confirm_status ?? null;
}

// ── purchases ──────────────────────────────────

// Compras registradas por un operador (él mismo, o admin).
export async function fetchOperatorPurchases(operatorId, limit = 100) {
  const s = staffSession();
  if (!s) return [];
  return (await rpcRows('list_operator_purchases', {
    p_session_token: s.token, p_role: s.role,
    p_operator_id: operatorId, p_limit: limit,
  }, 'opPurchases')) || [];
}

// ── raffle_tickets ─────────────────────────────

// Participantes agregados de todas las rifas (cualquier sesión).
// Devuelve [{ raffle_id, member_id, name, tickets }].
export async function fetchRaffleParticipants() {
  const member = getMemberToken();
  const sess = member?.token
    ? { token: member.token, role: 'member' }
    : staffSession();
  if (!sess) return null; // sin sesión: no distinguible de lista vacía
  return await rpcRows('list_raffle_participants', {
    p_session_token: sess.token, p_role: sess.role,
  }, 'raffleParticipants');
}
