// src/components/ui/BentoIcons.jsx
// R1b — Iconos blancos de los tiles del home, fieles a la referencia
// visual (glifos limpios en blanco, no emojis). Trazo consistente.
const S = ({ size = 28, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// Regalo (Promociones)
export const GiftIcon = ({ size }) => (
  <S size={size}>
    <rect x="3.5" y="7.5" width="17" height="4.5" rx="1" />
    <path d="M5.5 12v7a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-7" />
    <path d="M12 7.5v13" />
    <path d="M12 7.5C12 5 10.2 3.2 8.6 3.5 7 3.8 6.8 6 8.3 6.9c1.2.7 3.7.6 3.7.6z" />
    <path d="M12 7.5c0-2.5 1.8-4.3 3.4-4 1.6.3 1.8 2.5.3 3.4-1.2.7-3.7.6-3.7.6z" />
  </S>
);

// Auto (Vehículo)
export const CarIcon = ({ size }) => (
  <S size={size}>
    <path d="M4.5 11.5 6 7a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 7l1.5 4.5" />
    <path d="M4 11.5h16a1.5 1.5 0 0 1 1.5 1.5v3.5a1 1 0 0 1-1 1h-1M4 11.5A1.5 1.5 0 0 0 2.5 13v3.5a1 1 0 0 0 1 1h1" />
    <circle cx="7.3" cy="17" r="1.7" />
    <circle cx="16.7" cy="17" r="1.7" />
    <path d="M9 17h6" />
  </S>
);

// WiFi
export const WifiIcon = ({ size }) => (
  <S size={size}>
    <path d="M2.5 9.2a15 15 0 0 1 19 0" />
    <path d="M5.6 12.7a10.3 10.3 0 0 1 12.8 0" />
    <path d="M8.7 16.1a5.7 5.7 0 0 1 6.6 0" />
    <circle cx="12" cy="19.2" r="1.3" fill="#fff" stroke="none" />
  </S>
);

// Encuesta (portapapeles)
export const SurveyIcon = ({ size }) => (
  <S size={size}>
    <rect x="4.5" y="4" width="15" height="17" rx="2" />
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <path d="M8.3 10h7.4M8.3 13.5h7.4M8.3 17h4.2" />
  </S>
);

// Pin de mapa (Ubicación)
export const PinIcon = ({ size }) => (
  <S size={size}>
    <path d="M12 21.5S5.5 15.8 5.5 11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 10.5-6.5 10.5z" />
    <circle cx="12" cy="10.8" r="2.4" />
  </S>
);

// Boleto con estrella (Historial de Canjes)
export const TicketStarIcon = ({ size }) => (
  <S size={size}>
    <path d="M3.5 9V7a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2a2.6 2.6 0 0 0 0 6v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2a2.6 2.6 0 0 0 0-6z" />
    <path d="m12 8.6.95 1.95 2.15.3-1.55 1.5.35 2.15L12 13.5l-1.9 1 .35-2.15-1.55-1.5 2.15-.3z" fill="#fff" stroke="none" />
  </S>
);

// Bolsa de compras (Historial de Compras)
export const BagIcon = ({ size }) => (
  <S size={size}>
    <path d="M5.2 8h13.6l-1.1 11.4a1.7 1.7 0 0 1-1.7 1.6H8a1.7 1.7 0 0 1-1.7-1.6z" />
    <path d="M8.7 10.8V6.7a3.3 3.3 0 0 1 6.6 0v4.1" />
  </S>
);
