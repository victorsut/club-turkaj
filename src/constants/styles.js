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

// Rojo heredado (D30) — sigue vivo en CTAs/chips/stats mientras el dueño
// no pida migrarlos; los ÍCONOS y el wordmark ya son naranja (23-jul).
export const BRAND_RED = '#E02020';

// Naranja del logo oficial — paleta de marca naranja/negro/blanco.
// Acento de íconos (nav activa, spinner, QR) y de la palabra "Plus"
// (decisión del dueño 23-jul-2026), además de login/registro.
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
  // BLACK: tema GALAXIA — colores luminosos (nebulosa, aurora, luz
  // estelar) que contrastan con el fondo oscuro; la tarjeta galaxia
  // sigue siendo el ancla de identidad del nivel.
  if (tier === 'BLACK') return {
    vehicle: '#B98E2E', wifi: '#6C77D9', survey: '#EFDFA0', surveyInk: '#7A621A',
    location: '#9B59D0', redeems: '#3FA7AC', purchases: '#DE8433',
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

// Client theme (dynamic based on tier)
export function clientTheme(tierName) {
  if (tierName === 'BLACK') return {
    pri: '#FBBC04', accent: '#FFD54F',
    cardBg: 'rgba(255,255,255,.05)', cardBorder: '1px solid rgba(255,255,255,.08)',
    histBg: 'rgba(255,255,255,.03)',
    btnBg: GAL, btnTxt: '#FFD54F',
    mainBg: '#06060C',
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
