// ============================================================
// Club Turkaj — Constantes y Configuración de Negocio
// ============================================================
// Reglas de negocio INAMOVIBLES y valores por defecto.
// Los valores editables vienen de Supabase (program_config).
// ============================================================

// ──────────────────────────────────────────────
// Precios de combustible (Q/galón)
// ──────────────────────────────────────────────
export const FUEL_PRICES = {
  super: 31.49,
  regular: 30.99,
  diesel: 28.99,
};

export const FUEL_LABELS = {
  super: 'Súper',
  regular: 'Regular',
  diesel: 'Diésel',
};

// ──────────────────────────────────────────────
// Configuración por defecto del programa
// (se sobreescribe con datos de Supabase)
// ──────────────────────────────────────────────
export const DEFAULT_CONFIG = {
  qPerPt: 10,       // Q10 = 1 punto
  ticketPts: 5,     // 5 pts = 1 boleto de rifa
  regBase: 15,      // Puntos de registro base
  regOptional: 2,   // Puntos por dato opcional
  referralPts: 25,  // Puntos por referido
  surveyPts: 3,     // Puntos por encuesta
  surveyDaily: 5,   // Límite diario de encuestas
  tiers: {
    oro: { evtPts: 50 },
    platino: { gal: 150, discGal: 0.15, discRedeem: 0.10, evtPts: 60 },
    black: { gal: 500, discGal: 0.25, discRedeem: 0.15, evtPts: 70 },
  },
  degrad: [
    {
      tier: 'BLACK',
      rules: [
        { days: 15, effect: 'Baja a PLATINO' },
        { days: 30, effect: 'Baja a ORO' },
        { days: 45, effect: 'Pierde TODOS los puntos' },
      ],
    },
    {
      tier: 'PLATINO',
      rules: [
        { days: 15, effect: 'Baja a ORO' },
        { days: 45, effect: 'Pierde TODOS los puntos' },
      ],
    },
    {
      tier: 'ORO',
      rules: [
        { days: 45, effect: 'Pierde TODOS los puntos' },
      ],
    },
  ],
  termsUse: [],
  termsCanje: [],
};

// ──────────────────────────────────────────────
// Categorías de premios (colores y labels)
// ──────────────────────────────────────────────
export const REWARD_CATEGORIES = {
  combustible: { bg: '#FFF3E0', color: '#E65100', label: 'Combustible' },
  servicio:    { bg: '#E8F5E9', color: '#2E7D32', label: 'Servicio' },
  merch:       { bg: '#E3F2FD', color: '#1565C0', label: 'Club Turkaj' },
  cultural:    { bg: '#F3E5F5', color: '#7B1FA2', label: 'Chichi' },
  shell:       { bg: '#FFEBEE', color: '#C62828', label: 'Shell' },
  premium:     { bg: '#FFF8E1', color: '#F57F17', label: 'Premium' },
  apple:       { bg: '#F5F5F5', color: '#333',    label: 'Apple' },
};

// ──────────────────────────────────────────────
// Eventos especiales
// ──────────────────────────────────────────────
export const SPECIAL_EVENTS = [
  { name: '🎂 Cumpleaños', desc: 'ORO 50 · PLATINO 60 · BLACK 70 pts' },
  { name: '🎄 Navidad', desc: 'ORO 50 · PLATINO 60 · BLACK 70 pts' },
  { name: '💝 Día del Cariño', desc: 'ORO 50 · PLATINO 60 · BLACK 70 pts' },
  { name: '🎉 Aniversario Turkaj', desc: '14 de mayo · ORO 50 · PLATINO 60 · BLACK 70 pts' },
];

// ──────────────────────────────────────────────
// Nombres de meses
// ──────────────────────────────────────────────
export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const MONTH_NAMES_CAP = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ──────────────────────────────────────────────
// Estilo monospace (JetBrains Mono)
// ──────────────────────────────────────────────
export const MONO_STYLE = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
};

// ──────────────────────────────────────────────
// Fondos de galaxia (para tema BLACK)
// ──────────────────────────────────────────────
export const GALAXY_BG =
  'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)';
