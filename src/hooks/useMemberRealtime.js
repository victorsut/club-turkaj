// src/hooks/useMemberRealtime.js
// Datos y canales realtime del MIEMBRO logueado: rehidratación de la
// sesión (SEC.C.1), libro mayor y canjes propios por RPC (SEC.C.2),
// puntos en vivo, flujo de confirmación de canje (postgres + broadcast)
// y el disparo del modal de calificación tras COMBUSTIBLE. Extraído de
// App.jsx en la división etapa 3 (12-ago-2026) SIN cambios de lógica.
// Devuelve reloadMyRedemptions (lo usan App y el modal de confirmación).
import { useEffect, useCallback } from 'react';
import { sb } from '../lib/supabaseClient';
import { getMyMember, fetchMyActivity, fetchMyRedemptions, fetchPurchasePromo } from '../services';
import { mapMember } from '../lib/mapMember';
import { utcToLocal } from '../lib/dates';

export default function useMemberRealtime({
  me, authScreen, sbConnected, viewRef,
  rewards, stations, operators, loggedOp,
  setMe, setAuthScreen, setCusts, setActivityLog, setRedeemedList,
  setPendingRedeemConfirm, setPendingOpRating, setShowQR, setQrClosing,
  setOpRatings,
}) {
  // Canjes propios del miembro (con código TK para el QR) — se usa al
  // loguearse y al confirmar una entrega (el pendiente pasa a RECOGIDO
  // sin tener que reabrir la app).
  const reloadMyRedemptions = useCallback(() => {
    fetchMyRedemptions().then(rows => {
      if (!rows.length) return;
      setRedeemedList(rows.map(rd => ({
        id: rd.id,
        memberId: rd.member_id,
        reward: { name: rd.reward_name || 'Premio', icon: rd.reward_icon || '🎁', cat: rd.reward_category || '' },
        cost: rd.points_spent,
        date: utcToLocal(rd.created_at) || '',
        code: rd.redemption_code,
        collected: rd.collected || false,
        // D22: vencimiento del canje (solo premios de rifa lo traen)
        expiresAt: rd.expires_at || null,
      })));
      // F7a.3: solicitud de confirmación VIGENTE al abrir la app — si el
      // POS de PROPER (o el operador) la pidió con la app cerrada, el
      // broadcast se perdió; acá se detecta y se abre el modal. Solo
      // solicitudes frescas (< 3 min, confirm_requested_at) para no
      // revivir solicitudes muertas de días anteriores.
      const pend = rows.find(rd =>
        !rd.collected && rd.confirm_status === 'pending' && rd.confirm_requested_at &&
        (Date.now() - new Date(rd.confirm_requested_at).getTime()) < 3 * 60 * 1000);
      if (pend) {
        const reward = rewards.find(r => r.id === pend.reward_id) || null;
        setPendingRedeemConfirm(p => p || {
          redemptionId: pend.id,
          rewardName:   reward?.name || pend.reward_name || 'Premio',
          rewardIcon:   reward?.icon || pend.reward_icon || '🎁',
          reward,
          cost:         pend.points_spent || 0,
        });
      }
    });
  }, [rewards]);

  // ===== HISTORIAL Y CANJES PROPIOS AL LOGUEARSE (28-jul / SEC.C.2) =====
  // El libro mayor COMPLETO del miembro (limit 1000 — el 'registro' con
  // el bonus de alta debe seguir visible; reporte: Fernando Morales) y
  // sus canjes (con redemption_code para el QR del premio) llegan por
  // RPC con su sesión: el SELECT abierto de ambas tablas quedó revocado.
  // Sesiones legadas sin token ven listas vacías hasta re-loguearse.
  useEffect(() => {
    if (!me?.id || authScreen !== 'logged' || viewRef.current !== 'client' || !sb) return;
    if (String(me.id).startsWith('temp-')) return;
    fetchMyActivity(me.id, 1000).then(rows => {
      if (!rows.length) return;
      setActivityLog(prev => ({
        ...prev,
        [me.id]: rows.map(a => ({
          type: a.activity_type,
          desc: a.description,
          pts: a.points_change,
          amount: a.amount ? parseFloat(a.amount) : null,
          date: utcToLocal(a.created_at) || '',
          station: a.station_id || '',
        })),
      }));
    });
    reloadMyRedemptions();
  }, [me?.id, authScreen, reloadMyRedemptions]);

  // ===== SEC.C.1: REHIDRATAR/VALIDAR la sesión de miembro al abrir =====
  // ct_me es solo caché: si hay token, el servidor devuelve el perfil
  // FRESCO (la ficha completa ya no baja por la API abierta). Token
  // inválido/revocado → cerrar la sesión cacheada. Sin token (sesiones
  // pre-SEC.C o Google, que lo obtiene en SIGNED_IN) → no forzar nada.
  useEffect(() => {
    if (!me?.id || authScreen !== 'logged' || viewRef.current !== 'client') return;
    if (String(me.id).startsWith('temp-')) return;
    getMyMember().then(res => {
      if (res.ok && res.member) {
        setMe(prev => prev ? { ...prev, ...mapMember(res.member) } : prev);
      } else if (res.invalidSession) {
        console.warn('[SEC.C] Sesión de miembro inválida → logout');
        localStorage.removeItem('ct_me');
        setMe(null); setAuthScreen('login');
      }
      // noToken: sesión legada o Google pendiente de SIGNED_IN — seguir.
    });
    // Solo al montar con sesión ya restaurada; los cambios de me.id
    // posteriores vienen de logins que ya traen perfil fresco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authScreen]);

  // ===== REALTIME: Actualizar datos del miembro en tiempo real =====
  useEffect(() => {
    if (!sb || !me?.id || !sbConnected) return;
    const channel = sb.channel('member-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'members',
        filter: `id=eq.${me.id}`,
      }, (payload) => {
        const m = payload.new;
        console.log('[Realtime] Member updated:', m.id, 'pts:', m.points, 'visits:', m.visits, 'op_id:', m.last_operator_id);
        setMe(p => ({
          ...p,
          points: m.points ?? p.points,
          gallons: parseFloat(m.gallons) || p.gallons,
          spent: parseFloat(m.spent) || p.spent,
          visits: m.visits ?? p.visits,
          tickets: m.tickets ?? p.tickets,
          redeemed: m.redeemed_count ?? p.redeemed,
          lastBuy: utcToLocal(m.last_buy) || p.lastBuy,
          station: m.last_station || p.station,
        }));
        setCusts(p => p.map(c => c.id === m.id ? {
          ...c,
          points: m.points ?? c.points,
          gallons: parseFloat(m.gallons) || c.gallons,
          spent: parseFloat(m.spent) || c.spent,
          visits: m.visits ?? c.visits,
          tickets: m.tickets ?? c.tickets,
          redeemed: m.redeemed_count ?? c.redeemed,
          lastBuy: utcToLocal(m.last_buy) || c.lastBuy,
          station: m.last_station || c.station,
        } : c));

        // FIX-MODAL (Parte C): la recarga de historial se DESACOPLA del delta de
        // visits. Antes estaba gateada por (newVisits > prevVisits): no recargaba
        // cuando el ref estaba stale (tras combustible), ni cuando la acción del
        // propio cliente (rifa/canje/encuesta) no cambia visits. Ahora recarga en
        // CADA UPDATE de members → cubre combustible cross-device Y refresca el
        // historial del cliente para sus propias acciones. El mapeo no cambia.
        if (viewRef.current === 'client') {
          // ── Recargar historial en el dispositivo del miembro ──
          // limit alto: el historial es el LIBRO MAYOR del miembro — el
          // 'registro' (bonus de alta) debe seguir visible aunque haya
          // mucha actividad posterior (reporte del dueño 28-jul).
          // SEC.C.2: por RPC con la sesión (SELECT abierto revocado).
          fetchMyActivity(m.id, 1000).then(rows => {
            if (!rows.length) return;
            setActivityLog(prev => ({
              ...prev,
              [m.id]: rows.map(a => ({
                type: a.activity_type,
                desc: a.description,
                pts: a.points_change,
                amount: a.amount ? parseFloat(a.amount) : null,
                date: utcToLocal(a.created_at) || '',
                station: a.station_id || '',
              })),
            }));
            console.log('[Realtime] ✅ Historial recargado:', rows.length, 'entradas');
          });
        }

        // FIX-MODAL (Parte D): el modal de calificación se eliminó de acá.
        // Antes se disparaba por delta de visits + last_operator_id pegajoso
        // (frágil). Ahora lo dispara el canal purchases-${me.id} (INSERT de
        // purchases = combustible real, con operator_id/station_id directos).
      })
      .subscribe((status) => {
        console.log('[Realtime] Subscription:', status);
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [me?.id, sbConnected, operators]);

  // ===== REALTIME: Confirmación de canje (miembro confirma/cancela) =====
  useEffect(() => {
    if (!sb || !sbConnected || !me?.id) return;
    const ch = sb.channel(`redemption-confirm-${me.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'redemptions',
        filter: `member_id=eq.${me.id}`,
      }, (payload) => {
        const rd = payload.new;
        console.log('[Realtime] redemption update:', rd.id, 'confirm_status:', rd.confirm_status);
        if (rd.confirm_status === 'pending') {
          // Buscar nombre del premio
          const reward = rewards.find(r => r.id === rd.reward_id);
          console.log('[Realtime] Solicitud de confirmación de canje - reward:', reward?.name || rd.reward_id);
          setPendingRedeemConfirm({
            redemptionId: rd.id,
            rewardName:   reward?.name  || 'Premio',
            rewardIcon:   reward?.icon  || '🎁',
            reward:       reward || null, // objeto completo → RewardIcon + color de categoría
            cost:         rd.points_spent || 0,
          });
        } else if (rd.confirm_status === 'confirmed' || rd.confirm_status === 'cancelled') {
          setPendingRedeemConfirm(p => p?.redemptionId === rd.id ? null : p);
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] redemption-confirm subscription:', status);
      });

    // ── Canal BROADCAST del flujo de confirmación (SEC.C.2b) ──
    // La entrega de postgres_changes con policies/grants de columna
    // resultó no confiable en producción (el UPDATE a 'pending' se
    // commiteaba pero el evento no llegaba al cliente). El operador
    // emite el aviso DIRECTO por broadcast tras marcar 'pending' — sin
    // RLS de por medio — y también el desistimiento (cancel/timeout),
    // que además corrige un hueco viejo: el reset a 'none' nunca
    // cerraba el modal del cliente. El canal postgres queda de respaldo
    // (si ambos llegan, el estado se re-escribe idéntico — inocuo).
    const bc = sb.channel(`redeem-bc-${me.id}`)
      .on('broadcast', { event: 'confirm_request' }, ({ payload }) => {
        if (!payload?.redemptionId) return;
        console.log('[Broadcast] confirm_request:', payload.redemptionId);
        const reward = rewards.find(r => r.id === payload.rewardId) || null;
        setPendingRedeemConfirm({
          redemptionId: payload.redemptionId,
          rewardName:   reward?.name || payload.rewardName || 'Premio',
          rewardIcon:   reward?.icon || payload.rewardIcon || '🎁',
          reward,
          cost:         payload.cost ?? 0,
        });
      })
      .on('broadcast', { event: 'confirm_cancel' }, ({ payload }) => {
        console.log('[Broadcast] confirm_cancel:', payload?.redemptionId);
        setPendingRedeemConfirm(p => p?.redemptionId === payload?.redemptionId ? null : p);
      })
      .subscribe((status) => {
        console.log('[Realtime] redeem-bc subscription:', status);
      });

    return () => { sb.removeChannel(ch); sb.removeChannel(bc); };
  }, [me?.id, sbConnected, rewards]);

  // ===== REALTIME: Modal de calificación de operador tras COMBUSTIBLE =====
  // FIX-MODAL: señal correcta para abrir el modal de estrellas. Antes lo
  // disparaba el handler de members por delta de visits (newVisits > prevVisits)
  // contra una línea base (lastVisitsRef) que se desincronizaba → falsos
  // positivos en rifa/canje. Acá escuchamos INSERT de `purchases`: una fila se
  // crea SOLO por register_purchase (combustible), trae operator_id/station_id
  // directos y NO depende del last_operator_id pegajoso. Rifa/canje/encuesta no
  // insertan en purchases → no pueden abrir el modal. Espejo del patrón de
  // redemption-confirm-${me.id}. No necesita realtimeReadyRef: un INSERT no
  // reproduce estado al suscribir, así que el primer evento es una compra real.
  useEffect(() => {
    if (!sb || !sbConnected || !me?.id) return;
    const ch = sb.channel(`purchases-${me.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'purchases',
        filter: `member_id=eq.${me.id}`,
      }, (payload) => {
        const p = payload.new;
        const opId = p.operator_id;
        const stId = p.station_id;
        console.log('[Realtime] purchase insert:', p.id, 'op_id:', opId, 'station_id:', stId);
        // Sin operador no hay a quién calificar; el modal es solo de la vista cliente.
        if (!opId || viewRef.current !== 'client') return;
        // El cliente suele tener su Código QR abierto (se lo mostró al
        // operador para la compra): cerrarlo para que el modal de
        // calificación quede al frente (pedido del dueño 25-jul).
        setShowQR(false); setQrClosing(false);
        const stationName = stations.find(s => s.id === stId)?.name || '';
        // PROMO-1: el modal muestra los puntos de la compra y la promo aplicada.
        const base = {
          purchaseId: p.id,
          operatorId: opId,
          stationName,
          points: p.points_earned ?? null,
          amount: p.amount ?? null,
        };
        const op = operators.find(o => o.id === opId);
        if (op) {
          setPendingOpRating({ ...base, operatorName: op.name });
        } else {
          sb.from('operators').select('name').eq('id', opId).single().then(r => {
            setPendingOpRating({ ...base, operatorName: r.data?.name || 'Operador' });
          });
        }
        // La promo llega en query aparte (promo_applications, misma tx que la
        // compra → ya commiteada). Enriquecer el modal si sigue abierto.
        fetchPurchasePromo(p.id).then(({ data: promo }) => {
          if (promo) setPendingOpRating(prev => (prev ? { ...prev, promo } : prev));
        });
      })
      .subscribe((status) => {
        console.log('[Realtime] purchases subscription:', status);
      });
    return () => sb.removeChannel(ch);
  }, [me?.id, sbConnected, operators, stations]);

  // ===== REALTIME: Actualizar rating del operador en tiempo real =====
  useEffect(() => {
    if (!sb || !loggedOp?.id || !sbConnected) return;
    const channel = sb.channel('op-ratings')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'operator_ratings',
        filter: `operator_id=eq.${loggedOp.id}`,
      }, (payload) => {
        const r = payload.new;
        console.log('[Realtime] New rating:', r.stars, 'stars');
        setOpRatings(prev => {
          const n = { ...prev };
          if (!n[r.operator_id]) n[r.operator_id] = [];
          n[r.operator_id] = [{ stars: r.stars }, ...n[r.operator_id]];
          return n;
        });
      })
      .subscribe();
    return () => sb.removeChannel(channel);
  }, [loggedOp?.id, sbConnected]);

  return { reloadMyRedemptions };
}
