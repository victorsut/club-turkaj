// src/services/adminAuthService.js
// Servicio de autenticación de administradores Club Turkaj.
// Usa la RPC `authenticate_admin` de Supabase, que valida contra
// password_hash con bcrypt server-side (extensions.crypt + pgcrypto).
// La contraseña en texto plano nunca se guarda en el cliente.
//
// Patrón espejo de operatorAuthService.js para mantener consistencia.

import { sb } from '../lib/supabaseClient';
import { setAdminToken, clearAdminToken } from './sessionTokens';

const STORAGE_KEY = 'ct_admin';

/**
 * Autentica un administrador contra Supabase.
 * @param {Object} credentials
 * @param {string} credentials.dpi      - DPI del administrador
 * @param {string} credentials.gafete   - Número de gafete
 * @param {string} credentials.email    - Correo electrónico
 * @param {string} credentials.password - Contraseña en texto plano
 * @returns {Promise<{ok: boolean, admin?: object, error?: string}>}
 */
export async function loginAdmin({ dpi, gafete, email, password }) {
  if (!dpi?.trim() || !gafete?.trim() || !email?.trim() || !password) {
    return { ok: false, error: 'Completa todos los campos' };
  }
  if (!sb) {
    return { ok: false, error: 'Sin conexión al servidor' };
  }

  try {
    const { data, error } = await sb.rpc('authenticate_admin', {
      p_dpi: dpi.trim(),
      p_gafete: gafete.trim(),
      p_email: email.trim().toLowerCase(),
      p_password: password,
    });

    if (error) {
      console.error('[adminAuth] RPC error:', error);
      return { ok: false, error: 'Error de conexión, intenta de nuevo' };
    }
    if (!data || data.length === 0) {
      return { ok: false, error: 'Credenciales incorrectas' };
    }

    // Mapear al shape consistente con el resto de la app
    const r = data[0];
    const admin = {
      id: r.id,
      name: r.name,
      dpi: r.dpi,
      gafete: r.gafete,
      email: r.email,
    };

    // SEC.B.4: persistir el token de sesión emitido por la RPC
    // (authenticate_admin, SEC.B.3) en su clave de rol. Se guarda
    // por separado del objeto admin para que cerrar la sesión de un
    // rol no toque la de otro. La inyección del token en las RPCs
    // sensibles es SEC.B.5.
    setAdminToken({ token: r.session_token, expiresAt: r.session_expires_at });

    saveSession(admin);
    return { ok: true, admin };
  } catch (err) {
    console.error('[adminAuth] Unexpected error:', err);
    return { ok: false, error: 'Error inesperado' };
  }
}

/**
 * Guarda la sesión del admin en localStorage.
 * Cambio importante respecto al código anterior:
 * antes guardaba simplemente 'logged' como string;
 * ahora guarda el objeto admin completo (igual que operadores y miembros).
 */
export function saveSession(admin) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(admin));
  } catch (err) {
    console.error('[adminAuth] save fail:', err);
  }
}

/**
 * Recupera la sesión actual del admin (si existe).
 * @returns {object|null}
 */
export function getAdminSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // Compatibilidad con formato antiguo ('logged' como string suelto)
    if (raw === 'logged') {
      // Sesión antigua sin datos — la limpiamos para forzar re-login
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión del admin (limpia localStorage).
 */
export function logoutAdmin() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[adminAuth] clear fail:', err);
  }
  // SEC.B.4: limpiar el token de admin (solo su clave de rol).
  clearAdminToken();
}

/**
 * Verifica si hay sesión de admin activa.
 */
export function isAdminLoggedIn() {
  return getAdminSession() !== null;
}
