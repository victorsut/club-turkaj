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
// El contador de usos se arma client-side desde promo_applications
// (dos selects planos): NO se usa el embed `promo_applications(count)`
// porque depende de que PostgREST tenga agregados habilitados —
// un select plano funciona en cualquier configuración. Volumen
// esperado bajo (una fila por compra CON promo).
//
// @returns {{ data: Array|null, error }}
//   Cada fila incluye uses (int) ya aplanado.
export async function fetchPromoRules() {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  const [rulesRes, appsRes] = await Promise.all([
    sb.from('promo_rules').select('*').order('created_at', { ascending: false }),
    sb.from('promo_applications').select('promo_rule_id'),
  ]);
  if (rulesRes.error) {
    console.error('[Promo:fetchPromoRules]', rulesRes.error.message);
    return { data: null, error: rulesRes.error };
  }
  if (appsRes.error) console.error('[Promo:fetchPromoRules] usos:', appsRes.error.message);
  const counts = {};
  (appsRes.data || []).forEach(a => {
    counts[a.promo_rule_id] = (counts[a.promo_rule_id] || 0) + 1;
  });
  const rows = (rulesRes.data || []).map(r => ({ ...r, uses: counts[r.id] || 0 }));
  return { data: rows, error: null };
}

// ──────────────────────────────────────────────
// 1b. LECTURA — fetchPurchasePromo
// ──────────────────────────────────────────────
// Promo aplicada a UNA compra (para el modal de calificación del
// cliente: el INSERT Realtime de purchases no trae la promo, pero
// promo_applications sí — register_purchase la escribe en la misma
// transacción, así que al llegar el evento ya está commiteada).
// Embed to-one hacia promo_rules (FK) — no requiere agregados.
//
// @returns {{ data: { name, effectType, effectValue, extraPoints,
//                     pointsBase, pointsFinal }|null, error }}
//   data null (sin error) = la compra no tuvo promo.
export async function fetchPurchasePromo(purchaseId) {
  if (!sb || !purchaseId) return { data: null, error: null };
  const { data, error } = await sb
    .from('promo_applications')
    .select('points_base, points_final, effect, promo_rules(name, effect_type, effect_value)')
    .eq('purchase_id', purchaseId)
    .maybeSingle();
  if (error) {
    console.error('[Promo:fetchPurchasePromo]', error.message);
    return { data: null, error };
  }
  if (!data) return { data: null, error: null };
  return {
    data: {
      name: data.promo_rules?.name || 'Promoción',
      effectType: data.promo_rules?.effect_type || data.effect?.type,
      effectValue: data.promo_rules?.effect_value ?? data.effect?.value,
      extraPoints: data.effect?.extra_points ?? (data.points_final - data.points_base),
      pointsBase: data.points_base,
      pointsFinal: data.points_final,
      // PROMO-1b: premio regalado (snapshot en effect jsonb)
      rewardName: data.effect?.reward_name || null,
      redemptionCode: data.effect?.redemption_code || null,
    },
    error: null,
  };
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
// 2b. IMÁGENES — uploadPromoImage (R1b.2 / D33)
// ──────────────────────────────────────────────
// Sube el "sujeto" de imagen de una promoción vía el serverless
// /api/upload-promo-image (el bucket promo-images no acepta escritura
// con la apikey anon; el endpoint valida el token admin y sube con la
// service key). Antes de subir, la imagen se REDIMENSIONA client-side
// (máx 1200px de lado) para respetar el límite de 2 MB y no castigar
// los datos móviles del cliente. PNG conserva transparencia (ideal
// para sujetos recortados); JPEG/WebP se re-encodea a JPEG 0.85.
//
// @param {File} file - imagen elegida en el input del admin.
// @returns {Promise<{ data: string|null, error }>} data = URL pública.
export async function uploadPromoImage(file) {
  const token = getAdminToken()?.token;
  if (!token) return { data: null, error: { message: 'Sesión admin no disponible' } };
  if (!file?.type?.startsWith('image/')) {
    return { data: null, error: { message: 'El archivo debe ser una imagen' } };
  }
  try {
    const keepPng = file.type === 'image/png';
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const i = new Image();
      i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
      i.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
      i.src = url;
    });
    const MAX = 1200;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const contentType = keepPng ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(contentType, keepPng ? undefined : 0.85);
    const base64 = dataUrl.split(',')[1];
    // Guard del límite del bucket (2 MB): un PNG fotográfico de fondo
    // completo puede superarlo — el JPG comprime mucho mejor.
    if (Math.ceil(base64.length * 3 / 4) > 2 * 1024 * 1024) {
      return { data: null, error: { message: 'La imagen procesada supera 2 MB — exportala como JPG (el PNG solo conviene si usa transparencia)' } };
    }

    const res = await fetch('/api/upload-promo-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, contentType, data: base64 }),
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: { message: json.error || 'Error al subir la imagen' } };
    return { data: json.url, error: null };
  } catch (err) {
    console.error('[Promo:uploadPromoImage]', err);
    return { data: null, error: { message: err.message } };
  }
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
