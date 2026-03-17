// ============================================================
// Club Turkaj — Auth Service
// ============================================================
// Maneja toda la autenticación:
//   - Login/Registro de clientes (teléfono + contraseña)
//   - OAuth (Google, Apple)
//   - Login de operadores (gafete + DPI + user + pass)
//   - Login de administradores (DPI + gafete + email + pass)
// ============================================================

import { sb } from '../lib/supabaseClient';
import {
  fetchMemberByAuthId,
  fetchMemberByEmail,
  authenticateOperator as authOp,
  authenticateAdmin as authAdmin,
} from './dataService';

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
// CLIENTES — Teléfono + Contraseña
// (Busca directamente en tabla `members`)
// ──────────────────────────────────────────────
export async function signInWithPhone(phone, password) {
  const { data, error } = await sb
    .from('members')
    .select('*, physical_cards!assigned_to(card_code)')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return { data: null, error: { message: 'Número no registrado' } };
  }
  // TODO: Migrar a bcrypt-compare vía función RPC en producción
  if (data.password_hash !== password) {
    return { data: null, error: { message: 'Contraseña incorrecta' } };
  }
  return { data, error: null };
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
// OPERADORES
// ──────────────────────────────────────────────
export async function signInOperator({ gafete, dpi, username, password }) {
  return authOp({ gafete, dpi, username, password });
}

// ──────────────────────────────────────────────
// ADMINISTRADORES
// ──────────────────────────────────────────────
export async function signInAdmin({ dpi, gafete, email, password }) {
  return authAdmin({ dpi, gafete, email, password });
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
