// ============================================================
// Club Turkaj — RPC Services (Funciones del Servidor)
// ============================================================
// Todas las llamadas a funciones RPC de Supabase viven aquí.
// Esto centraliza la lógica sensible que se ejecuta en PostgreSQL
// (transacciones atómicas, validaciones de negocio).
//
// Las funciones RPC correspondientes están definidas en:
//   supabase-schema.sql → Sección 18. FUNCIONES RPC
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
//   - Inserta en `purchases`
//   - Actualiza puntos, galones, visitas en `members`
//   - Registra en `activity_log`
//
// @param {string} memberId    - UUID del miembro
// @param {string} operatorId  - UUID del operador que registra
// @param {string} stationId   - UUID de la estación
// @param {number} amount      - Monto en Quetzales (ej: 250.00)
// @param {string} fuelType    - 'super' | 'regular' | 'diesel'
// @param {string} [invoiceNo] - Número de factura (opcional)
//
// @returns {{ purchase_id, points, gallons } | error}
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
// Canjea un premio del catálogo:
//   - Verifica puntos suficientes
//   - Aplica descuento por nivel (PLATINO -10%, BLACK -15%)
//   - Inserta en `redemptions`
//   - Descuenta puntos en `members`
//   - Registra en `activity_log`
//
// @param {string} memberId   - UUID del miembro
// @param {string} rewardId   - UUID del premio a canjear
// @param {string} [operatorId] - UUID del operador (opcional)
//
// @returns {{ code, cost, discount } | error}
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
// Compra boletos de rifa mensual:
//   - Verifica puntos (5 pts = 1 boleto por defecto)
//   - Inserta en `raffle_tickets`
//   - Descuenta puntos, incrementa tickets en `members`
//   - Registra en `activity_log`
//
// @param {string} memberId  - UUID del miembro
// @param {string} raffleId  - UUID de la rifa mensual (raffle_calendar.id)
// @param {number} quantity  - Cantidad de boletos a comprar
//
// @returns {{ tickets, cost } | error}
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
// Completa una encuesta diaria:
//   - Verifica límite diario (5 por defecto)
//   - Si es la 5ta encuesta → otorga boleto bonus
//   - Suma puntos en `members`
//   - Registra en `activity_log`
//
// @param {string} memberId - UUID del miembro
//
// @returns {{ points, count, limit, bonus_ticket } | error}
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
// @param {number} gallons - Galones acumulados del miembro
//
// @returns {string} 'ORO' | 'PLATINO' | 'BLACK'
// ──────────────────────────────────────────────
export async function getMemberTier(gallons) {
  return callRpc('get_member_tier', { gal: gallons });
}
