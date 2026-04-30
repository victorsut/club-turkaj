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
