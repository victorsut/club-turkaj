// src/services/operatorAuthService.js
// Servicio de autenticación de operadores Club Turkaj.
// Usa la RPC `authenticate_operator` de Supabase, que valida contra
// password_hash con bcrypt en el servidor (extensions.crypt).
// La contraseña en texto plano nunca se guarda en el cliente.

import { sb } from '../lib/supabaseClient';

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
 * Cierra la sesión del operador (limpia localStorage).
 */
export function logoutOperator() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[operatorAuth] clear fail:', err);
  }
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
}) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  const { data, error } = await sb.rpc('create_operator', {
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
  });
  if (error) {
    console.error('[operatorAuth] create RPC error:', error);
    return { data: null, error };
  }
  return { data: data?.[0] || null, error: null };
}

/**
 * Resetea la contraseña de un operador. Hashea con bcrypt server-side.
 * @returns {Promise<{ ok: boolean, error: object|null }>}
 */
export async function updateOperatorPassword(operatorId, newPassword) {
  if (!sb) return { ok: false, error: { message: 'Sin conexión al servidor' } };
  const { data, error } = await sb.rpc('update_operator_password', {
    p_id: operatorId,
    p_new_password: newPassword,
  });
  if (error) {
    console.error('[operatorAuth] update password RPC error:', error);
    return { ok: false, error };
  }
  return { ok: data === true, error: null };
}
