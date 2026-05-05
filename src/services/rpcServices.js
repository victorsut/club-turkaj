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
