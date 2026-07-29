// src/services/operatorAuthService.js
// Servicio de autenticación de operadores de Puntos Plus.
// Usa la RPC `authenticate_operator` de Supabase, que valida contra
// password_hash con bcrypt en el servidor (extensions.crypt).
// La contraseña en texto plano nunca se guarda en el cliente.

import { sb } from '../lib/supabaseClient';
import { setOperatorToken, getOperatorToken, clearOperatorToken, getAdminToken } from './sessionTokens';

const STORAGE_KEY = 'ct_op';

/**
 * Autentica un operador contra Supabase.
 * @param {Object} credentials
 * @param {string} credentials.gafete    - Número de gafete
 * @param {string} credentials.dpi       - DPI del operador
 * @param {string} credentials.username  - Nombre de usuario
 * @param {string} credentials.password  - Contraseña en texto plano
 * @returns {Promise<{ok: boolean, operator?: object, error?: string}>}
 */
export async function loginOperator({ gafete, dpi, username, password }) {
  if (!gafete?.trim() || !dpi?.trim() || !username?.trim() || !password) {
    return { ok: false, error: 'Completa todos los campos' };
  }
  if (!sb) {
    return { ok: false, error: 'Sin conexión al servidor' };
  }

  try {
    const { data, error } = await sb.rpc('authenticate_operator', {
      p_gafete: gafete.trim(),
      p_dpi: dpi.trim(),
      p_username: username.trim().toLowerCase(),
      p_password: password,
    });

    if (error) {
      console.error('[operatorAuth] RPC error:', error);
      return { ok: false, error: 'Error de conexión, intenta de nuevo' };
    }
    if (!data || data.length === 0) {
      return { ok: false, error: 'Credenciales incorrectas' };
    }

    // Mapear al shape que ya espera el resto de la app (loggedOp.*)
    const r = data[0];
    const operator = {
      id: r.id,
      name: r.name,
      user: r.username,
      dpi: r.dpi,
      gafete: r.gafete,
      station: r.station_name || '',
      stationId: r.station_id || null,
      bomba: r.bomba || '',
      turno: r.turno || '',
      active: true,
    };

    // SEC.B.4: persistir el token de sesión emitido por la RPC
    // (authenticate_operator, SEC.B.3) en su clave de rol. Se guarda
    // por separado del objeto operator para que cerrar la sesión de un
    // rol no toque la de otro. La inyección del token en las RPCs
    // sensibles es SEC.B.5.
    setOperatorToken({ token: r.session_token, expiresAt: r.session_expires_at });

    saveSession(operator);
    return { ok: true, operator };
  } catch (err) {
    console.error('[operatorAuth] Unexpected error:', err);
    return { ok: false, error: 'Error inesperado' };
  }
}

/**
 * Guarda la sesión del operador en localStorage.
 * Mantenemos la misma key 'ct_op' para no romper código existente.
 */
export function saveSession(operator) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operator));
  } catch (err) {
    console.error('[operatorAuth] save fail:', err);
  }
}

/**
 * Recupera la sesión actual del operador (si existe).
 * @returns {object|null}
 */
export function getOperatorSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión del operador.
 * SEC.B.6.3: revoca el token de sesión server-side (best-effort) ANTES de
 * borrar el localStorage. El borrado local va SIEMPRE (fuera del try/catch):
 * si la revocación falla (sin red, server caído), se traga el error y el
 * logout local NO se bloquea. Un token huérfano no-revocado expira en ≤18h y
 * la validación de B.6 corre en modo warn (no bloquea).
 */
export async function logoutOperator() {
  // 1. Leer el token ANTES de borrarlo (clearOperatorToken lo elimina abajo).
  const token = getOperatorToken()?.token;

  // 2. Revocar server-side (best-effort). if (sb && token) evita el round-trip
  //    si el token está ausente o ya venció (getOperatorToken auto-limpia).
  if (sb && token) {
    try {
      await sb.rpc('revoke_operator_session', { p_token: token });
    } catch (err) {
      console.error('[operatorAuth] revoke fail:', err);
    }
  }

  // 3. Borrado local SIEMPRE (fuera del try/catch de la revocación).
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[operatorAuth] clear fail:', err);
  }
  // SEC.B.4: limpiar el token de operador (solo su clave de rol).
  clearOperatorToken();
}

/**
 * Verifica si hay sesión de operador activa.
 */
export function isOperatorLoggedIn() {
  return getOperatorSession() !== null;
}

