// src/hooks/useStaffData.js
// Datos que llegan con SESIÓN de operador/admin (y los participantes de
// rifa, que aceptan cualquier sesión): fichas completas de miembros y
// operadores, mapa global de actividad, estación por miembro y el canal
// realtime de custs para el staff. Extraído de App.jsx en la división
// etapa 3 (12-ago-2026) SIN cambios de lógica.
// Devuelve addMemberToCusts (ctx) y los refs anti-carrera que el boot
// (services/bootLoader) usa para no pisar las fichas completas.
import { useEffect, useRef, useCallback } from 'react';
import { sb } from '../lib/supabaseClient';
import { getOperatorToken, getAdminToken } from '../services/sessionTokens';
import { fetchMembersFull, fetchMemberFull, fetchActivityStaff, fetchOperatorsFull, fetchMemberStations, fetchRaffleParticipants } from '../services';
import { mapFullMember } from '../lib/mapMember';
import { utcToLocal } from '../lib/dates';

export default function useStaffData({
  authOp, authAdmin, authScreen, meId, sbConnected, raffleCal,
  setCusts, setOperators, setActivityLog, setMemberStations, setRafData,
}) {
  // ===== FICHA COMPLETA AL ENTRAR COMO OPERADOR/ADMIN (SEC.C.1) =====
  // El boot solo carga columnas no sensibles; al loguearse un operador
  // o admin, su sesión autoriza list_members_full y custs se reemplaza
  // por los perfiles completos (búsqueda por teléfono/DPI, ficha, etc.).
  const custsFullRef = useRef(false);
  // SEC.C.2b: última carga de members del boot (columnas abiertas) —
  // respaldo si el fetch de fichas completas falla tras ganarle al boot.
  const bootCustsRef = useRef(null);
  // FIX (11-ago): misma guarda anti-carrera para operadores. El efecto
  // de staff (fetchOperatorsFull) puede ganarle al boot cuando hay
  // sesión de admin cacheada; sin esta bandera el boot (columnas
  // mínimas: sin DPI/gafete/teléfono) pisaba la ficha completa y
  // OpManagement mostraba tarjetas incompletas y bloqueaba la edición.
  const opsFullRef = useRef(false);
  useEffect(() => {
    if (authOp !== 'logged' && authAdmin !== 'logged') { custsFullRef.current = false; return; }
    if (custsFullRef.current || !sb) return;
    const role = authAdmin === 'logged' ? 'admin' : 'operator';
    const tok = role === 'admin' ? getAdminToken() : getOperatorToken();
    if (!tok?.token) return;
    custsFullRef.current = true;
    fetchMembersFull(tok.token, role).then(rows => {
      if (rows.length > 0) {
        setCusts(rows.map(mapFullMember));
        console.log('[Puntos Plus] ✅ Fichas completas cargadas:', rows.length);
      } else {
        custsFullRef.current = false; // token vencido u error: reintentar
        // SEC.C.2b: si el boot le cedió el paso a este fetch y falló,
        // restaurar al menos las columnas abiertas.
        if (bootCustsRef.current) setCusts(p => (p.length ? p : bootCustsRef.current));
      }
    });
  }, [authOp, authAdmin]);

  // Miembro RECIÉN registrado → traer su ficha completa y sumarla a
  // custs sin recargar (reporte del dueño 31-jul: el escaneo del QR de
  // un cliente nuevo fallaba hasta recargar la app del operador). La
  // usan el evento INSERT del canal realtime y el fallback del escaneo
  // (auto-reparación si el realtime no propagó). Devuelve la fila
  // mapeada o null.
  const addMemberToCusts = useCallback(async (memberId) => {
    if (authOp !== 'logged' && authAdmin !== 'logged') return null;
    const role = authAdmin === 'logged' ? 'admin' : 'operator';
    const tok = role === 'admin' ? getAdminToken() : getOperatorToken();
    if (!tok?.token || !memberId) return null;
    const m = await fetchMemberFull(tok.token, role, memberId);
    if (!m?.id) return null;
    const row = mapFullMember(m);
    setCusts(p => {
      const i = p.findIndex(c => c.id === row.id);
      if (i < 0) return [...p, row];
      const next = [...p];
      next[i] = { ...next[i], ...row };
      return next;
    });
    return row;
  }, [authOp, authAdmin]);

  // ===== SEC.C.2: ACTIVIDAD GLOBAL PARA STAFF =====
  // El boot ya no puede leer activity_log: el mapa global (filtro por
  // estación en Miembros, actividad de las fichas) se carga por RPC al
  // entrar como operador/admin. Merge sobre lo previo: el libro mayor
  // completo del miembro logueado en este navegador no se pisa.
  const actMapStaffRef = useRef(false);
  useEffect(() => {
    if (authOp !== 'logged' && authAdmin !== 'logged') { actMapStaffRef.current = false; opsFullRef.current = false; return; }
    if (actMapStaffRef.current || !sb) return;
    actMapStaffRef.current = true;
    fetchActivityStaff(null, 300).then(rows => {
      if (!rows.length) { actMapStaffRef.current = false; return; }
      const actMap = {};
      rows.forEach(a => {
        if (!actMap[a.member_id]) actMap[a.member_id] = [];
        actMap[a.member_id].push({
          type: a.activity_type, desc: a.description,
          pts: a.points_change, amount: a.amount ? parseFloat(a.amount) : null,
          date: utcToLocal(a.created_at) || '', station: a.station_id || '',
        });
      });
      setActivityLog(prev => ({ ...actMap, ...prev }));
    });
    // Ficha completa de operadores (objetivo #1): DPI/gafete/teléfono/
    // correo ya no viajan por la API abierta — el admin los carga con
    // su sesión para la pestaña Operadores.
    fetchOperatorsFull().then(rows => {
      if (!rows.length) return;
      opsFullRef.current = true; // gana la carrera: el boot ya no pisa
      setOperators(rows.map(o => ({
        id: o.id, name: o.name, user: o.username,
        dpi: o.dpi || '', gafete: o.gafete || '',
        phone: o.phone || '', email: o.email || '',
        station: o.station_name || '', stationId: o.station_id || null,
        bomba: o.bomba || '', turno: o.turno || '',
        active: o.active !== false,
        // Espejo de PROPER (F7a): no puede loguearse; su estación es la
        // última donde despachó según la factura.
        external: o.external_source || null,
      })));
    });
    // Estación por miembro para el filtro de Miembros (SEC.C.2b):
    // derivada de purchases (el activity_log guarda station_id como
    // uuid y la vista comparaba nombres — nunca coincidía).
    fetchMemberStations().then(rows => {
      if (!rows.length) return;
      const map = {};
      rows.forEach(r => { map[r.member_id] = { last: r.last_station, top: r.top_station }; });
      setMemberStations(map);
    });
  }, [authOp, authAdmin]);

  // ===== SEC.C.2: PARTICIPANTES DE RIFA CON SESIÓN =====
  // raffle_tickets ya no tiene SELECT abierto: los boletos agregados
  // llegan por RPC con la sesión activa (miembro, operador o admin) y
  // el nombre viene resuelto server-side. Las compras de boletos siguen
  // actualizando rafData de forma optimista; este efecto trae la verdad
  // del servidor al abrir la app o cambiar de sesión.
  useEffect(() => {
    if (!sb || !sbConnected || raffleCal.length === 0) return;
    const memberLogged = authScreen === 'logged' && meId && !String(meId).startsWith('temp-');
    if (!memberLogged && authOp !== 'logged' && authAdmin !== 'logged') return;
    fetchRaffleParticipants().then(rows => {
      if (!rows) return; // sin token o error: conservar lo que haya
      const idToMonth = {};
      raffleCal.forEach((r, i) => { if (r?.dbId) idToMonth[r.dbId] = i; });
      const rafMap = Array(12).fill(null).map(() => ({ participants: [] }));
      rows.forEach(e => {
        const month = idToMonth[e.raffle_id];
        if (month === undefined) return;
        // display_name = apodo o primer nombre (1-ago: la rifa ya no
        // muestra nombres reales); avatar para la lista de participantes
        rafMap[month].participants.push({ cid: e.member_id, name: e.display_name || e.name || 'Miembro', avatar: e.avatar_url || '', tickets: e.tickets || 1 });
      });
      setRafData(rafMap);
      console.log('[Raffle] ✅ rafData listo:', rows.length, 'participantes');
    });
  }, [sbConnected, raffleCal, authScreen, meId, authOp, authAdmin]);

  // ===== REALTIME PARA ADMIN/OPERADOR: puntos en vivo en custs (28-jul) =====
  // El canal member-updates solo cubre al miembro logueado (vista
  // cliente). Pedido del dueño: el admin también debe ver los puntos
  // moverse en vivo. Sin filtro: cualquier UPDATE de members refresca
  // la fila en custs (el payload solo trae las columnas no sensibles —
  // los grants de columna de SEC.C.1 aplican también a Realtime).
  useEffect(() => {
    if ((authOp !== 'logged' && authAdmin !== 'logged') || !sb || !sbConnected) return;
    const ch = sb.channel('members-staff')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'members' }, (payload) => {
        const m = payload.new || {};
        if (!m.id) return;
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
      })
      // Registro NUEVO: el payload trae solo columnas abiertas (sin el
      // código CT de la tarjeta) → la ficha completa se pide por RPC.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members' }, (payload) => {
        const id = payload.new?.id;
        if (id) addMemberToCusts(id);
      })
      .subscribe();
    return () => sb.removeChannel(ch);
  }, [authOp, authAdmin, sbConnected, addMemberToCusts]);

  return { addMemberToCusts, custsFullRef, bootCustsRef, opsFullRef };
}
