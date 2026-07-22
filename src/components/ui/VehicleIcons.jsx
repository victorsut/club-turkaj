// src/components/ui/VehicleIcons.jsx
// Iconos SVG por tipo de vehículo (FORMATO GENERAL — cero emojis).
// VEHICLE_TYPES es el catálogo canónico: registro (GoogleProfile) y,
// a futuro, la ventana Vehículos consumen de acá.

const V = ({ size = 22, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// Camión (cabina + furgón)
export const TruckIcon = ({ size }) => (
  <V size={size}>
    <path d="M14 17.5V6a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 2 6v10.5a1 1 0 0 0 1 1h1.6" />
    <path d="M14 8h3.5a1 1 0 0 1 .78.37l3.5 4.37a1 1 0 0 1 .22.63v3.13a1 1 0 0 1-1 1h-1.6" />
    <circle cx="7" cy="17.5" r="1.9" />
    <circle cx="17.5" cy="17.5" r="1.9" />
    <path d="M8.9 17.5h6.7" />
  </V>
);

// Camión ligero (panel / furgoneta)
export const VanIcon = ({ size }) => (
  <V size={size}>
    <path d="M2.5 8A1.5 1.5 0 0 1 4 6.5h10.2a1.5 1.5 0 0 1 1.15.54L19 11h1.5A1.5 1.5 0 0 1 22 12.5v3.7a.8.8 0 0 1-.8.8h-1.5" />
    <path d="M2.5 8v8.2a.8.8 0 0 0 .8.8h1.5" />
    <path d="M12 6.5V11H2.5" />
    <circle cx="6.8" cy="17" r="1.8" />
    <circle cx="17.2" cy="17" r="1.8" />
    <path d="M8.6 17h6.8" />
  </V>
);

// Picop (cabina + palangana)
export const PickupIcon = ({ size }) => (
  <V size={size}>
    <path d="M3.2 11.5 4.8 7a1.6 1.6 0 0 1 1.5-1.1h4l2.2 5.6" />
    <path d="M2.5 11.5H21a.8.8 0 0 1 .8.8v3.6a.8.8 0 0 1-.8.8h-1.4" />
    <path d="M2.5 11.5v4.4a.8.8 0 0 0 .8.8h1.3" />
    <path d="M21.5 11.5V9.6" />
    <circle cx="7" cy="17" r="1.8" />
    <circle cx="16.6" cy="17" r="1.8" />
    <path d="M8.8 17h6" />
  </V>
);

// Micro bus (ventanas + ruedas)
export const BusIcon = ({ size }) => (
  <V size={size}>
    <rect x="4" y="3.5" width="16" height="14" rx="2" />
    <path d="M4 11h16" />
    <path d="M8.5 3.5V11M15.5 3.5V11" />
    <path d="M7 14.2h.01M17 14.2h.01" />
    <circle cx="8" cy="19.5" r="1.6" />
    <circle cx="16" cy="19.5" r="1.6" />
  </V>
);

// Vehículo liviano (sedán)
export const SedanIcon = ({ size }) => (
  <V size={size}>
    <path d="M4.5 11.5 6 7a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 7l1.5 4.5" />
    <path d="M4 11.5h16a1.5 1.5 0 0 1 1.5 1.5v3.5a1 1 0 0 1-1 1h-1M4 11.5A1.5 1.5 0 0 0 2.5 13v3.5a1 1 0 0 0 1 1h1" />
    <circle cx="7.3" cy="17" r="1.7" />
    <circle cx="16.7" cy="17" r="1.7" />
    <path d="M9 17h6" />
  </V>
);

// Moto taxi (cabina con toldo, tres ruedas)
export const MototaxiIcon = ({ size }) => (
  <V size={size}>
    <path d="M4.5 13V7A1.5 1.5 0 0 1 6 5.5h8.4a1.5 1.5 0 0 1 1.17.56L19 10.5V13" />
    <path d="M3.5 13h17" />
    <path d="M12 5.5V13" />
    <circle cx="6.8" cy="17.5" r="2" />
    <circle cx="17.2" cy="17.5" r="2" />
    <path d="M8.8 17.5h6.4" />
  </V>
);

// Motocicleta
export const MotoIcon = ({ size }) => (
  <V size={size}>
    <circle cx="5.3" cy="16.5" r="2.8" />
    <circle cx="18.7" cy="16.5" r="2.8" />
    <path d="M5.3 16.5 8 11h5.5" />
    <path d="M10.5 16.5h3.4l2.4-5.5" />
    <path d="M14.6 8.5h2.2l1.9 8" />
    <path d="M13.5 11 12 8.5h-1.8" />
  </V>
);

// Llave inglesa (otros)
export const WrenchIcon = ({ size }) => (
  <V size={size}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </V>
);

// Catálogo canónico de tipos de vehículo
export const VEHICLE_TYPES = [
  { k: 'camion',        label: 'Camión',           Icon: TruckIcon },
  { k: 'camion_ligero', label: 'Camión ligero',    Icon: VanIcon },
  { k: 'picop',         label: 'Picop',            Icon: PickupIcon },
  { k: 'microbus',      label: 'Micro Bus',        Icon: BusIcon },
  { k: 'liviano',       label: 'Vehículo liviano', Icon: SedanIcon },
  { k: 'mototaxi',      label: 'Moto Taxi',        Icon: MototaxiIcon },
  { k: 'moto',          label: 'Motocicleta',      Icon: MotoIcon },
  { k: 'otro',          label: 'Otros',            Icon: WrenchIcon },
];
