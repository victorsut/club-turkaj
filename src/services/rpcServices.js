// ============================================================
// Puntos Plus — RPC Services (Funciones del Servidor — NEGOCIO)
// ============================================================
// RPCs del flujo de NEGOCIO del programa: compras, canjes, rifa,
// encuestas, bono de día especial e impresión de comprobantes.
// Esto centraliza la lógica sensible que se ejecuta en PostgreSQL
// (transacciones atómicas, validaciones de negocio).
//
// División 15-ago-2026 (regla de 500 líneas): el helper callRpc
// vive en rpcCore.js y la familia de ADMIN/AUDITORÍA (precios,
// admin_audit_log, mutaciones de miembros auditadas) en
// adminRpcServices.js — todo movido VERBATIM.
//
// Las funciones RPC correspondientes están definidas en:
//   sql/02-rpc-refactor.sql
// ============================================================

import { sb } from '../lib/supabaseClient';
import { callRpc } from './rpcCore';
import { getOperatorToken, getMemberToken } from './sessionTokens';

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
  // SEC.B.5.2: register_purchase es vector ÚNICO de operador. El wrapper
  // resuelve el token de operador y lo pasa a callRpc. Si está
  // expirado/ausente → null (el server lo ignora hasta B.6).
  return callRpc('register_purchase', {
    p_member_id: memberId,
    p_operator_id: operatorId,
    p_station_id: stationId,
    p_amount: amount,
    p_fuel_type: fuelType,
    p_invoice_no: invoiceNo,
  }, { sessionToken: getOperatorToken()?.token ?? null });
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
  // SEC.C.6: el token de miembro decide sobre qué cuenta se canjea
  // (el server sobrescribe p_member_id con el id de la sesión).
  return callRpc('redeem_reward', {
    p_member_id: memberId,
    p_reward_id: rewardId,
    p_operator_id: operatorId,
  }, { sessionToken: getMemberToken()?.token ?? null });
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
  sessionToken = null,
  sessionRole = 'member',
}) {
  // SEC.C.1: sesión OBLIGATORIA con rol explícito. El call site cliente
  // (App.jsx) pasa el token de miembro con rol 'member' (solo puede
  // comprar para sí mismo); OpRaffle.jsx pasa el de operador con rol
  // 'operator' (cualquier miembro). El vector sin token quedó cerrado.
  return callRpc('buy_raffle_tickets', {
    p_member_id: memberId,
    p_raffle_id: raffleId,
    p_quantity: quantity,
    p_session_role: sessionRole,
  }, { sessionToken });
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
  // SEC.C.6: sesión de miembro (el server valida y usa su propio id).
  return callRpc('complete_survey', {
    p_member_id: memberId,
  }, { sessionToken: getMemberToken()?.token ?? null });
}

// ====================================================================
// 10. MIEMBROS — grant_special_day_bonus (FB.6.2a)
// ====================================================================

/**
 * Otorga el bonus de dias especiales (cumpleaños + festivos) de
 * forma atomica con auditoria via activity_log.
 *
 * Reemplaza la logica cliente checkSpecialDayBonus (App.jsx) que
 * tenia un bug critico: reseteaba points en lugar de sumar el
 * bonus. La RPC server-side usa delta (points = points + bonus)
 * en una transaccion atomica.
 *
 * Dedup diaria: si ya recibio bonus hoy (last_special_bonus =
 * CURRENT_DATE), retorna already_granted.
 *
 * @param {string} memberId - UUID del miembro.
 * @returns {Promise<{ ok: boolean, data?: Object, error?: Object }>}
 *   En exito: { ok: true, data: { ok: true, bonus, events[],
 *     member_name } }.
 *   En no-aplica: { ok: true, data: { ok: false, reason } }
 *     donde reason puede ser:
 *     - 'member_not_found'
 *     - 'already_granted' (ya recibio hoy)
 *     - 'no_bonus_today' (no hay cumpleaños ni festivo hoy)
 *   En error: { ok: false, error }.
 *
 * El cliente debe distinguir:
 * - data.ok === true: mostrar modal flotante con events[] y
 *   member_name.
 * - data.ok === false: silencioso (no mostrar nada).
 * - !response.ok: error de red/server (log).
 */
export async function grantSpecialDayBonus(memberId) {
  // Validaciones cliente-side defensivas
  if (!sb) {
    return { ok: false, error: { message: 'Sin conexión al servidor' } };
  }
  if (!memberId) {
    return { ok: false, error: { message: 'memberId obligatorio' } };
  }

  // Llamar RPC con patron crudo (sin callRpc)
  // SEC.C.6: sesión de miembro (el server valida y usa su propio id).
  const { data, error } = await sb.rpc('grant_special_day_bonus', {
    p_member_id: memberId,
    p_session_token: getMemberToken()?.token ?? null,
  });

  if (error) {
    console.error('[FB] grantSpecialDayBonus error:', error.message);
    return { ok: false, error };
  }

  // data es jsonb: { ok, bonus, events, member_name } o { ok: false, reason }
  return { ok: true, data };
}

// ──────────────────────────────────────────────
// 12. IMPRESIÓN — log_print (FA-lite / D37)
// ──────────────────────────────────────────────
// Registra en print_logs cada impresión de comprobante disparada
// (best-effort: desde el navegador no se puede confirmar la salida
// física del papel). El server valida el token de OPERADOR en modo
// STRICT (28000 → intercepción centralizada) y deriva operador,
// miembro y estación server-side. Llamada fire-and-forget desde
// OpRedeem: nunca bloquea la impresión.
//
// @returns {{ data: { log_id }|null, error, sessionExpired? }}
export async function logPrint({ redemptionId, copyType, printerHint = null }) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('log_print', {
    p_redemption_id: redemptionId,
    p_copy_type: copyType,
    p_printer_hint: printerHint,
  }, { sessionToken: getOperatorToken()?.token ?? null });
}
