// ============================================================
// Puntos Plus — Tier System (Utilidades de Nivel)
// ============================================================
// Lógica pura de cálculo de niveles. Sin dependencia de React.
// ============================================================

import { DEFAULT_CONFIG, GALAXY_BG } from '../constants/config';

// Meta de la barra de progreso al llegar a BLACK (23-jul-2026; ajustada
// a 1000 el 25-jul-2026 por el dueño): sin nivel siguiente, la barra
// sigue siendo un atractivo avanzando de 500 hacia la meta. Al
// superarla, la barra queda llena.
const BLACK_GOAL_GAL = 1000;

/**
 * Calcula el objeto de nivel completo a partir de galones y config.
 * @param {number} gal - Galones acumulados
 * @param {object} [cfg] - Configuración del programa (opcional)
 * @returns {object} Tier object con nombre, colores, descuentos, etc.
 */
export function makeTier(gal, cfg = DEFAULT_CONFIG) {
  const pt = cfg.tiers.platino;
  const bk = cfg.tiers.black;
  const or = cfg.tiers.oro;

  if (gal >= bk.gal) {
    return {
      name: 'BLACK',
      color: '#FFF',
      bg: '#000',
      discount: bk.discGal ?? 0,
      redeemDisc: bk.discRedeem,
      wifi: 'Ilimitado',
      bath: true,
      evtPts: bk.evtPts,
      next: null,
      rem: 0,
      icon: '🖤',
      grad: GALAXY_BG,
      base: bk.gal,
      target: BLACK_GOAL_GAL,
    };
  }

  if (gal >= pt.gal) {
    return {
      name: 'PLATINO',
      color: '#1A1A1A',
      bg: '#E0E0E0',
      discount: pt.discGal ?? 0,
      redeemDisc: pt.discRedeem,
      wifi: 'Ilimitado',
      bath: true,
      evtPts: pt.evtPts,
      next: 'BLACK',
      rem: +(bk.gal - gal).toFixed(1),
      icon: '💎',
      grad: 'linear-gradient(135deg,#E0E0E0 0%,#BDBDBD 50%,#E0E0E0 100%)',
      base: pt.gal,
      target: bk.gal,
    };
  }

  return {
    name: 'ORO',
    color: '#000',
    bg: '#FBBC04',
    discount: 0,
    redeemDisc: 0,
    wifi: 'Ilimitado',
    bath: false,
    evtPts: or.evtPts,
    next: 'PLATINO',
    rem: +(pt.gal - gal).toFixed(1),
    icon: '🟡',
    grad: 'linear-gradient(135deg,#FBBC04 0%,#FFD540 50%,#FBBC04 100%)',
    base: 0,
    target: pt.gal,
  };
}

/**
 * Progreso porcentual hacia el siguiente nivel
 */
export function tierProgress(gal, tier) {
  // Sin nivel siguiente pero con meta (BLACK → BLACK_GOAL_GAL): la
  // barra sigue avanzando; sin meta, llena.
  if (!tier.next && tier.target <= tier.base) return 100;
  return Math.min(((gal - tier.base) / (tier.target - tier.base)) * 100, 100);
}

/**
 * Días de inactividad desde la última compra
 */
export function daysInactive(lastBuyDate) {
  if (!lastBuyDate) return 0;
  return Math.floor((Date.now() - new Date(lastBuyDate).getTime()) / 86400000);
}

/**
 * Estilos visuales por nivel
 */
export function tierShadow(tierName) {
  switch (tierName) {
    case 'BLACK':
      return '0 16px 56px rgba(0,0,0,.7), 0 0 25px rgba(255,255,255,.05), 0 0 8px rgba(255,255,255,.03)';
    case 'PLATINO':
      return '0 6px 24px rgba(21,101,192,.25), 0 2px 8px rgba(21,101,192,.15), inset 0 1px 0 rgba(255,255,255,.4)';
    default:
      return '0 8px 32px rgba(251,188,4,.2)';
  }
}

export function tierBorder(tierName) {
  switch (tierName) {
    case 'PLATINO': return '2px solid #1565C0';
    default: return 'none';
  }
}

export function tierBackground(tierName) {
  switch (tierName) {
    case 'BLACK':
      return GALAXY_BG;
    case 'PLATINO':
      return 'linear-gradient(135deg,#9E9E9E,#BDBDBD,#CFD8DC,#BDBDBD)';
    default:
      return null;
  }
}

/**
 * Colores temáticos por nivel (para uso en vistas)
 */
export function tierTheme(tierName) {
  switch (tierName) {
    case 'BLACK':
      return {
        text: '#fff',
        subtext: '#aaa',
        cardBg: 'rgba(255,255,255,.04)',
        border: 'rgba(255,255,255,.08)',
        accent: '#FBBC04',
        sectionHeader: { color: '#aaa' },
        pageBg: '#06060C',
      };
    case 'PLATINO':
      return {
        text: '#424242',
        subtext: '#757575',
        cardBg: '#D6D6D6',
        border: '#BDBDBD',
        accent: '#1565C0',
        sectionHeader: { color: '#757575' },
        pageBg: '#E8E8E8',
      };
    default: // ORO
      return {
        text: '#0D0D0D',
        subtext: '#757575',
        cardBg: '#fff',
        border: '#eee',
        accent: '#FBBC04',
        sectionHeader: { color: '#9E9E9E' },
        pageBg: '#fff',
      };
  }
}
