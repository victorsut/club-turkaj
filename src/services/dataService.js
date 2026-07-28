// ============================================================
// Puntos Plus — Data Services (CRUD directo a tablas)
// ============================================================
// Operaciones directas sobre las 18 tablas de Supabase.
// Para lógica transaccional, usar rpcServices.js en su lugar.
// ============================================================

import { sb } from '../lib/supabaseClient';

// ──────────────────────────────────────────────
// MIEMBROS (members)
// ──────────────────────────────────────────────
export async function fetchMembers() {
  // SEC.C.1: la API abierta solo expone columnas NO sensibles.
  const { data, error } = await sb
    .from('members')
    .select('id, name, points, gallons, spent, visits, tickets, redeemed_count, last_buy, last_station, card_id, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) console.error('[Data:members]', error.message);
  return data || [];
}

// SEC.C.1 — ficha completa de todos los miembros para operador/admin
// (valida su sesión server-side; devuelve perfiles jsonb sin hash).
export async function fetchMembersFull(sessionToken, role) {
  const { data, error } = await sb.rpc('list_members_full', {
    p_session_token: sessionToken, p_role: role,
  });
  if (error) { console.error('[Data:membersFull]', error.message); return []; }
  return data || [];
}

// SEC.C.1 — ficha completa de UN miembro (operador/admin).
export async function fetchMemberFull(sessionToken, role, memberId) {
  const { data, error } = await sb.rpc('get_member_full', {
    p_session_token: sessionToken, p_role: role, p_member_id: memberId,
  });
  if (error) { console.error('[Data:memberFull]', error.message); return null; }
  return data;
}

export async function fetchMemberById(id) {
  const { data, error } = await sb
    .from('members')
    .select('*, physical_cards!assigned_to(card_code)')
    .eq('id', id)
    .single();
  if (error) console.error('[Data:member]', error.message);
  return data;
}

export async function fetchMemberByAuthId(authId) {
  const { data, error } = await sb
    .from('members')
    .select('*, physical_cards!assigned_to(card_code)')
    .eq('auth_provider_id', authId);
  if (error) console.error('[Data:memberByAuth]', error.message);
  return data?.[0] || null;
}

export async function fetchMemberByEmail(email) {
  const { data, error } = await sb
    .from('members')
    .select('*, physical_cards!assigned_to(card_code)')
    .eq('email', email);
  if (error) console.error('[Data:memberByEmail]', error.message);
  return data?.[0] || null;
}

export async function createMember(memberData) {
  const { data, error } = await sb
    .from('members')
    .insert(memberData)
    .select();
  if (error) console.error('[Data:createMember]', error.message);
  return { data: data?.[0], error };
}

// ──────────────────────────────────────────────
// OPERADORES (operators)
// ──────────────────────────────────────────────
export async function fetchOperators() {
  const { data, error } = await sb
    .from('operators')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error('[Data:operators]', error.message);
  return data || [];
}

export async function createOperator(opData) {
  const { data, error } = await sb
    .from('operators')
    .insert(opData)
    .select();
  if (error) console.error('[Data:createOp]', error.message);
  return { data: data?.[0], error };
}

export async function updateOperator(id, updates) {
  const { data, error } = await sb
    .from('operators')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  if (error) console.error('[Data:updateOp]', error.message);
  return { data: data?.[0], error };
}

// (SEC-lite 25-jul: se eliminaron los autenticadores LEGADOS de
// operador/admin que comparaban password_hash en texto plano en el
// cliente — eran código muerto; los logins reales viven en
// operatorAuthService.js y adminAuthService.js vía RPCs con bcrypt.)

// ──────────────────────────────────────────────
// PREMIOS (rewards)
// ──────────────────────────────────────────────
export async function fetchRewards(activeOnly = true) {
  let query = sb.from('rewards').select('*').order('sort_order');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) console.error('[Data:rewards]', error.message);
  return data || [];
}

export async function createReward(rewardData) {
  const { data, error } = await sb.from('rewards').insert(rewardData).select();
  if (error) console.error('[Data:createReward]', error.message);
  return { data: data?.[0], error };
}

export async function updateReward(id, updates) {
  const { data, error } = await sb.from('rewards').update(updates).eq('id', id).select();
  if (error) console.error('[Data:updateReward]', error.message);
  return { data: data?.[0], error };
}

