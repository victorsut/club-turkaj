// src/constants/styles.js
// Shared style objects used across views

export const sMono = { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 };

// Input field styles
export const inputStyle = {
  fontFamily: "'DM Sans'", fontSize: 14, padding: '14px 16px',
  borderRadius: 14, border: '1.5px solid #E0E0E0', background: '#FAFAFA',
  outline: 'none', width: '100%', boxSizing: 'border-box',
  fontWeight: 600, color: '#0D0D0D',
};

export const inputStyleDark = {
  ...inputStyle,
  background: '#2A2A2A', border: '2px solid #3A3A3A', color: '#fff',
};

// Button base style
export const btnStyle = {
  fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
  padding: '16px 24px', borderRadius: 16, border: 'none',
  cursor: 'pointer', width: '100%', textAlign: 'center',
};

// Yellow primary button
export const btnYellow = {
  ...btnStyle, background: '#FBBC04', color: '#0D0D0D',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};

// Dark button
export const btnDark = {
  ...btnStyle, background: '#0D0D0D', color: '#fff',
};

// Admin theme constants
export const adminTheme = {
  bg: '#1E1E1E',
  card: '#2A2A2A',
  border: '#3A3A3A',
  txt: '#E0E0E0',
  sub: '#9E9E9E',
};

// Rojo heredado (D30) — SIN consumidores desde el 25-jul-2026 (el dueño
// pidió migrar también CTAs/chips/stats a naranja); se conserva solo por
// compatibilidad. El rojo semántico (errores, montos negativos) es bento.red.
export const BRAND_RED = '#E02020';

// Naranja del logo oficial — paleta de marca naranja/negro/blanco.
// ÚNICO acento de marca de la app (dueño, 25-jul-2026): íconos, palabra
// "Plus", login/registro y todos los CTAs/chips/stats.
export const BRAND_ORANGE = '#FA5408';

// Input flat sin borde visible (FORMATO GENERAL — login/registro).
// Borde transparente para poder pintar estados sin saltos de layout.
export const inputFlat = {
  ...inputStyle, background: '#F5F5F7', border: '1.5px solid transparent',
};

// R1b — Tokens del sistema bento (referencia FORMATO GENERAL: colores
// sólidos planos, sin degradados ni sombras — moderno y minimalista).
export const bento = {
  pageBg: '#F5F5F7',
  radius: 20,
  shadow: 'none',
  red:    '#D6281A',
  green:  '#1E7A33',
  blue:   '#1C4E9E',
  amber:  '#D9A40B',
  purple: '#7A35AE',
  // Paleta de "referencia colores inicio.png" (23-jul) — cada cuadro
  // del home y la ventana/modal que abre comparten el mismo color.
  teal:     '#2E7D80', // Historial de Canjes
  orange:   '#E07A2F', // Historial de Compras
  gold:     '#C9992B', // tarjeta de nivel ORO (dorado profundo de la referencia)
  bronze:   '#A07A20', // Vehículo
  indigo:   '#4A52A3', // WiFi (en ORO se ve atenuado por `dimmed`)
  cream:    '#F0E1A4', // Encuesta de Satisfacción (cuadro claro...)
  creamInk: '#8F6E1C', // ...con texto/iconos en dorado oscuro
};

// Paleta del bento del INICIO por nivel (23-jul): ORO usa la referencia
// cálida "colores inicio.png"; PLATINO tonos fríos inspirados en el
// plateado; BLACK versiones oscuras que ceden el protagonismo a la
// tarjeta galaxia del nivel. Cada ventana/modal hereda el color del
// cuadro que la abre.
export const homeColors = (tier) => {
  // BLACK: referencia "nivel black inicio.png" — monocromo con dorado
  // champán sobre la galaxia: cuadros NEGROS (Vehículo/Compras) con
  // título dorado y contenido blanco; cuadros GRIS PERLA (WiFi/
  // Encuesta/Ubicación/Canjes) con contenido negro. El fondo sigue
  // siendo la galaxia (más oscura y menos púrpura).
  if (tier === 'BLACK') return {
    vehicle: '#141417', vehicleTitle: '#D8A94E',
    wifi: '#E9E9EC', wifiInk: '#141417',
    survey: '#E9E9EC', surveyInk: '#141417',
    location: '#E9E9EC', locationInk: '#141417',
    redeems: '#E9E9EC', redeemsInk: '#141417',
    purchases: '#141417', purchasesTitle: '#D8A94E',
    purchasesAccent: '#D8A94E', purchasesAccentInk: '#141417',
  };
  if (tier === 'PLATINO') return {
    vehicle: '#71809B', wifi: '#4D5FAE', survey: '#D7DDE7', surveyInk: '#4E5E76',
    location: '#6A4FA8', redeems: '#2F7386', purchases: '#48708F',
  };
  return { // ORO — referencia cálida
    vehicle: bento.bronze, wifi: bento.indigo, survey: bento.cream, surveyInk: bento.creamInk,
    location: bento.purple, redeems: bento.teal, purchases: bento.orange,
  };
};

