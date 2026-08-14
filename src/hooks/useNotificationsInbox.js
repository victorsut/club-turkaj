// src/hooks/useNotificationsInbox.js
// Inbox de la campana (carga + realtime + marcar leídas) y la
// navegación disparada por notificaciones: mensajes del Service Worker
// (clic en push de compra/premio) y deep-links por URL (?rate= /
// ?goto=pendientes). Extraído de App.jsx en la división etapa 3
// (12-ago-2026) SIN cambios de lógica. Posee el estado myNotifs.
import { useState, useEffect, useRef, useCallback } from 'react';
import { sb } from '../lib/supabaseClient';
import { fetchNotifications, markNotificationsRead, clearNotifications, fetchPurchasePromo } from '../services';

export default function useNotificationsInbox({
  me, authScreen, sbConnected, viewRef,
  setCScr, setPendingOpRating, setCatPendingSignal,
}) {
  // Inbox de la campana del inicio: notificaciones del miembro logueado.
  const [myNotifs, setMyNotifs] = useState([]);

  // ===== NOTIFICACIONES: inbox de la campana (carga + realtime) =====
  useEffect(() => {
    if (!me?.id || authScreen !== 'logged' || viewRef.current !== 'client') {
      setMyNotifs([]);
      return;
    }
    fetchNotifications(me.id).then(setMyNotifs);
    // Al volver la app al frente, refrescar: el canal Realtime se
    // suspende en segundo plano y los registros que el SW hizo mientras
    // tanto (push de compra/premio mostrado) no llegarían al badge.
    const mid = me.id;
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(mid).then(setMyNotifs);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    if (!sb || !sbConnected) {
      return () => document.removeEventListener('visibilitychange', onVis);
    }
    const ch = sb.channel(`notifications-${me.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `member_id=eq.${me.id}`,
      }, (payload) => {
        setMyNotifs(p => p.some(n => n.id === payload.new.id) ? p : [payload.new, ...p]);
      })
      .subscribe();
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      sb.removeChannel(ch);
    };
  }, [me?.id, authScreen, sbConnected]);

  // Marca todas como leídas (al abrir el inbox); el badge se apaga al
  // instante y el servidor estampa read_at en segundo plano.
  const markNotifsRead = useCallback(() => {
    if (!me?.id) return;
    const now = new Date().toISOString();
    setMyNotifs(p => p.map(n => n.read_at ? n : { ...n, read_at: now }));
    markNotificationsRead(me.id);
  }, [me?.id]);

  // Limpia notificaciones (14-ago): con id quita ESA, sin id TODAS.
  // Optimista — desaparecen al instante; el servidor estampa cleared_at
  // (soft delete: la fila sobrevive como log/dedupe del motor de push).
  const clearNotifs = useCallback((id = null) => {
    if (!me?.id) return;
    setMyNotifs(p => (id ? p.filter(n => n.id !== id) : []));
    clearNotifications(id);
  }, [me?.id]);

  // ===== SERVICE WORKER: Listen for notification clicks =====
  // Ref con el miembro logueado: el listener del SW es estable ([] deps)
  // y necesita el valor VIGENTE para responder WHO_IS.
  const meIdRef = useRef(null);
  useEffect(() => { meIdRef.current = me?.id || null; }, [me?.id]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event) => {
      // El SW pregunta quién está a la vista antes de suprimir una
      // notificación de compra/premio: responder miembro + vista por el
      // puerto del MessageChannel (una pestaña de operador responde
      // view 'op' y NO suprime — bug del 28-jul).
      if (event.data?.type === 'WHO_IS' && event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          memberId: meIdRef.current,
          view: viewRef.current,
        });
        return;
      }
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const d = event.data.data || {};
        if (d.type === 'purchase' && d.operatorId) {
          // El modal vive en ClientHome: volver al inicio si la app
          // quedó en otra pestaña (Rifa, Menú...) al tocar el aviso.
          setCScr('home');
          setPendingOpRating({
            purchaseId: d.purchaseId || null,
            operatorId: d.operatorId,
            operatorName: d.operatorName || 'Operador',
            stationName: d.stationName || '',
            points: d.points ?? null,
            amount: d.amount ?? null,
          });
          if (d.purchaseId) {
            fetchPurchasePromo(d.purchaseId).then(({ data: promo }) => {
              if (promo) setPendingOpRating(prev => (prev ? { ...prev, promo } : prev));
            });
          }
        }
        // Premio de promoción: llevar a Canjes con los pendientes abiertos.
        if (d.type === 'reward') {
          setCScr('cat');
          setCatPendingSignal(s => s + 1);
        }
        // Otros tipos (degradacion, general): basta traer la app al frente.
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  // Check URL params for rating from notification (app opens fresh)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rateOpId = params.get('rate');
    if (rateOpId && me?.id) {
      const purchaseId = params.get('purchaseId') || null;
      setCScr('home'); // el modal vive en ClientHome
      setPendingOpRating({
        purchaseId,
        operatorId: rateOpId,
        operatorName: decodeURIComponent(params.get('opName') || 'Operador'),
        stationName: decodeURIComponent(params.get('station') || ''),
        points: params.get('pts') != null ? Number(params.get('pts')) : null,
        amount: params.get('amount') != null ? Number(params.get('amount')) : null,
      });
      if (purchaseId) {
        fetchPurchasePromo(purchaseId).then(({ data: promo }) => {
          if (promo) setPendingOpRating(prev => (prev ? { ...prev, promo } : prev));
        });
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Deep-link de notificación de premio (app cerrada): Canjes pendientes.
    if (params.get('goto') === 'pendientes' && me?.id) {
      setCScr('cat');
      setCatPendingSignal(s => s + 1);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [me?.id]);

  return { myNotifs, markNotifsRead, clearNotifs };
}