// ──────────────────────────────────────────────
// PROMOCIONES (promotions)
// ──────────────────────────────────────────────
export async function fetchPromotions(activeOnly = true) {
  let query = sb.from('promotions').select('*').order('sort_order');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) console.error('[Data:promos]', error.message);
  return data || [];
}

export async function createPromotion(promoData) {
  const { data, error } = await sb.from('promotions').insert(promoData).select();
  if (error) console.error('[Data:createPromo]', error.message);
  return { data: data?.[0], error };
}

export async function updatePromotion(id, updates) {
  const { data, error } = await sb
    .from('promotions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  if (error) console.error('[Data:updatePromo]', error.message);
  return { data: data?.[0], error };
}

// ──────────────────────────────────────────────
// ESTACIONES (stations)
// ──────────────────────────────────────────────
export async function fetchStations() {
  const { data, error } = await sb.from('stations').select('*');
  if (error) console.error('[Data:stations]', error.message);
  return data || [];
}

// ──────────────────────────────────────────────
// CONFIGURACIÓN (program_config)
// ──────────────────────────────────────────────
export async function fetchConfig() {
  const { data, error } = await sb.from('program_config').select('*');
  if (error) console.error('[Data:config]', error.message);
  // Convertir array de { key, value } a mapa
  const cfgMap = {};
  (data || []).forEach((row) => {
    cfgMap[row.key] = typeof row.value === 'string'
      ? JSON.parse(row.value)
      : row.value;
  });
  return cfgMap;
}

export async function updateConfig(key, value) {
  const { data, error } = await sb
    .from('program_config')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select();
  if (error) console.error('[Data:updateConfig]', error.message);
  return { data: data?.[0], error };
}

// ──────────────────────────────────────────────
// RIFA (raffle_calendar + raffle_tickets)
// ──────────────────────────────────────────────
export async function fetchRaffleCalendar() {
  const { data, error } = await sb
    .from('raffle_calendar')
    .select('*')
    .order('month');
  if (error) console.error('[Data:raffle]', error.message);
  return data || [];
}

export async function fetchRaffleParticipants(raffleId) {
  const { data, error } = await sb
    .from('raffle_participants')
    .select('*')
    .eq('raffle_id', raffleId);
  if (error) console.error('[Data:rafflePart]', error.message);
  return data || [];
}

// ──────────────────────────────────────────────
// ACTIVITY LOG
// ──────────────────────────────────────────────
export async function fetchActivityLog(limit = 200) {
  const { data, error } = await sb
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('[Data:activity]', error.message);
  return data || [];
}

export async function logActivity({ memberId, type, description, pointsChange, amount, stationId }) {
  const { error } = await sb.from('activity_log').insert({
    member_id: memberId,
    activity_type: type,
    description,
    points_change: pointsChange || null,
    amount: amount || null,
    station_id: stationId || null,
  });
  if (error) console.error('[Data:logActivity]', error.message);
  return !error;
}

// ──────────────────────────────────────────────
// TARJETAS FÍSICAS (physical_cards)
// ──────────────────────────────────────────────
export async function fetchCards() {
  const { data, error } = await sb.from('physical_cards').select('*');
  if (error) console.error('[Data:cards]', error.message);
  return data || [];
}

export async function createCard(cardData) {
  const { data, error } = await sb.from('physical_cards').insert(cardData).select();
  if (error) console.error('[Data:createCard]', error.message);
  return { data: data?.[0], error };
}

export async function updateCard(id, updates) {
  const { data, error } = await sb
    .from('physical_cards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  if (error) console.error('[Data:updateCard]', error.message);
  return { data: data?.[0], error };
}

// Obtener el siguiente codigo correlativo de tarjeta digital
// Prefijos: CTOD (Oro), CTPD (Platino), CTBD (Black)
// El correlativo es global (unico entre todos los tiers)
export async function getNextCardCode(tierName = 'ORO') {
  const prefixMap = { ORO: 'CTOD', PLATINO: 'CTPD', BLACK: 'CTBD' };
  const prefix = prefixMap[tierName] || 'CTOD';
  const { data, error } = await sb
    .from('physical_cards')
    .select('card_code')
    .or('card_code.like.CTOD-%,card_code.like.CTPD-%,card_code.like.CTBD-%');
  if (error) return prefix + '-00001';
  const nums = (data || [])
    .map((c) => {
      const m = c.card_code.match(/^CT[OPB]D-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(5, '0')}`;
}

// Actualizar el prefijo de una tarjeta existente al cambiar de tier
export async function updateCardTierPrefix(cardId, newTierName) {
  const prefixMap = { ORO: 'CTOD', PLATINO: 'CTPD', BLACK: 'CTBD' };
  const newPrefix = prefixMap[newTierName] || 'CTOD';
  const { data: card } = await sb.from('physical_cards').select('card_code').eq('id', cardId).single();
  if (!card) return null;
  const m = card.card_code.match(/^CT[OPB]D-(\d+)$/);
  if (!m) return null;
  const newCode = newPrefix + '-' + m[1];
  const { data, error } = await sb
    .from('physical_cards')
    .update({ card_code: newCode, tier: newTierName })
    .eq('id', cardId)
    .select();
  return { data: data?.[0], error, newCode };
}

// ──────────────────────────────────────────────
// ENCUESTAS (surveys)
// ──────────────────────────────────────────────
export async function fetchSurveys(memberId) {
  const { data, error } = await sb
    .from('surveys')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) console.error('[Data:surveys]', error.message);
  return data || [];
}

// ──────────────────────────────────────────────
// CALIFICACIONES (operator_ratings)
// ──────────────────────────────────────────────
export async function rateOperator({ operatorId, memberId, stars }) {
  const { error } = await sb.from('operator_ratings').insert({
    operator_id: operatorId,
    member_id: memberId,
    stars,
  });
  if (error) console.error('[Data:rate]', error.message);
  return !error;
}

// ──────────────────────────────────────────────
// CANJES (redemptions) — lectura
// ──────────────────────────────────────────────
export async function fetchRedemptions(memberId) {
  const { data, error } = await sb
    .from('redemptions')
    .select('*, rewards(name, icon, category)')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) console.error('[Data:redemptions]', error.message);
  return data || [];
}

// ──────────────────────────────────────────────
// IDENTIFICACIÓN POR QR — fetchMemberByCardCode
// ──────────────────────────────────────────────
// Busca un miembro a partir del código que viaja en el QR
// (formato CT[OPB]D-NNNNN, ya validado por src/lib/cardCodes.js).
//
// Modelo: physical_cards.card_code es el código legible. La FK
// physical_cards.assigned_to → members.id permite hacer resource
// embedding en una sola query.
//
// Casos posibles (return shape):
//   1. Sin conexión           → { data: null, error: { message } }
//   2. Código vacío           → { data: null, error: { message } }
//   3. Error de Supabase      → { data: null, error }
//   4. card_code no existe    → { data: null, error: null, reason: 'card_not_found' }
//   5. Tarjeta sin asignar    → { data: null, error: null, reason: 'card_not_assigned', cardInfo }
//   6. Tarjeta asignada       → { data: { ...member, cardInfo }, error: null }
// ──────────────────────────────────────────────
export async function fetchMemberByCardCode(code) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };

  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) {
    return { data: null, error: { message: 'Código vacío' } };
  }

  const { data, error } = await sb
    .from('physical_cards')
    .select(`
      id,
      card_code,
      tier,
      status,
      assigned_to,
      members:assigned_to (*)
    `)
    .eq('card_code', normalized)
    .maybeSingle();

  if (error) {
    console.error('[Data:fetchMemberByCardCode]', error.message);
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null, reason: 'card_not_found' };
  }

  if (!data.members) {
    return {
      data: null,
      error: null,
      reason: 'card_not_assigned',
      cardInfo: {
        card_code: data.card_code,
        card_status: data.status,
        card_tier: data.tier,
      },
    };
  }

  return {
    data: {
      ...data.members,
      cardInfo: {
        card_code: data.card_code,
        card_status: data.status,
        card_tier: data.tier,
      },
    },
    error: null,
  };
}

// ──────────────────────────────────────────────
// NOTIFICACIONES (notifications) — inbox de la campana
// ──────────────────────────────────────────────
export async function fetchNotifications(memberId, limit = 50) {
  const { data, error } = await sb
    .from('notifications')
    .select('id, type, title, body, data, sent_at, read_at')
    .eq('member_id', memberId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (error) console.error('[Data:notifications]', error.message);
  return data || [];
}

// Marca TODAS las no leídas del miembro (el grant de columna solo
// permite tocar read_at — el resto de la fila es solo del motor).
export async function markNotificationsRead(memberId) {
  const { error } = await sb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('member_id', memberId)
    .is('read_at', null);
  if (error) console.error('[Data:notificationsRead]', error.message);
}
