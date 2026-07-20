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

// Rojo de marca Puntos Plus (D30 — wordmark de la referencia visual).
export const BRAND_RED = '#E02020'; // acento de marca en textos/chips (el naranja #FA5408 vive solo en el logo)

// R1b — Tokens del sistema bento (derivados de la referencia visual y
// consolidando la paleta que ya existía en los gradientes de AdminPromos).
export const bento = {
  pageBg: '#F5F5F7',
  radius: 20,
  shadow: '0 4px 10px rgba(0,0,0,.10)',
  // Degradados por tile (feedback del dueño: la referencia no usa
  // colores sólidos — cada cuadro lleva un patrón degradado sutil).
  red:    'linear-gradient(145deg,#EF5350 0%,#C62828 100%)',
  green:  'linear-gradient(145deg,#43A047 0%,#1B5E20 100%)',
  blue:   'linear-gradient(145deg,#1E88E5 0%,#0D47A1 100%)',
  amber:  'linear-gradient(145deg,#F2B33D 0%,#D98E04 100%)',
  purple: 'linear-gradient(145deg,#8E24AA 0%,#4A148C 100%)',
  teal:   'linear-gradient(145deg,#00ACC1 0%,#00695C 100%)',
  orange: 'linear-gradient(145deg,#FB8C00 0%,#D84315 100%)',
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
