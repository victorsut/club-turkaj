// ============================================================
// Club Turkaj — RPC Services (Funciones del Servidor)
// ============================================================
// Todas las llamadas a funciones RPC de Supabase viven aquí.
// Esto centraliza la lógica sensible que se ejecuta en PostgreSQL
// (transacciones atómicas, validaciones de negocio).
//
// Las funciones RPC correspondientes están definidas en:
//   sql/02-rpc-refactor.sql
// ============================================================

import { sb } from '../lib/supabaseClient';

// ──────────────────────────────────────────────
// Helper genérico para llamadas RPC
// ──────────────────────────────────────────────
async function callRpc(fnName, params) {
  const { data, error } = await sb.rpc(fnName, params);
  if (error) {
    console.error(`[RPC:${fnName}]`, error.message);
    return { data: null, error };
  }
  // Las funciones RPC retornan JSONB; puede venir como string o ya parseado
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  // Si el resultado contiene un campo "error", es un error de negocio
  if (parsed?.error) {
    return { data: null, error: { message: parsed.error } };
  }
  return { data: parsed, error: null };
}

// ──────────────────────────────────────────────
// 1. COMPRAS — register_purchase
// ──────────────────────────────────────────────
// Registra una compra de combustible de forma atómica:
//   - Lee precios de combustible desde program_config
//   - Inserta en `purchases`
//   - Actualiza puntos, galones, visitas, last_operator_id en `members`
//   - Registra en `activity_log`
//   - Si hay cambio de tier → actualiza `physical_cards` (código + tier)
//
// @returns {{
//   purchase_id, points, gallons,
//   tier_changed: boolean,
//   old_tier: 'ORO'|'PLATINO'|'BLACK',
//   new_tier: 'ORO'|'PLATINO'|'BLACK',
//   new_card_code: string|null
// } | error}
// ──────────────────────────────────────────────
export async function registerPurchase({
  memberId,
  operatorId,
  stationId,
  amount,
  fuelType,
  invoiceNo = null,
}) {
  return callRpc('register_purchase', {
    p_member_id: memberId,
    p_operator_id: operatorId,
    p_station_id: stationId,
    p_amount: amount,
    p_fuel_type: fuelType,
    p_invoice_no: invoiceNo,
  });
}

// ──────────────────────────────────────────────
// 2. CANJES — redeem_reward
// ──────────────────────────────────────────────
// Canjea un premio. Crea la fila con confirm_status='none'.
// El flujo realtime de operador (OpRedeem.jsx) hace luego
// update confirm_status='pending' → cliente confirma → operador
// marca collected=true.
//
// @returns {{
//   redemption_id, code, cost, discount,
//   reward_name, reward_icon
// } | error}
// ──────────────────────────────────────────────
export async function redeemReward({
  memberId,
  rewardId,
  operatorId = null,
}) {
  return callRpc('redeem_reward', {
    p_member_id: memberId,
    p_reward_id: rewardId,
    p_operator_id: operatorId,
  });
}

// ──────────────────────────────────────────────
// 3. BOLETOS DE RIFA — buy_raffle_tickets
// ──────────────────────────────────────────────
// Compra boletos de rifa mensual. Inserta en `raffle_tickets`
// (no `raffle_entries` — esa tabla está deprecada).
//
// @returns {{
//   tickets, cost,
//   remaining_points, new_ticket_total
// } | error}
// ──────────────────────────────────────────────
export async function buyRaffleTickets({
  memberId,
  raffleId,
  quantity,
}) {
  return callRpc('buy_raffle_tickets', {
    p_member_id: memberId,
    p_raffle_id: raffleId,
    p_quantity: quantity,
  });
}

// ──────────────────────────────────────────────
// 4. ENCUESTAS — complete_survey
// ──────────────────────────────────────────────
// Completa una encuesta diaria. La RPC cuenta sola las
// encuestas del día desde la tabla `surveys`, así que el
// cliente debe CONFIAR en `count` y `bonus_ticket` retornados
// (no llevar contador local separado).
//
// @returns {{
//   points, count, limit, bonus_ticket,
//   remaining_points, new_ticket_total
// } | error}
// ──────────────────────────────────────────────
export async function completeSurvey(memberId) {
  return callRpc('complete_survey', {
    p_member_id: memberId,
  });
}

// ──────────────────────────────────────────────
// 5. NIVEL DE MIEMBRO — get_member_tier
// ──────────────────────────────────────────────
// Calcula el nivel basado en galones acumulados:
//   - 0-149 gal   → ORO
//   - 150-499 gal → PLATINO
//   - 500+ gal    → BLACK
//
// @returns 'ORO' | 'PLATINO' | 'BLACK'
// ──────────────────────────────────────────────
export async function getMemberTier(gallons) {
  return callRpc('get_member_tier', { gal: gallons });
}

// ──────────────────────────────────────────────
// 6. PRECIOS — update_fuel_prices
// ──────────────────────────────────────────────
// Actualiza los precios de combustible vía RPC con SECURITY
// DEFINER. program_config tiene RLS estricta (solo SELECT a
// anon). El UPDATE directo no funciona — devuelve data:null sin
// error. El RPC valida server-side: 3 claves obligatorias
// (super, regular, diesel), cada precio Q1.00-Q100.00, hace
// UPSERT idempotente. Devuelve el JSON exacto persistido.
//
// @param {Object} prices - { super, regular, diesel } como numbers
// @param {Object} [audit] - Auditoría opcional (F0.3.1). Si trae
//   adminId, el RPC registra la acción en admin_audit_log dentro de
//   la misma transacción. Shape: { adminId, adminName, adminEmail,
//   reasonText }. Sin adminId → path legacy sin logging.
// @returns {Promise<{ data: Object|null, error: Object|null }>}
// ──────────────────────────────────────────────
export async function updateFuelPrices(prices, audit = {}) {
  const params = { p_prices: prices };
  if (audit.adminId) {
    params.p_admin_id = audit.adminId;
    params.p_admin_name = audit.adminName;
    params.p_admin_email = audit.adminEmail;
    params.p_reason_text = audit.reasonText;
  }
  return callRpc('update_fuel_prices', params);
}
