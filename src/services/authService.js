// ============================================================
// Puntos Plus — Auth Service
// ============================================================
// Maneja la autenticación de CLIENTES (miembros):
//   - Login/Registro por teléfono + contraseña
//   - OAuth (Google, Apple)
//   - Resolución de sesión OAuth (busca o crea perfil)
//
// NOTA: La autenticación de operadores y administradores se hace
// vía servicios dedicados con RPCs server-side (bcrypt):
//   - operatorAuthService.js  → loginOperator()
//   - adminAuthService.js     → loginAdmin()
// ============================================================

import { sb } from '../lib/supabaseClient';
import { fetchMemberByAuthId, fetchMemberByEmail } from './dataService';
import { setMemberToken, getMemberToken, clearMemberToken } from './sessionTokens';

// ──────────────────────────────────────────────
// CLIENTES — OAuth (Google / Apple)
// ──────────────────────────────────────────────
export async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
  if (error) console.error('[Auth:Google]', error.message);
  return { error };
}

export async function signInWithApple() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.href },
  });
  if (error) console.error('[Auth:Apple]', error.message);
  return { error };
}

// ──────────────────────────────────────────────
// CLIENTES — Teléfono + Contraseña (SEC-lite, 25-jul-2026)
// ──────────────────────────────────────────────
// RPC `authenticate_member`: verificación bcrypt SERVER-SIDE (acepta
// hashes legados y los auto-migra). La contraseña nunca se compara en
// el cliente. Devuelve { ok, memberId, name } o { ok:false, error }.
export async function signInWithPhone(phone, password) {
  if (!sb) return { ok: false, error: 'Sin conexión al servidor' };
  try {
    const { data, error } = await sb.rpc('authenticate_member', {
      p_phone: (phone || '').trim(),
      p_password: password || '',
    });
    if (error) {
      console.error('[Auth:member] RPC error:', error.message);
      return { ok: false, error: 'Error de conexión, intenta de nuevo' };
    }
    if (data?.error) return { ok: false, error: data.error };
    // SEC.C.1: la RPC emite sesión de miembro y devuelve el perfil
    // completo — el cliente ya no busca su fila en custs.
    if (data.session_token) {
      setMemberToken({ token: data.session_token, expiresAt: data.session_expires_at });
    }
    return { ok: true, memberId: data.member_id, name: data.name, member: data.member || null };
  } catch (err) {
    console.error('[Auth:member] Unexpected:', err);
    return { ok: false, error: 'Error inesperado' };
  }
}

// SEC.C.1 — sesión de miembro vía Google (auth.uid prueba identidad).
// Devuelve { ok, member } o { notFound: true } (→ mostrar registro).
export async function createMemberSessionOauth(avatarUrl) {
  if (!sb) return { ok: false, error: 'Sin conexión' };
  const { data, error } = await sb.rpc('create_member_session_oauth', {
    p_avatar_url: avatarUrl || null,
  });
  if (error) {
    console.error('[Auth:oauth-session]', error.message);
    return { ok: false, error: error.message };
  }
  if (data?.error === 'not_found') return { ok: false, notFound: true };
  if (data?.error) return { ok: false, error: data.error };
  if (data.session_token) {
    setMemberToken({ token: data.session_token, expiresAt: data.session_expires_at });
  }
  return { ok: true, member: data.member };
}

// SEC.C.1 — rehidratación al abrir la app con el token guardado.
export async function getMyMember() {
  if (!sb) return { ok: false, error: 'Sin conexión' };
  const tok = getMemberToken();
  if (!tok?.token) return { ok: false, noToken: true };
  const { data, error } = await sb.rpc('get_my_member', { p_session_token: tok.token });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, invalidSession: true };
  return { ok: true, member: data.member };
}

// SEC.C.1 — logout del miembro: revoca server-side y limpia local.
export async function logoutMember() {
  const tok = getMemberToken();
  if (sb && tok?.token) {
    try { await sb.rpc('revoke_member_session', { p_session_token: tok.token }); }
    catch { /* la revocación es best-effort */ }
  }
  clearMemberToken();
}

// ──────────────────────────────────────────────
// RESOLVER USUARIO DE SESIÓN OAUTH
// ──────────────────────────────────────────────
// Busca si un usuario de Google/Apple ya tiene perfil en `members`
export async function resolveOAuthUser(supabaseUser) {
  if (!supabaseUser) return null;
  // 1. Buscar por auth_provider_id
  let member = await fetchMemberByAuthId(supabaseUser.id);
  if (member) return member;
  // 2. Fallback: buscar por email
  const email = supabaseUser.email;
  if (email) {
    member = await fetchMemberByEmail(email);
    if (member) return member;
  }
  // 3. No existe → es usuario nuevo
  return null;
}

// ──────────────────────────────────────────────
// SESIÓN / LOGOUT
// ──────────────────────────────────────────────
export async function signOut() {
  const { error } = await sb.auth.signOut({ scope: 'local' });
  if (error) console.error('[Auth:signOut]', error.message);
  return { error };
}

export async function getSession() {
  const { data, error } = await sb.auth.getSession();
  if (error) console.error('[Auth:session]', error.message);
  return data?.session || null;
}

// ──────────────────────────────────────────────
// LISTENER DE CAMBIOS DE AUTH
// ──────────────────────────────────────────────
export function onAuthStateChange(callback) {
  const { data } = sb.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
}
