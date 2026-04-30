// src/services/operatorAuthService.js
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'club_turkaj_operator_session';

/**
 * Autentica un operador contra Supabase usando la RPC authenticate_operator.
 * @param {Object} credentials - { gafete, dpi, username, password }
 * @returns {Promise<{ok: boolean, operator?: object, error?: string}>}
 */
export async function loginOperator({ gafete, dpi, username, password }) {
  // Validaciones básicas en cliente
  if (!gafete?.trim() || !dpi?.trim() || !username?.trim() || !password?.trim()) {
    return { ok: false, error: 'Todos los campos son requeridos' };
  }

  try {
    const { data, error } = await supabase.rpc('authenticate_operator', {
      p_gafete: gafete.trim(),
      p_dpi: dpi.trim(),
      p_username: username.trim().toLowerCase(),
      p_password: password,
    });

    if (error) {
      console.error('[operatorAuth] RPC error:', error);
      return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
    }

    if (!data || data.length === 0) {
      return { ok: false, error: 'Credenciales incorrectas' };
    }

    const operator = data[0];
    saveSession(operator);
    return { ok: true, operator };
  } catch (err) {
    console.error('[operatorAuth] Unexpected error:', err);
    return { ok: false, error: 'Error inesperado. Intenta de nuevo.' };
  }
}

/**
 * Guarda la sesión del operador en sessionStorage.
 * sessionStorage se limpia al cerrar el navegador (apropiado para turnos).
 */
export function saveSession(operator) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...operator,
      logged_at: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[operatorAuth] Could not save session:', err);
  }
}

/**
 * Recupera la sesión actual del operador (si existe).
 * @returns {object|null}
 */
export function getOperatorSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión del operador.
 */
export function logoutOperator() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[operatorAuth] Could not clear session:', err);
  }
}

/**
 * Verifica si hay una sesión de operador activa.
 */
export function isOperatorLoggedIn() {
  return getOperatorSession() !== null;
}