/**
 * Crea un operador nuevo. Hashea la contraseña con bcrypt en el servidor.
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createOperatorRPC({
  name, username, password, dpi, gafete,
  stationId = null, phone = null, email = null, bomba = null, turno = 'Matutino',
}, audit = {}) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  const params = {
    p_name: name,
    p_username: (username || '').trim().toLowerCase(),
    p_password: password,
    p_dpi: dpi,
    p_gafete: gafete,
    p_station_id: stationId,
    p_phone: phone,
    p_email: email,
    p_bomba: bomba,
    p_turno: turno,
  };
  if (audit.adminId) {
    params.p_admin_id = audit.adminId;
    params.p_admin_name = audit.adminName;
    params.p_admin_email = audit.adminEmail;
    params.p_reason_text = audit.reasonText;
  }
  const { data, error } = await sb.rpc('create_operator', params);
  if (error) {
    console.error('[operatorAuth] create RPC error:', error);
    return { data: null, error };
  }
  return { data: data?.[0] || null, error: null };
}

/**
 * Actualiza los DATOS de un operador (sin contraseña ni estado).
 * Objetivo #1 (29-jul): sustituye el UPDATE directo de OpManagement —
 * `operators` perdió la escritura abierta y la auditoría dejó de ser
 * client-first (ahora es atómica dentro del RPC).
 * @returns {Promise<{ ok: boolean, error: string|null }>}
 */
export async function updateOperatorProfile(operatorId, updates, audit = {}) {
  const token = getAdminToken()?.token;
  if (!sb || !token) return { ok: false, error: 'Sesión de admin no disponible' };
  const params = { p_session_token: token, p_id: operatorId, p_updates: updates };
  if (audit.adminId) {
    params.p_admin_id = audit.adminId;
    params.p_admin_name = audit.adminName;
    params.p_admin_email = audit.adminEmail;
    params.p_reason_text = audit.reasonText;
  }
  const { data, error } = await sb.rpc('update_operator_profile', params);
  if (error) {
    console.error('[operatorAuth] update profile RPC error:', error);
    const dup = /unique|duplicate/i.test(error.message);
    return { ok: false, error: dup ? 'Usuario o gafete ya existe' : error.message };
  }
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true, error: null };
}

/** Lista de operadores con ficha completa (sin password_hash). */
export async function fetchOperatorsFull() {
  const tok = getAdminToken()?.token;
  const role = tok ? 'admin' : 'operator';
  const token = tok || getOperatorToken()?.token;
  if (!sb || !token) return [];
  const { data, error } = await sb.rpc('list_operators_full', {
    p_session_token: token, p_role: role,
  });
  if (error) { console.error('[operatorAuth] list full:', error.message); return []; }
  return data || [];
}

/**
 * Resetea la contraseña de un operador. Hashea con bcrypt server-side.
 * @returns {Promise<{ ok: boolean, error: object|null }>}
 */
export async function updateOperatorPassword(operatorId, newPassword, audit = {}) {
  if (!sb) return { ok: false, error: { message: 'Sin conexión al servidor' } };
  const params = { p_id: operatorId, p_new_password: newPassword };
  if (audit.adminId) {
    params.p_admin_id = audit.adminId;
    params.p_admin_name = audit.adminName;
    params.p_admin_email = audit.adminEmail;
    params.p_reason_text = audit.reasonText;
  }
  const { data, error } = await sb.rpc('update_operator_password', params);
  if (error) {
    console.error('[operatorAuth] update password RPC error:', error);
    return { ok: false, error };
  }
  return { ok: data === true, error: null };
}

/**
 * Activa o desactiva un operador. Acción sensible: si se pasa audit
 * con adminId, el RPC registra toggle_operator_active en
 * admin_audit_log (reason obligatorio) en la misma transacción.
 * @param {string} operatorId
 * @param {boolean} newActive - nuevo estado (el cliente calcula !actual)
 * @param {Object} [audit] - { adminId, adminName, adminEmail, reasonText }
 * @returns {Promise<{ ok: boolean, error: object|null }>}
 */
export async function toggleOperatorActive(operatorId, newActive, audit = {}) {
  if (!sb) return { ok: false, error: { message: 'Sin conexión al servidor' } };
  const params = { p_id: operatorId, p_new_active: newActive };
  if (audit.adminId) {
    params.p_admin_id = audit.adminId;
    params.p_admin_name = audit.adminName;
    params.p_admin_email = audit.adminEmail;
    params.p_reason_text = audit.reasonText;
  }
  const { data, error } = await sb.rpc('toggle_operator_active', params);
  if (error) {
    console.error('[operatorAuth] toggle active RPC error:', error);
    return { ok: false, error };
  }
  return { ok: data === true, error: null };
}
