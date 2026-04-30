// src/services/operatorAuthService.js
import { sb } from '../lib/supabaseClient';

const STORAGE_KEY = 'ct_op';

/**
 * Autentica un operador contra Supabase usando la RPC authenticate_operator.
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

    // Mapear al shape que espera el resto de la app (loggedOp.*)
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

export function saveSession(operator) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operator));
  } catch (err) {
    console.error('[operatorAuth] save fail:', err);
  }
}

export function getOperatorSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logoutOperator() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