// Identidad visual por nivel — acento de iconos y banda de encabezado
// (modal de nivel del home, menú y tarjetas de beneficios). Central
// aquí para que también las vistas admin (Rules/MemberDetail) la usen.
export const tierAccent = (tier) =>
  tier === 'BLACK' ? '#FBBC04' : tier === 'PLATINO' ? '#6B767D' : bento.gold;

export const tierBand = (tier) =>
  tier === 'BLACK' ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)'
    : tier === 'PLATINO' ? '#9EA7AD' : bento.gold;

// Color sólido por categoría de premio (FORMATO GENERAL — flat, para
// el cuadro del ícono en catálogo y confirmación de canje)
export const CAT_COLORS = {
  combustible: bento.orange,
  servicio: bento.teal,
  merch: bento.red,
  cultural: bento.purple,
  shell: bento.amber,
  premium: '#1C1C1E',
  apple: '#5E5E63',
};

// Galaxy gradients for BLACK tier
export const GAL = 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)';
export const GAL3 = 'radial-gradient(ellipse at 30% 40%, #0a0a15 0%, #04040a 50%, #000 100%)';

// ── MODO CLARO / OSCURO (24-jul-2026) ──────────────────────
// El modo lo elige el usuario (sol/luna en el login y en el Menú) y se
// persiste en localStorage 'pp_mode'. Sin elección explícita, el modo
// EFECTIVO es el histórico de cada nivel: BLACK oscuro, ORO/PLATINO
// claro. La identidad del tier (tierBand, galaxia de la tarjeta,
// paleta homeColors) NO cambia con el modo — solo fondos y superficies.

// Fondo principal de la app cliente por nivel y modo. BLACK claro usa
// un claro casi blanco: los cuadros gris perla del tema BLACK (#E9E9EC)
// deben seguir leyéndose como tarjetas sobre el fondo.
export const clientMainBg = (tierName, dark) => {
  if (dark) return tierName === 'BLACK' ? '#040405' : '#0E0E10';
  return tierName === 'BLACK' ? '#F7F7F9' : tierName === 'PLATINO' ? '#E8E8E8' : '#fff';
};

// Superficies neutrales por modo (tarjetas, filas, textos) — la misma
// familia que usa el menú; para vistas que tematizan por su cuenta.
export const modeSurfaces = (dark) => dark ? {
  surface: 'rgba(255,255,255,.07)', inset: 'rgba(255,255,255,.06)',
  header: '#fff', text: '#E0E0E0', sub: 'rgba(255,255,255,.55)',
  divider: 'rgba(255,255,255,.08)',
} : {
  surface: '#fff', inset: '#F5F5F7',
  header: '#0D0D0D', text: '#424242', sub: '#9E9E9E',
  divider: '#F2F2F4',
};

// Client theme (dynamic based on tier + modo claro/oscuro). El segundo
// parámetro es opcional para compatibilidad: sin él, BLACK es oscuro.
export function clientTheme(tierName, dark = tierName === 'BLACK') {
  if (dark) return {
    pri: '#FBBC04', accent: tierName === 'PLATINO' ? '#64B5F6' : '#FFD54F',
    cardBg: 'rgba(255,255,255,.05)', cardBorder: '1px solid rgba(255,255,255,.08)',
    histBg: 'rgba(255,255,255,.03)',
    btnBg: tierName === 'BLACK' ? GAL : '#FBBC04',
    btnTxt: tierName === 'BLACK' ? '#FFD54F' : '#0D0D0D',
    mainBg: clientMainBg(tierName, true),
  };
  if (tierName === 'BLACK') return { // BLACK claro: perla + dorado
    pri: '#FBBC04', accent: '#B08A2E',
    cardBg: '#fff', cardBorder: '1px solid #E0E0E3',
    histBg: undefined,
    btnBg: '#0D0D0D', btnTxt: '#D8A94E',
    mainBg: clientMainBg('BLACK', false),
  };
  if (tierName === 'PLATINO') return {
    pri: '#1565C0', accent: '#1565C0',
    cardBg: 'rgba(255,255,255,.4)', cardBorder: '1px solid #BDBDBD',
    histBg: undefined,
    btnBg: '#1565C0', btnTxt: '#fff',
    mainBg: '#E8E8E8',
  };
  return {
    pri: '#FBBC04', accent: '#F0A500',
    cardBg: '#FAFAFA', cardBorder: '1px solid #eee',
    histBg: undefined,
    btnBg: '#FBBC04', btnTxt: '#0D0D0D',
    mainBg: '#fff',
  };
}

// Category styles for rewards
export const CAT_STYLES = {
  combustible: { bg: '#FFF3E0', c: '#E65100' },
  servicio: { bg: '#E8F5E9', c: '#2E7D32' },
  merch: { bg: '#E3F2FD', c: '#1565C0' },
  cultural: { bg: '#F3E5F5', c: '#7B1FA2' },
  shell: { bg: '#FFEBEE', c: '#C62828' },
  premium: { bg: '#FFF8E1', c: '#F57F17' },
  apple: { bg: '#F5F5F5', c: '#333' },
};

export const CAT_LABELS = {
  combustible: 'Combustible', servicio: 'Servicio', merch: 'Puntos Plus',
  cultural: 'Chichi', shell: 'Shell', premium: 'Premium', apple: 'Apple',
};
