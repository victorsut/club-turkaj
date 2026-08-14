// ============================================================
// Puntos Plus — Data Services
// ============================================================
// Antes: CRUD directo a las 18 tablas de Supabase. El cierre de
// seguridad SEC.C (jul–ago 2026) revocó los accesos abiertos y todo
// migró a RPCs con sesión (secureReads.js / rpcServices.js); la
// limpieza del bloque 3 (12-ago-2026) eliminó las ~28 funciones que
// quedaron sin consumidores (y que en su mayoría hoy fallarían contra
// los grants actuales). Sobreviven solo las 4 con consumidores reales.
// ============================================================

import { sb } from '../lib/supabaseClient';
import { getMemberToken } from './sessionTokens'; // SEC.C.6: inbox por RPC con sesión

// SEC.C.1 — ficha completa de todos los miembros para operador/admin
// (valida su sesión server-side; devuelve perfiles jsonb sin hash).
export async function fetchMembersFull(sessionToken, role) {
  const { data, error } = await sb.rpc('list_members_full', {
    p_session_token: sessionToken, p_role: role,
  });
  if (error) { console.error('[Data:membersFull]', error.message); return []; }
  return data || [];
}

// SEC.C.1 — ficha completa de UN miembro (operador/admin).
export async function fetchMemberFull(sessionToken, role, memberId) {
  const { data, error } = await sb.rpc('get_member_full', {
    p_session_token: sessionToken, p_role: role, p_member_id: memberId,
  });
  if (error) { console.error('[Data:memberFull]', error.message); return null; }
  return data;
}

// ──────────────────────────────────────────────
// NOTIFICACIONES (notifications) — inbox de la campana
// ──────────────────────────────────────────────
// SEC.C.6 (11-ago): el SELECT abierto de `notifications` se cerró (era
// legible por cualquiera con el anon key). El inbox se lee por RPC con
// la sesión del miembro, que deriva el member_id — el parámetro
// memberId queda por compatibilidad de firma pero ya no se usa.
export async function fetchNotifications(memberId, limit = 50) {
  const tok = getMemberToken()?.token;
  if (!sb || !tok) return [];
  const { data, error } = await sb.rpc('get_my_notifications', { p_session_token: tok, p_limit: limit });
  if (error) { console.error('[Data:notifications]', error.message); return []; }
  return Array.isArray(data) ? data : [];
}

// Marca TODAS las no leídas del miembro (RPC con sesión — el UPDATE
// directo del cliente quedó revocado en SEC.C.6).
export async function markNotificationsRead(memberId) {
  const tok = getMemberToken()?.token;
  if (!sb || !tok) return;
  const { error } = await sb.rpc('mark_my_notifications_read', { p_session_token: tok });
  if (error) console.error('[Data:notificationsRead]', error.message);
}

// Limpia notificaciones del inbox (14-ago): con id limpia ESA, con
// null limpia TODAS. Soft delete server-side (cleared_at) — la fila
// sobrevive como registro/dedupe del motor de push.
export async function clearNotifications(notificationId = null) {
  const tok = getMemberToken()?.token;
  if (!sb || !tok) return;
  const { error } = await sb.rpc('clear_my_notifications', {
    p_session_token: tok, p_notification_id: notificationId,
  });
  if (error) console.error('[Data:notificationsClear]', error.message);
}
