// ============================================================
// Puntos Plus — Constantes y Configuración de Negocio
// ============================================================
// Reglas de negocio INAMOVIBLES y valores por defecto.
// Los valores editables vienen de Supabase (program_config).
// ============================================================

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
  // Degradación real (25-jul-2026, algoritmo del dueño): 15 días de
  // gracia; desde el día 16 los galones caen a UMBRAL − n(n+1)/2 por
  // día (−1, −3, −6, −10…). Reinicio total 45 días después de caer a
  // ORO. Motor: RPC apply_due_degradations (perezoso, al abrir la app).
  // APAGADO hasta el lanzamiento oficial — interruptor en admin
  // Settings (program_config 'degradation_enabled').
  degradEnabled: false,
  degradEnabledAt: null,
  // Canal de asistencia (4-ago-2026): número de WhatsApp/llamadas del
  // negocio — editable en Admin → Configuración (program_config 'support').
  supportPhone: '49741067',
  degrad: [
    {
      tier: 'BLACK',
      rules: [
        { days: 15, effect: 'Baja a PLATINO y pierde galones cada día (−1, −3, −6…)' },
        { days: 30, effect: 'Baja a ORO y sigue perdiendo galones' },
        { days: 75, effect: 'Reinicio total: puntos y galones en 0' },
      ],
    },
    {
      tier: 'PLATINO',
      rules: [
        { days: 15, effect: 'Baja a ORO y pierde galones cada día (−1, −3, −6…)' },
        { days: 60, effect: 'Reinicio total: puntos y galones en 0' },
      ],
    },
    {
      tier: 'ORO',
      rules: [
        { days: 45, effect: 'Reinicio total: puntos y galones en 0' },
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
  merch:       { bg: '#E3F2FD', color: '#1565C0', label: 'Puntos Plus' },
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
// Encuestas Shell por estación (tellshell oficial).
// `name` debe coincidir EXACTO con stations.name — es la llave
// que une la compra (Realtime) y el modal de encuestas con su URL.
// ──────────────────────────────────────────────
export const SURVEY_WAIT = 90; // segundos mínimos en la página de Shell

export const SHELL_SURVEYS = [
  { name: 'Turkaj I',   url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700531' },
  { name: 'Turkaj II',  url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700717' },
  { name: 'Turkaj III', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700211' },
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

// ──────────────────────────────────────────────
// Prefijos de tarjeta digital por tier
// CTOD = Cliente Turkaj Oro Digital
// CTPD = Cliente Turkaj Platino Digital
// CTBD = Cliente Turkaj Black Digital
export const CARD_PREFIX = { ORO: 'CTOD', PLATINO: 'CTPD', BLACK: 'CTBD' };
export const ALL_CARD_PREFIXES = ['CTOD', 'CTPD', 'CTBD'];

// Aliases (compatibilidad con vistas)
// ──────────────────────────────────────────────
export { DEFAULT_CONFIG as CFG_INIT };
