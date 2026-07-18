// ============================================================
// Puntos Plus — Promo Service (PROMO-1 / D32)
// ============================================================
// Capa de acceso al motor de promociones. La lógica sensible vive
// server-side:
//   - promo_rules solo se escribe vía RPC manage_promo_rule (token
//     admin STRICT + reason obligatorio + auditoría atómica).
//   - La aplicación de promos ocurre DENTRO de register_purchase
//     (pick_best_promo, sin stacking) — acá no hay nada que aplicar.
//   - preview_promo simula "¿aplicaría hoy a una compra de QX?"
//     sin persistir nada.
//
// Vive en archivo propio (no en rpcServices.js) por la regla de
// modularidad: rpcServices ya roza el límite de 500 líneas.
// ============================================================

import { sb } from '../lib/supabaseClient';
import { getAdminToken } from './sessionTokens';
import { notifySessionExpired } from './sessionExpiry';

// ──────────────────────────────────────────────
// 1. LECTURA — fetchPromoRules
// ──────────────────────────────────────────────
// promo_rules tiene SELECT abierto por RLS (info de marketing).
// El embed promo_applications(count) trae el contador de usos por
// regla (para "X usos" y el límite en la UI admin).
//
// @returns {{ data: Array|null, error }}
//   Cada fila incluye uses (int) ya aplanado.
export async function fetchPromoRules() {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  const { data, error } = await sb
    .from('promo_rules')
    .select('*, promo_applications(count)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Promo:fetchPromoRules]', error.message);
    return { data: null, error };
  }
  const rows = (data || []).map(r => ({
    ...r,
    uses: r.promo_applications?.[0]?.count ?? 0,
    promo_applications: undefined,
  }));
  return { data: rows, error: null };
}

// ──────────────────────────────────────────────
// 2. ESCRITURA — managePromoRule
// ──────────────────────────────────────────────
// Único punto de escritura de promo_rules. El server valida el
// token de admin en modo STRICT (28000 → intercepción centralizada),
// exige reason y registra en admin_audit_log en la MISMA transacción
// (patrón gamma: si el log falla, rollback completo — acá NO se usa
// logAdminAction client-first).
//
// @param {string} action - 'create' | 'update' | 'toggle' | 'delete'.
// @param {Object} audit - { adminId, adminName, adminEmail, reasonText }.
// @param {Object} opts - { ruleId?: uuid, rule?: Object }.
//   create/update: rule = estado COMPLETO de la regla (el form manda
//   todos los campos; arrays vacíos se normalizan a NULL server-side).
//   toggle/delete: solo ruleId.
// @returns {Promise<{ ok, data?, error?, sessionExpired? }>}
//   En éxito: data = { ok, action, log_id, rule }.
//   Errores server conocidos: 22023 (validaciones, grant_reward
//   deshabilitado, delete con usos), 28000 (sesión).
export async function managePromoRule(action, audit = {}, { ruleId = null, rule = null } = {}) {
  if (!sb) return { ok: false, error: { message: 'Sin conexión al servidor' } };
  if (!audit.adminId) return { ok: false, error: { message: 'adminId es obligatorio' } };
  if (!audit.reasonText || !String(audit.reasonText).trim()) {
    return { ok: false, error: { message: 'reasonText es obligatorio' } };
  }

  const { data, error } = await sb.rpc('manage_promo_rule', {
    p_action: action,
    p_admin_id: audit.adminId,
    p_admin_name: audit.adminName,
    p_admin_email: audit.adminEmail,
    p_reason_text: audit.reasonText,
    p_rule_id: ruleId,
    p_rule: rule,
    p_session_token: getAdminToken()?.token ?? null,
  });

  if (error) {
    console.error('[Promo:managePromoRule]', error.message);
    if (error.code === '28000') {
      notifySessionExpired();
      return { ok: false, error, sessionExpired: true };
    }
    return { ok: false, error };
  }
  return { ok: true, data };
}

// ──────────────────────────────────────────────
// 3. SIMULADOR — previewPromo
// ──────────────────────────────────────────────
// "¿Aplicaría a una compra de Q150 de súper hoy en Turkaj II?"
// Corre con las reglas y límites REALES (member NULL: omite el
// límite por miembro). No persiste nada.
//
// @returns {{ data: { base_points, final_points, promo|null }|null,
//             error, sessionExpired? }}
export async function previewPromo({ amount, fuelType, stationId = null, tier = 'ORO' }) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  const { data, error } = await sb.rpc('preview_promo', {
    p_amount: amount,
    p_fuel_type: fuelType,
    p_station_id: stationId,
    p_tier: tier,
    p_session_token: getAdminToken()?.token ?? null,
  });
  if (error) {
    console.error('[Promo:previewPromo]', error.message);
    if (error.code === '28000') {
      notifySessionExpired();
      return { data: null, error, sessionExpired: true };
    }
    return { data: null, error };
  }
  if (data?.error) return { data: null, error: { message: data.error } };
  return { data, error: null };
}
