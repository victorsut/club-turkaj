// ============================================================
// Puntos Plus — mapMember
// ============================================================
// Mapea un miembro de Supabase (fila de tabla o perfil de RPC) al
// formato de la app. Extraído de useSupabaseData.js (bloque 3,
// 12-ago-2026): el hook murió con la migración a loadFromSupabase
// (App.jsx) y este mapeo era lo único vivo del archivo.
// ============================================================

import { utcToLocal } from './dates';

export function mapMember(m) {
  return {
    id: m.id,
    name: m.name,
    nickname: m.nickname || '',
    email: m.email || '',
    avatar: m.avatar_url || '',
    phone: m.phone || '',
    dpi: m.dpi || '',
    plate: m.plate || '',
    nit: m.nit || '',
    nitChangedAt: m.nit_changed_at || null, // candado 8-ago: cambio cada 60 días
    termsAcceptedAt: m.terms_accepted_at || null, // constancia 11-ago (null = registro previo a la casilla)
    bday: m.birthday || '',
    address: m.address || null,
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
    // card_code viene plano en los perfiles de RPC (SEC.C.1); el join
    // physical_cards solo existe en las lecturas de op/admin.
    cardId: m.card_code || m.physical_cards?.[0]?.card_code || m.card_id || '',
    vehicles: (() => {
      const v = m.vehicles;
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'object') return Object.values(v);
      try { return JSON.parse(v); } catch { return []; }
    })(),
    supabaseUser: true,
    authProvider: m.auth_provider || 'phone',
    authProviderId: m.auth_provider_id || '',
    referredBy: m.referred_by || null,
  };
}

// Ficha completa (list_members_full / get_member_full) → fila de custs.
// Fuente única del shape: la usan la carga masiva del login de staff y
// addMemberToCusts (alta en vivo de miembros recién registrados).
// Extraída de App.jsx en la división etapa 3 (12-ago-2026).
export function mapFullMember(m) {
  return {
    id: m.id, name: m.name, nickname: m.nickname || '', email: m.email || '', avatar: m.avatar_url || '',
    phone: m.phone || '', dpi: m.dpi || '', plate: m.plate || '',
    vehicles: (() => { const v = m.vehicles; if (!v) return []; if (Array.isArray(v)) return v; if (typeof v === 'object') return Object.values(v); try { return JSON.parse(v); } catch { return []; } })(),
    nit: m.nit || '', bday: m.birthday || '',
    address: m.address || null,
    points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
    spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
    tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
    referrals: m.referral_count || 0,
    registered: utcToLocal(m.created_at) || '',
    lastBuy: utcToLocal(m.last_buy) || '',
    station: m.last_station || '',
    cardId: m.card_code || m.card_id || '',
    termsAcceptedAt: m.terms_accepted_at || null, // constancia 11-ago (member_profile_json lo expone)
    supabaseUser: true, authProvider: m.auth_provider || 'google',
    authProviderId: m.auth_provider_id || '',
  };
}
