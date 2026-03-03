// ============================================================
// Club Turkaj — useSupabaseData Hook
// ============================================================
// Carga todos los datos iniciales desde Supabase en paralelo.
// Reemplaza el bloque `loadFromSupabase()` del monolito.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  fetchMembers,
  fetchRewards,
  fetchPromotions,
  fetchStations,
  fetchConfig,
  fetchRaffleCalendar,
  fetchActivityLog,
  fetchOperators,
} from '../services/dataService';
import { DEFAULT_CONFIG, MONTH_NAMES_CAP } from '../constants/config';

/**
 * Mapea un miembro de Supabase al formato de la app.
 */
export function mapMember(m) {
  return {
    id: m.id,
    name: m.name,
    email: m.email || '',
    phone: m.phone || '',
    dpi: m.dpi || '',
    plate: m.plate || '',
    nit: m.nit || '',
    bday: m.birthday || '',
    points: m.points || 0,
    gallons: parseFloat(m.gallons) || 0,
    spent: parseFloat(m.spent) || 0,
    visits: m.visits || 0,
    tickets: m.tickets || 0,
    redeemed: m.redeemed_count || 0,
    referrals: m.referral_count || 0,
    registered: m.created_at ? m.created_at.split('T')[0] : '',
    lastBuy: m.last_buy ? m.last_buy.split('T')[0] : '',
    station: m.last_station || '',
    cardId: m.physical_cards?.[0]?.card_code || m.card_id || '',
    supabaseUser: true,
    authProvider: m.auth_provider || 'phone',
    authProviderId: m.auth_provider_id || '',
    referredBy: m.referred_by || null,
  };
}

/**
 * Mapea un premio de Supabase al formato de la app.
 */
function mapReward(r) {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    pts: r.points_cost,
    cat: r.category,
    tier: r.tier_exclusive || undefined,
  };
}

/**
 * Mapea una promoción de Supabase al formato de la app.
 */
function mapPromotion(p) {
  return {
    id: p.id,
    title: p.title,
    desc: p.description,
    icon: p.icon,
    bg: p.bg_gradient,
    color: p.text_color,
    active: p.active,
  };
}

/**
 * Mapea un registro de rifa al formato de la app.
 */
function mapRaffle(r) {
  return {
    m: MONTH_NAMES_CAP[r.month - 1],
    p: `${r.prize_icon} ${r.prize_name}`,
    v: `Q${r.prize_value}`,
    cost: r.prize_value,
    dbId: r.id,
  };
}

/**
 * Construye mapa de actividades agrupadas por member_id.
 */
function buildActivityMap(activities) {
  const map = {};
  activities.forEach((a) => {
    if (!map[a.member_id]) map[a.member_id] = [];
    map[a.member_id].push({
      type: a.activity_type,
      desc: a.description,
      pts: a.points_change,
      amount: a.amount ? parseFloat(a.amount) : null,
      date: a.created_at ? a.created_at.split('T')[0] : '',
      station: a.station_id || '',
    });
  });
  return map;
}

/**
 * Parsea la configuración de Supabase al formato de la app.
 */
function parseConfig(cfgMap) {
  if (!cfgMap.general || !cfgMap.tiers) return DEFAULT_CONFIG;
  const gen = cfgMap.general;
  const trs = cfgMap.tiers;
  const deg = cfgMap.degradation || [];
  const tu = cfgMap.terms_use || [];
  const tc = cfgMap.terms_canje || [];
  return {
    qPerPt: gen.qPerPt || 10,
    ticketPts: gen.ticketPts || 5,
    regBase: gen.regBase || 15,
    regOptional: gen.regOptional || 2,
    referralPts: gen.referralPts || 25,
    surveyPts: gen.surveyPts || 3,
    surveyDaily: gen.surveyDaily || 5,
    tiers: trs,
    degrad: deg,
    termsUse: tu,
    termsCanje: tc,
  };
}

/**
 * Hook principal: carga todos los datos de Supabase al montar.
 *
 * @returns {{
 *   members, operators, rewards, promotions, stations,
 *   config, raffleCal, activityLog,
 *   isConnected, isLoading, error
 * }}
 */
export function useSupabaseData() {
  const [members, setMembers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [stations, setStations] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [raffleCal, setRaffleCal] = useState([]);
  const [activityLog, setActivityLog] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      try {
        // Cargar todo en paralelo
        const [rwRaw, prRaw, stRaw, cfgMap, rcRaw, memRaw, actRaw, opRaw] =
          await Promise.all([
            fetchRewards(),
            fetchPromotions(),
            fetchStations(),
            fetchConfig(),
            fetchRaffleCalendar(),
            fetchMembers(),
            fetchActivityLog(),
            fetchOperators(),
          ]);

        if (!mountedRef.current) return;

        setRewards(rwRaw.map(mapReward));
        setPromotions(prRaw.map(mapPromotion));
        setStations(stRaw);
        setConfig(parseConfig(cfgMap));
        setRaffleCal(rcRaw.map(mapRaffle));
        setMembers(memRaw.map(mapMember));
        setActivityLog(buildActivityMap(actRaw));
        setOperators(opRaw);
        setIsConnected(true);

        console.log(
          `[Club Turkaj] ✅ ${memRaw.length} miembros, ` +
          `${rwRaw.length} premios, ${actRaw.length} actividades cargadas`
        );
      } catch (err) {
        console.error('[Club Turkaj] ⚠️ Error cargando datos:', err);
        if (mountedRef.current) setError(err);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }

    load();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    // Estado
    members,
    setMembers,
    operators,
    setOperators,
    rewards,
    setRewards,
    promotions,
    setPromotions,
    stations,
    config,
    setConfig,
    raffleCal,
    setRaffleCal,
    activityLog,
    setActivityLog,
    // Conexión
    isConnected,
    isLoading,
    error,
  };
}
