// ============================================================
// Puntos Plus — RPC Services (Funciones del Servidor)
// ============================================================
// Todas las llamadas a funciones RPC de Supabase viven aquí.
// Esto centraliza la lógica sensible que se ejecuta en PostgreSQL
// (transacciones atómicas, validaciones de negocio).
//
// Las funciones RPC correspondientes están definidas en:
//   sql/02-rpc-refactor.sql
// ============================================================

import { sb } from '../lib/supabaseClient';
import { getOperatorToken, getAdminToken, getMemberToken } from './sessionTokens';
import { notifySessionExpired } from './sessionExpiry'; // SEC.B.8.2: rechazo reactivo de sesión (28000)

// ──────────────────────────────────────────────
// Helper genérico para llamadas RPC
// ──────────────────────────────────────────────
async function callRpc(fnName, params, { sessionToken } = {}) {
  // SEC.B.5.2: si el caller pasa un sessionToken (truthy), lo inyectamos
  // como p_session_token. callRpc NO adivina rol — el caller decide qué
  // token pasar (o ninguno). Si no viene, la RPC lo recibe como DEFAULT
  // NULL server-side (B.5.1) y por ahora lo ignora (validación real en B.6).
  if (sessionToken) {
    params = { ...params, p_session_token: sessionToken };
  }
  const { data, error } = await sb.rpc(fnName, params);
  if (error) {
    console.error(`[RPC:${fnName}]`, error.message);
    // SEC.B.8.2: rechazo de sesión strict (B.8.1). Detección centralizada:
    // avisa a la capa React (expireSession via singleton) y marca el flag para
    // que el call site se haga a un lado (no pise el toast lindo con el crudo).
    if (error.code === '28000') {
      notifySessionExpired();
      return { data: null, error, sessionExpired: true };
    }
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

// ──────────────────────────────────────────────
// 7. AUDITORÍA — log_admin_action (client-first)
// ──────────────────────────────────────────────
// Wrapper genérico para registrar una acción admin en
// admin_audit_log. Se usa en el patrón "client-first" para
// mutaciones directas que NO tienen RPC propio con auditoría
// atómica (p.ej. update_operator en OpManagement). Para acciones
// que SÍ tienen RPC con auditoría integrada (update_fuel_prices,
// create_operator, update_operator_password, toggle_operator_active)
// NO se usa esto: el log ya ocurre server-side en la transacción.
//
// NOTA TÉCNICA: NO usa el helper callRpc. log_admin_action retorna
// un uuid escalar; callRpc hace JSON.parse(data) sobre strings, y
// un uuid pelado no es JSON válido → SyntaxError. Por eso la llamada
// es cruda vía sb.rpc.
//
// El server valida reason_text obligatorio para acciones sensibles
// (lista en log_admin_action). update_operator NO es sensible, pero
// igual aceptamos reason si se provee.
//
// @returns {Promise<{ data: string|null, error: Object|null }>}
//   data = uuid del log creado.
// ──────────────────────────────────────────────
export async function logAdminAction({
  adminId, adminName, adminEmail, action,
  entityType = null, entityId = null, reasonText = null,
  oldValue = null, newValue = null, metadata = null,
}) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  const { data, error } = await sb.rpc('log_admin_action', {
    p_admin_id: adminId, p_admin_name: adminName, p_admin_email: adminEmail,
    p_action: action, p_entity_type: entityType, p_entity_id: entityId,
    p_reason_text: reasonText, p_old_value: oldValue, p_new_value: newValue,
    p_metadata: metadata,
  });
  if (error) { console.error('[RPC:log_admin_action]', error.message); return { data: null, error }; }
  return { data, error: null };
}

// ──────────────────────────────────────────────
// 7b. MIEMBROS — admin_reset_member_password (25-jul-2026)
// ──────────────────────────────────────────────
/**
 * Restablece la contraseña de un miembro desde el panel admin.
 * bcrypt server-side + auditoría obligatoria (la contraseña NO
 * se guarda en el log). Vía de recuperación mientras no exista el
 * flujo autónomo por SMS/correo.
 * @returns {Promise<{ok: boolean, error: object|null}>}
 */
export async function adminResetMemberPassword(memberId, newPassword, audit = {}) {
  if (!sb) return { ok: false, error: { message: 'Sin conexión al servidor' } };
  const { data, error } = await sb.rpc('admin_reset_member_password', {
    p_member_id: memberId,
    p_new_password: newPassword,
    p_admin_id: audit.adminId,
    p_admin_name: audit.adminName,
    p_admin_email: audit.adminEmail,
    p_reason_text: audit.reasonText,
    p_session_token: getAdminToken()?.token ?? null, // SEC.C.6: exige sesión de admin
  });
  if (error) {
    console.error('[RPC:admin_reset_member_password]', error.message);
    return { ok: false, error };
  }
  return { ok: data?.ok === true, error: null };
}

// ──────────────────────────────────────────────
// 8. MIEMBROS — update_member_with_audit (F0.3.8)
// ──────────────────────────────────────────────
/**
 * Actualiza un miembro (perfil/puntos/galones) con auditoria
 * atomica gamma.
 *
 * La RPC server-side aplica todos los cambios + emite 1-3 logs
 * en admin_audit_log en una sola transaccion. Si algo falla,
 * rollback completo.
 *
 * NOTA TÉCNICA: NO usa el helper callRpc. Mantiene el patrón crudo
 * coherente con logAdminAction (familia de auditoría) y controla
 * de forma explícita el shape de retorno { ok, data?, error? }.
 * La RPC retorna jsonb { ok, logs_created, categories_updated } en
 * éxito y RAISE (22023 / 23505) en error — el error llega en el
 * campo `error` de PostgREST, no dentro de `data`.
 *
 * @param {string} memberId - UUID del miembro a actualizar.
 * @param {Object} audit - { adminId, adminName, adminEmail, reasonText }.
 * @param {Object} changes - Diff por categoria, ej:
 *   { profile: { name, phone, ... }, points: 50, gallons: 30.5 }
 *   Solo incluir categorias y campos que efectivamente cambian.
 * @returns {Promise<{ ok: boolean, data?: Object, error?: Object }>}
 *   En caso de exito: { ok: true, data: { ok, logs_created,
 *   categories_updated } }.
 *   En caso de error: { ok: false, error: {...} }.
 *   Errores conocidos del server:
 *   - 22023: validaciones (member inexistente, reason vacio,
 *     campo no whitelisted, categoria no permitida, etc.)
 *   - 23505: UNIQUE violation traducida al español (phone/dpi)
 */
export async function updateMemberWithAudit(memberId, audit = {}, changes = {}) {
  // ── Validaciones cliente-side (defensivas, evitan round trips) ──
  if (!sb) return { ok: false, error: { message: 'Sin conexión al servidor' } };
  if (!memberId) return { ok: false, error: { message: 'memberId es obligatorio' } };
  if (!audit.adminId) return { ok: false, error: { message: 'adminId es obligatorio' } };
  if (!audit.reasonText || !String(audit.reasonText).trim()) {
    return { ok: false, error: { message: 'reasonText es obligatorio' } };
  }
  const hasValidCategory = changes && typeof changes === 'object'
    && ['profile', 'points', 'gallons'].some(k => k in changes);
  if (!hasValidCategory) {
    return { ok: false, error: { message: 'changes no contiene ninguna categoría válida' } };
  }

  // ── Patrón crudo (sin callRpc): retorna jsonb estructurado ──
  const { data, error } = await sb.rpc('update_member_with_audit', {
    p_member_id: memberId,
    p_admin_id: audit.adminId,
    p_admin_name: audit.adminName,
    p_admin_email: audit.adminEmail,
    p_reason_text: audit.reasonText,
    p_changes: changes,
    p_session_token: getAdminToken()?.token ?? null, // SEC.B.5.3 (ignorado server-side hasta B.6)
  });

  if (error) {
    console.error('[F0.3.8] updateMemberWithAudit error:', error.message);
    // SEC.B.8.2: rechazo de sesión strict (28000) — wrapper crudo de admin.
    if (error.code === '28000') {
      notifySessionExpired();
      return { ok: false, error, sessionExpired: true };
    }
    return { ok: false, error };
  }
  // data es jsonb: { ok, logs_created, categories_updated }
  return { ok: true, data };
}

// ──────────────────────────────────────────────
// 9. MIEMBROS — modify_member_points (FB.3 / FB.4)
// ──────────────────────────────────────────────
/**
 * Modifica los puntos de un miembro con auditoria atomica gamma.
 *
 * La RPC server-side aplica el cambio (delta o set absoluto) y
 * emite un log en admin_audit_log en una sola transaccion. Si
 * algo falla, rollback completo. Tambien setea
 * app.allow_points_write para preparar el trigger de FB.7.
 *
 * MODOS XOR: change debe tener EXACTAMENTE uno de:
 *   - delta: suma/resta relativa, rango [-50000, 50000].
 *   - setTo: valor absoluto, >= 0.
 *
 * NOTA TÉCNICA: NO usa el helper callRpc. Mantiene el patrón crudo
 * coherente con logAdminAction y updateMemberWithAudit (familia de
 * auditoría) y controla de forma explícita el shape de retorno
 * { ok, data?, error? }. La RPC retorna jsonb estructurado en éxito
 * y RAISE (22023) en error — el error llega en el campo `error` de
 * PostgREST, no dentro de `data`.
 *
 * @param {string} memberId - UUID del miembro.
 * @param {Object} audit - { adminId, adminName, adminEmail, reasonText }.
 * @param {Object} change - { delta?: number, setTo?: number, actionType: string }.
 *   actionType debe ser uno de: manual_adjustment, special_day_bonus,
 *   compensation, correction, promotional_grant.
 * @returns {Promise<{ ok: boolean, data?: Object, error?: Object }>}
 *   En exito: { ok: true, data: { ok, log_id, old_points,
 *     new_points, delta_applied, action_type } }.
 *   En error: { ok: false, error: {...} }.
 *   Codigos de error conocidos del server:
 *   - 22023: validaciones (member inexistente, reason vacio o
 *     corto/largo, action_type invalido, delta fuera de rango,
 *     resultado negativo, etc).
 */
export async function modifyMemberPoints(memberId, audit, change) {
  // ── Validaciones cliente-side defensivas (evitan round-trip) ──
  if (!sb) {
    return { ok: false, error: { message: 'Sin conexión al servidor' } };
  }
  if (!memberId) {
    return { ok: false, error: { message: 'memberId obligatorio' } };
  }
  if (!audit?.adminId) {
    return { ok: false, error: { message: 'audit.adminId obligatorio' } };
  }
  if (!audit?.reasonText || !audit.reasonText.trim()) {
    return { ok: false, error: { message: 'audit.reasonText obligatorio' } };
  }

  // ── Validar XOR de modos ──
  const hasDelta = change?.delta !== undefined && change?.delta !== null;
  const hasSetTo = change?.setTo !== undefined && change?.setTo !== null;

  if (!hasDelta && !hasSetTo) {
    return { ok: false, error: { message: 'Debe especificar delta o setTo' } };
  }
  if (hasDelta && hasSetTo) {
    return { ok: false, error: { message: 'delta y setTo son mutuamente exclusivos' } };
  }

  if (!change?.actionType) {
    return { ok: false, error: { message: 'change.actionType obligatorio' } };
  }

  // ── Patrón crudo (sin callRpc): retorna jsonb estructurado ──
  const params = {
    p_member_id: memberId,
    p_admin_id: audit.adminId,
    p_admin_name: audit.adminName,
    p_admin_email: audit.adminEmail,
    p_reason_text: audit.reasonText,
    p_delta: hasDelta ? change.delta : null,
    p_set_to: hasSetTo ? change.setTo : null,
    p_action_type: change.actionType,
    p_session_token: getAdminToken()?.token ?? null, // SEC.B.5.3 (ignorado server-side hasta B.6)
  };

  const { data, error } = await sb.rpc('modify_member_points', params);

  if (error) {
    console.error('[FB] modifyMemberPoints error:', error.message);
    // SEC.B.8.2: rechazo de sesión strict (28000) — wrapper crudo de admin.
    // (Sin call site en UI hoy; la detección queda a prueba de futuro.)
    if (error.code === '28000') {
      notifySessionExpired();
      return { ok: false, error, sessionExpired: true };
    }
    return { ok: false, error };
  }

  // data es jsonb: { ok, log_id, old_points, new_points,
  //                  delta_applied, action_type }
  return { ok: true, data };
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
// 11. AUDITORÍA — get_admin_audit_log (B0/F0.4)
// ──────────────────────────────────────────────
// Lectura paginada del admin_audit_log (RLS deny-all: esta RPC es
// la única vía de lectura). El server valida el token de admin en
// modo STRICT y rechaza con 28000 — callRpc ya intercepta ese
// código (logout + aviso), así que el call site solo debe hacer
// bail cuando sessionExpired venga true.
//
// Fechas: strings 'YYYY-MM-DD' interpretadas server-side como días
// calendario de Guatemala (America/Guatemala).
//
// @returns {{ data: { total, rows: Array }|null, error, sessionExpired? }}
export async function getAdminAuditLog({
  limit = 20, offset = 0,
  action = null, entityType = null,
  dateFrom = null, dateTo = null,
} = {}) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('get_admin_audit_log', {
    p_limit: limit, p_offset: offset,
    p_action: action, p_entity_type: entityType,
    p_date_from: dateFrom, p_date_to: dateTo,
  }, { sessionToken: getAdminToken()?.token ?? null });
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
