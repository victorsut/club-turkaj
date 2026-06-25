// ============================================================
// Club Turkaj / Puntos+ — Session Tokens (SEC.B.4)
// ============================================================
// Módulo ÚNICO que encapsula la persistencia de los tokens de
// sesión de operador y admin en localStorage.
//
// Los tokens los emite el server (authenticate_operator /
// authenticate_admin, SEC.B.3) con TTL de 18h. Aquí solo los
// guardamos/leemos/borramos en el cliente. La validación y
// revocación reales viven server-side (SEC.B.6).
//
// REGLAS:
// - Claves SEPARADAS por rol (ct_operator_token, ct_admin_token):
//   cerrar/limpiar un rol no toca al otro. El cliente NO tiene
//   token aquí — usa Supabase Auth nativo (su JWT viaja solo).
// - getXToken() hace un chequeo LOCAL de expiración (cortesía de
//   UX, no autoridad): si expiresAt ya pasó, trata el token como
//   ausente (devuelve null) y lo limpia. La autoridad real es el
//   server en SEC.B.6.
// - Comparación por INSTANTE ABSOLUTO: expiresAt es un timestamptz
//   de Postgres (ISO 8601 con offset) y Date.parse lo convierte a
//   epoch UTC, igual que Date.now(). NO hay conversión a hora de
//   Guatemala — la TZ solo importa para MOSTRAR, no para validez.
//
// Ningún otro archivo debe hardcodear estas claves: todo pasa
// por este módulo.
// ============================================================

const OPERATOR_TOKEN_KEY = 'ct_operator_token';
const ADMIN_TOKEN_KEY = 'ct_admin_token';

// ──────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────

/**
 * Guarda { token, expiresAt } bajo la clave dada.
 * expiresAt se normaliza a string ISO para persistir.
 */
function setToken(storageKey, { token, expiresAt } = {}) {
  if (!token) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ token, expiresAt: expiresAt ?? null }));
  } catch (err) {
    console.error('[sessionTokens] set fail:', storageKey, err);
  }
}

/**
 * Lee { token, expiresAt } de la clave dada aplicando el chequeo
 * local de expiración. Devuelve:
 *   - { token, expiresAt } si hay token y no está vencido.
 *   - null si no hay token, está corrupto, o ya expiró (y en ese
 *     caso limpia la clave).
 */
function getToken(storageKey) {
  let raw;
  try {
    raw = localStorage.getItem(storageKey);
  } catch (err) {
    console.error('[sessionTokens] get fail:', storageKey, err);
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Valor corrupto: limpiar para forzar re-login.
    clearToken(storageKey);
    return null;
  }
  if (!parsed?.token) {
    clearToken(storageKey);
    return null;
  }

  // Chequeo local de expiración (instante absoluto, sin TZ local).
  // Política ESTRICTA: un expiresAt ausente o no parseable NO recibe
  // el beneficio de la duda. La RPC siempre emite el token junto a su
  // session_expires_at, así que una fecha rota solo ocurre por
  // manipulación manual del localStorage o un bug en el set — en
  // ninguno de esos casos el token es de fiar.
  //
  // Guard explícito con Number.isFinite: Date.parse devuelve NaN ante
  // input inválido/ausente, y NaN en cualquier comparación da false,
  // lo que caería silenciosamente en comportamiento tolerante. El
  // rechazo es explícito, no se deja a la semántica de NaN.
  const expMs = Date.parse(parsed.expiresAt);
  if (!Number.isFinite(expMs) || expMs <= Date.now()) {
    clearToken(storageKey);
    return null;
  }

  return { token: parsed.token, expiresAt: parsed.expiresAt };
}

/**
 * Borra la clave dada. Idempotente.
 */
function clearToken(storageKey) {
  try {
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.error('[sessionTokens] clear fail:', storageKey, err);
  }
}

// ──────────────────────────────────────────────
// API pública — OPERADOR
// ──────────────────────────────────────────────

export function setOperatorToken(payload) {
  setToken(OPERATOR_TOKEN_KEY, payload);
}

export function getOperatorToken() {
  return getToken(OPERATOR_TOKEN_KEY);
}

export function clearOperatorToken() {
  clearToken(OPERATOR_TOKEN_KEY);
}

// ──────────────────────────────────────────────
// API pública — ADMIN
// ──────────────────────────────────────────────

export function setAdminToken(payload) {
  setToken(ADMIN_TOKEN_KEY, payload);
}

export function getAdminToken() {
  return getToken(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  clearToken(ADMIN_TOKEN_KEY);
}
