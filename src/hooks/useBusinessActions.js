// src/hooks/useBusinessActions.js
// Acciones de NEGOCIO del orquestador — todas delegan en RPCs atómicas
// server-side y acá solo queda el optimismo de UI (toasts, state local,
// push). Extraído de App.jsx en la división etapa 4 (12-ago-2026) SIN
// cambios de lógica: addPurchase (register_purchase), redeem
// (redeem_reward), buyTickets (buy_raffle_tickets), doSurvey
// (complete_survey), checkSpecialDayBonus (grant_special_day_bonus),
// loadTodaySurveys (count_my_surveys_today) y logActivity (solo estado
// local — el rastro persistente lo escriben los RPCs, SEC.C.3).
import { useCallback } from 'react';
import { sb } from '../lib/supabaseClient';
import { registerPurchase, redeemReward, buyRaffleTickets, completeSurvey, grantSpecialDayBonus, countMySurveysToday } from '../services';
import { getMemberToken } from '../services/sessionTokens';
import { localDate } from '../lib/dates';
import { sendPushToMember } from '../lib/pushNotifications';
import { firstName } from '../lib/text'; // regla 29-jul: al cliente solo el primer nombre del personal

export default function useBusinessActions({
  me, curMonth, fire, sbConnected, loggedOp,
  setMe, setCusts, setActivityLog, setMySurveyCount,
  setRedeemedList, setRafData, setSpecialBonusModal, setAmt,
}) {
  // ===== SUPABASE WRITE HELPERS =====
  const logActivity = useCallback((memberId, type, desc, ptsChange, amount) => {
    // SEC.C.3: el INSERT directo de activity_log quedó revocado — este
    // helper solo actualiza el estado LOCAL (optimismo de UI). El
    // rastro persistente lo escriben los RPCs server-side (la 'entrega'
    // la registra deliver_redemption; compras/canjes/rifa/encuestas ya
    // lo hacían desde sus propios RPCs).
    setActivityLog(prev => {
      const n = { ...prev };
      if (!n[memberId]) n[memberId] = [];
      n[memberId] = [{ type, desc, pts: ptsChange, amount, date: localDate(), station: '' }, ...n[memberId]];
      return n;
    });
  }, []);

  // Helper: cargar conteo de encuestas del día para un miembro
  const loadTodaySurveys = useCallback(async (memberId) => {
    if (!sb || !memberId) return;
    // SEC.C.4: surveys quedó cerrada (el INSERT abierto permitía
    // bloquear el límite diario de un miembro) — el conteo llega por
    // RPC con su sesión, resuelto en zona Guatemala server-side.
    const count = await countMySurveysToday();
    if (count == null) {
      console.warn('[Surveys] conteo no disponible (sesión legada o error)');
    } else {
      setMySurveyCount(count || 0);
      console.log('[Surveys] Encuestas hoy:', count);
    }
  }, []);

  // ===== DÍAS FESTIVOS: otorgar puntos al abrir la app =====
  // FB.6.3 — delega en la RPC grant_special_day_bonus (atomica,
  // delta server-side). Reemplaza la logica legacy que reseteaba
  // points e insertaba un activity_type invalido ('evento_especial').
  const checkSpecialDayBonus = async (memberId) => {
    if (!memberId) return;

    const result = await grantSpecialDayBonus(memberId);

    if (!result.ok) {
      console.error('[FB] checkSpecialDayBonus error:', result.error?.message);
      return;
    }

    // data es la respuesta de la RPC: { ok, bonus?, events?, member_name?, reason? }
    const data = result.data;

    if (!data?.ok) {
      // ok:false con reason (member_not_found, already_granted,
      // no_bonus_today) -> silencioso.
      return;
    }

    // ok:true: aplicar bonus en state local + modal celebrativo
    const { bonus, events, member_name } = data;
    const today = localDate();

    setMe(prev => prev ? {
      ...prev,
      points: (prev.points || 0) + bonus,
      last_special_bonus: today,
    } : prev);

    setCusts(prev => prev.map(c =>
      c.id === memberId
        ? {
            ...c,
            points: (c.points || 0) + bonus,
            last_special_bonus: today,
          }
        : c
    ));

    // Modal celebrativo personalizado por tier (FB.6.2c) — reemplaza el toast
    setSpecialBonusModal({
      open: true,
      events,
      bonus,
      memberName: member_name,
    });
  };

  // ──────────────────────────────────────────────
  // addPurchase — delega en RPC register_purchase
  // ──────────────────────────────────────────────
  // La RPC hace TODO de forma atómica:
  //   - Lee precios desde program_config
  //   - Inserta en purchases
  //   - Actualiza members (puntos, galones, visitas, last_buy, last_operator_id)
  //   - Inserta en activity_log
  //   - Si hay cambio de tier → actualiza physical_cards
  //
  // El cliente solo: muestra toast, optimistic UI, push notification.
  // Devuelve true solo si la compra se registró (el confirm del modal
  // usa el resultado — antes se llamaba sin await y el toast de éxito
  // salía siempre, incluso si el RPC rechazaba).
  const addPurchase = useCallback(async (cid, a, f) => {
    if (!a || a < 10) { fire('Mínimo Q10'); return false; }
    if (!sb || !sbConnected) { fire('Sin conexión'); return false; }

    const stationName = loggedOp?.station || '';

    // Llamada al RPC
    const { data, error, sessionExpired } = await registerPurchase({
      memberId: cid,
      operatorId: loggedOp?.id || null,
      stationId: loggedOp?.stationId || null,
      amount: a,
      fuelType: f,
    });

    if (error) {
      console.error('[Purchase] RPC error:', error.message);
      if (sessionExpired) return false; // SEC.B.8.2: expireSession ya manejó el rechazo; no pisar el toast con el crudo.
      fire('Error: ' + error.message);
      return false;
    }

    const { points: pts, gallons: gal, tier_changed, new_tier, new_card_code, promo } = data;
    const today = localDate();
    // PROMO-1: pts ya viene FINAL (base + extra); promo trae {name, extra_points} si aplicó.
    // PROMO-1b: grant_reward regala un canje (reward_name, redemption_code) en vez de puntos.
    // Sin emojis (11-ago): promoTag viaja también al body del PUSH, que
    // el SO renderiza sin pasar por stripEmojis del Toast — el cliente
    // veía 🎁/🎉 en la pantalla de bloqueo.
    const promoTag = promo
      ? (promo.effect_type === 'grant_reward'
        ? ` · ${promo.reward_name} GRATIS`
        : ` · ${promo.name} (+${promo.extra_points})`)
      : '';

    // Optimistic update del state local con los valores REALES devueltos por el server
    setCusts(p => p.map(c => c.id === cid ? {
      ...c,
      points: c.points + pts,
      gallons: +(parseFloat(c.gallons || 0) + gal).toFixed(2),
      spent: +(parseFloat(c.spent || 0) + a).toFixed(2),
      visits: (c.visits || 0) + 1,
      lastBuy: today,
      station: stationName || c.station,
      cardId: new_card_code || c.cardId,
    } : c));

    if (me?.id === cid) setMe(p => ({
      ...p,
      points: p.points + pts,
      gallons: +(parseFloat(p.gallons || 0) + gal).toFixed(2),
      spent: +(parseFloat(p.spent || 0) + a).toFixed(2),
      visits: (p.visits || 0) + 1,
      lastBuy: today,
      station: stationName || p.station,
      cardId: new_card_code || p.cardId,
    }));

    fire(`+${pts} pts · ${gal} gal · Q${a}${promoTag}`);
    setAmt('');

    // Push notification (motor): si el cliente tiene la app cerrada, el
    // tap de la notificación abre su modal de calificación + encuesta
    // (misma data que el canal Realtime de purchases).
    if (loggedOp) {
      sendPushToMember(cid, {
        type: 'purchase',
        title: promo ? '¡Compra con promoción!' : '¡Compra registrada!',
        // Regla del dueño (29-jul): al cliente solo el PRIMER nombre.
        body: `+${pts} pts · ${gal} gal · Q${a}${promoTag}${tier_changed && new_tier ? ` · ¡Subiste a ${new_tier}!` : ''} — Atendido por ${firstName(loggedOp.name)}`,
        data: {
          operatorId: loggedOp.id,
          operatorName: firstName(loggedOp.name),
          stationName,
          purchaseId: data.purchase_id || null,
          points: pts,
          amount: a,
          actions: [
            { action: 'rate', title: 'Calificar' },
            { action: 'dismiss', title: 'Cerrar' },
          ],
        },
      });

      // Premio por promoción (grant_reward): push aparte con deep-link a
      // los canjes pendientes, donde vive el QR para reclamarlo.
      if (promo?.effect_type === 'grant_reward') {
        sendPushToMember(cid, {
          type: 'reward',
          title: '¡Ganaste un premio!',
          body: `${promo.name ? promo.name + ': ' : ''}${promo.reward_name} gratis por tu compra. Abrí la notificación para ver el QR y mostralo al operador cuando quieras reclamarlo.`,
          url: '/?goto=pendientes',
          data: { rewardName: promo.reward_name, code: promo.redemption_code || null },
        });
      }
    }

    // Aviso de upgrade de tier
    if (tier_changed && new_card_code) {
      fire('⭐ ¡Subiste a ' + new_tier + '! Tu código es ' + new_card_code);
    }
    return true;
  }, [me, fire, sbConnected, loggedOp]);

  // ──────────────────────────────────────────────
  // redeem — delega en RPC redeem_reward
  // ──────────────────────────────────────────────
  // La RPC valida puntos, calcula descuento por tier, valida exclusividad
  // de tier, crea la fila en redemptions con confirm_status='none' (default),
  // descuenta puntos y registra activity_log.
  // El flujo de confirmación con el operador (OpRedeem) sigue intacto:
  // operador escanea → update confirm_status='pending' → cliente confirma.
  //
  // r.id debe ser el UUID del reward en Supabase (no el campo "id" local).
  const redeem = useCallback(async (r) => {
    if (!me?.id) return;
    if (!sb || !sbConnected) { fire('Sin conexión'); return; }
    if (!r.id) { fire('Premio sin ID válido'); return; }

    const { data, error } = await redeemReward({
      memberId: me.id,
      rewardId: r.id,
      operatorId: null, // canje desde cliente, sin operador asociado aún
    });

    if (error) {
      fire('❌ ' + (error.message || 'Error al canjear'));
      return;
    }

    const { redemption_id, code, cost, reward_name, reward_icon } = data;
    const today = localDate();
    const newEntry = {
      id: redemption_id,
      memberId: me.id,
      reward: { name: reward_name, icon: reward_icon, cat: r.cat },
      cost, date: today, code, collected: false,
    };

    // Update local state con valores REALES del server
    setMe(p => ({ ...p, points: p.points - cost, redeemed: (p.redeemed || 0) + 1 }));
    setCusts(p => p.map(c => c.id === me.id
      ? { ...c, points: c.points - cost, redeemed: (c.redeemed || 0) + 1 }
      : c));
    setRedeemedList(p => [newEntry, ...p]);
    fire(`🎉 ¡Canjeaste ${reward_name} por ${cost} pts!`);
  }, [me, fire, sbConnected]);

  // ──────────────────────────────────────────────
  // buyTickets — delega en RPC buy_raffle_tickets
  // ──────────────────────────────────────────────
  // La RPC valida puntos, descuenta, inserta en raffle_tickets
  // (no raffle_entries — esa tabla está deprecada) y registra activity.
  const buyTickets = useCallback(async (n) => {
    if (!me?.id) return;
    if (!n || n < 1) { fire('Cantidad inválida'); return; }
    if (!sb || !sbConnected) { fire('Sin conexión'); return; }

    // Obtener ID de la rifa del mes actual (curMonth es 0-indexed)
    const { data: rafRow, error: rafErr } = await sb
      .from('raffle_calendar')
      .select('id')
      .eq('month', curMonth + 1)
      .eq('year', new Date().getFullYear())
      .maybeSingle();

    if (rafErr || !rafRow?.id) {
      fire('Rifa no disponible para este mes');
      return;
    }

    // SEC.C.1: la compra exige la sesión de miembro (el vector sin token
    // quedó cerrado server-side).
    const { data, error } = await buyRaffleTickets({
      memberId: me.id,
      raffleId: rafRow.id,
      quantity: n,
      sessionToken: getMemberToken()?.token ?? null,
      sessionRole: 'member',
    });

    if (error) {
      fire('❌ ' + (error.message || 'Error al comprar boletos'));
      return;
    }

    const { tickets, cost, remaining_points, new_ticket_total } = data;

    setMe(p => ({ ...p, points: remaining_points, tickets: new_ticket_total }));
    setCusts(p => p.map(c => c.id === me.id
      ? { ...c, points: remaining_points, tickets: new_ticket_total }
      : c));
    setRafData(p => p.map((rd, i) => {
      if (i !== curMonth) return rd;
      const ps = [...rd.participants];
      const ex = ps.findIndex(p2 => p2.cid === me.id);
      if (ex >= 0) ps[ex] = { ...ps[ex], tickets: ps[ex].tickets + tickets };
      else ps.push({ cid: me.id, name: me.nickname || (me.name || '').split(' ')[0], avatar: me.avatar || '', tickets });
      return { ...rd, participants: ps };
    }));

    fire(`🎟️ ${tickets} boleto${tickets > 1 ? 's' : ''} · -${cost} pts`);
  }, [me, fire, curMonth, sbConnected]);

  // ──────────────────────────────────────────────
  // doSurvey — delega en RPC complete_survey
  // ──────────────────────────────────────────────
  // La RPC cuenta encuestas del día desde la tabla `surveys`,
  // valida límite, suma puntos, otorga bonus si es la 5ta.
  // El cliente CONFÍA en `count` y `bonus_ticket` retornados.
  // Devuelve { ok, pts, count, limit, bonusTicket } — la confirmación
  // visual es un MODAL persistente en ClientHome (14-ago: el toast se
  // perdía cuando la recarga de la PWA reclamaba durante el boot).
  const doSurvey = useCallback(async () => {
    if (!me?.id) return { ok: false };
    // Solo exige el cliente de Supabase — NO sbConnected (fin del boot
    // completo): el reclamo tras la recarga de la PWA debe poder correr
    // apenas la sesión del miembro esté lista (14-ago).
    if (!sb) { fire('Sin conexión'); return { ok: false }; }

    const { data, error } = await completeSurvey(me.id);

    if (error) {
      fire('❌ ' + (error.message || 'Error al guardar encuesta'));
      return { ok: false };
    }

    const { points: pts, count, limit, bonus_ticket, remaining_points, new_ticket_total } = data;

    setMySurveyCount(count);
    setMe(p => ({ ...p, points: remaining_points, tickets: new_ticket_total }));
    setCusts(p => p.map(c => c.id === me.id
      ? { ...c, points: remaining_points, tickets: new_ticket_total }
      : c));

    if (bonus_ticket) {
      // El boleto bonus entra a la rifa del mes en curso (RPC
      // complete_survey, migration 20260721b) — reflejarlo al instante.
      setRafData(p => p.map((rd, i) => {
        if (i !== curMonth) return rd;
        const ps = [...rd.participants];
        const ex = ps.findIndex(p2 => p2.cid === me.id);
        if (ex >= 0) ps[ex] = { ...ps[ex], tickets: ps[ex].tickets + 1 };
        else ps.push({ cid: me.id, name: me.nickname || (me.name || '').split(' ')[0], avatar: me.avatar || '', tickets: 1 });
        return { ...rd, participants: ps };
      }));
    }

    return { ok: true, pts, count, limit, bonusTicket: !!bonus_ticket };
  }, [me, fire, sbConnected, curMonth]);

  return { logActivity, loadTodaySurveys, checkSpecialDayBonus, addPurchase, redeem, buyTickets, doSurvey };
}
