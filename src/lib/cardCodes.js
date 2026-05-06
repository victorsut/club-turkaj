// ============================================================
// Club Turkaj — Helper de códigos de tarjeta digital
// ============================================================
// Fuente única de la regex /^CT[OPB]D-\d{5}$/.
// Formato: CT{O|P|B}D-NNNNN
//   CTOD → ORO · CTPD → PLATINO · CTBD → BLACK
//
// Los prefijos viven en src/constants/config.js (CARD_PREFIX) —
// acá los importamos para no duplicar literales.
// ============================================================

import { CARD_PREFIX } from '../constants/config';

const CARD_CODE_REGEX = /^CT[OPB]D-\d{5}$/;

// Mapa inverso prefijo → tier, derivado de CARD_PREFIX.
const PREFIX_TO_TIER = Object.fromEntries(
  Object.entries(CARD_PREFIX).map(([tier, prefix]) => [prefix, tier])
);

function normalize(code) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

export function tierFromPrefix(prefix) {
  return PREFIX_TO_TIER[prefix] || null;
}

export function isValidCardCode(code) {
  return CARD_CODE_REGEX.test(normalize(code));
}

export function parseCardCode(code) {
  const normalized = normalize(code);
  if (!CARD_CODE_REGEX.test(normalized)) {
    return { valid: false, prefix: null, correlative: null, tier: null, normalized: null };
  }
  const [prefix, correlative] = normalized.split('-');
  return {
    valid: true,
    prefix,
    correlative,
    tier: tierFromPrefix(prefix),
    normalized,
  };
}
