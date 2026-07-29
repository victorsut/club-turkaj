// src/services/adminAuthService.js
// Servicio de autenticación de administradores de Puntos Plus.
// Usa la RPC `authenticate_admin` de Supabase, que valida contra
// password_hash con bcrypt server-side (extensions.crypt + pgcrypto).
// La contraseña en texto plano nunca se guarda en el cliente.
//
// Patrón espejo de operatorAuthService.js para mantener consistencia.

import { sb } from '../lib/supabaseClient';
import { setAdminToken, getAdminToken, clearAdminToken } from './sessionTokens';

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
 * Cierra la sesión del admin.
 * SEC.B.6.3: revoca el token de sesión server-side (best-effort) ANTES de
 * borrar el localStorage. El borrado local va SIEMPRE (fuera del try/catch):
 * si la revocación falla (sin red, server caído), se traga el error y el
 * logout local NO se bloquea. Un token huérfano no-revocado expira en ≤18h y
 * la validación de B.6 corre en modo warn (no bloquea).
 */
export async function logoutAdmin() {
  // 1. Leer el token ANTES de borrarlo (clearAdminToken lo elimina abajo).
  const token = getAdminToken()?.token;

  // 2. Revocar server-side (best-effort). if (sb && token) evita el round-trip
  //    si el token está ausente o ya venció (getAdminToken auto-limpia).
  if (sb && token) {
    try {
      await sb.rpc('revoke_admin_session', { p_token: token });
    } catch (err) {
      console.error('[adminAuth] revoke fail:', err);
    }
  }

  // 3. Borrado local SIEMPRE (fuera del try/catch de la revocación).
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

// ──────────────────────────────────────────────
// GESTIÓN DE ADMINISTRADORES (objetivo #1, 29-jul-2026)
// ──────────────────────────────────────────────
// La tabla `admins` quedó CERRADA a la API abierta (antes cualquiera
// con la anon key podía leer los bcrypt e insertarse un admin). Todo
// pasa por RPCs con la sesión de admin; las acciones sensibles llevan
// auditoría atómica server-side (admin_audit_log).

function auditParams(audit = {}) {
  if (!audit.adminId) return {};
  return {
    p_admin_id: audit.adminId,
    p_admin_name: audit.adminName,
    p_admin_email: audit.adminEmail,
    p_reason_text: audit.reasonText,
  };
}

async function adminRpc(name, params, tag) {
  const token = getAdminToken()?.token;
  if (!sb || !token) return { error: 'Sesión de admin no disponible' };
  const { data, error } = await sb.rpc(name, { p_session_token: token, ...params });
  if (error) { console.error(`[adminAuth:${tag}]`, error.message); return { error: error.message }; }
  return data || { error: 'Sin respuesta' };
}

/** Lista de administradores (sin password_hash). */
export async function fetchAdmins() {
  const token = getAdminToken()?.token;
  if (!sb || !token) return [];
  const { data, error } = await sb.rpc('list_admins', { p_session_token: token });
  if (error) { console.error('[adminAuth:list]', error.message); return []; }
  return data || [];
}

/** Alta de administrador (bcrypt server-side). */
export async function createAdmin({ name, dpi, gafete, email, password }, audit = {}) {
  return adminRpc('create_admin', {
    p_name: name, p_dpi: dpi, p_gafete: gafete, p_email: email, p_password: password,
    ...auditParams(audit),
  }, 'create');
}

/**
 * Cambia la contraseña de un admin. Si el objetivo es uno MISMO, el
 * servidor exige la contraseña actual; si es otro, queda auditado.
 */
export async function updateAdminPassword(targetId, newPassword, { currentPassword = null, ...audit } = {}) {
  return adminRpc('update_admin_password', {
    p_target_id: targetId, p_new_password: newPassword,
    p_current_password: currentPassword,
    ...auditParams(audit),
  }, 'password');
}

/** Activa/desactiva un admin (no permite auto-desactivarse ni dejar 0 activos). */
export async function toggleAdminActive(targetId, newActive, audit = {}) {
  return adminRpc('toggle_admin_active', {
    p_target_id: targetId, p_new_active: newActive, ...auditParams(audit),
  }, 'toggle');
}
