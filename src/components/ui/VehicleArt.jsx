// src/components/ui/VehicleArt.jsx
// F6 Etapa 1 (15-ago-2026) — Ilustraciones "3D" por TIPO de vehículo
// (decisión del dueño: ilustración estilizada por tipo, recoloreable
// al color REAL del vehículo; marca/modelo van como texto en la ficha).
// Vista lateral mirando a la derecha, viewBox común 240×150: carrocería
// con degradado vertical (luz arriba), vidrios oscuros con reflejo,
// llantas con rin metálico, faro/calavera y sombra elíptica de piso.
// Los 8 tipos = catálogo canónico de VehicleIcons (VEHICLE_TYPES).
// Todo SVG puro — cero librerías, recolorea al instante vía props.
import { useId } from 'react';

export const VEHICLE_COLORS = [
  '#C62828', '#FA5408', '#F9A825', '#2E7D32', '#00838F', '#1565C0',
  '#4527A0', '#AD1457', '#5D4037', '#37474F', '#9E9E9E', '#ECEFF1',
];

// Aclara (+) / oscurece (−) un hex en unidades 0-255.
function shade(hex, amt) {
  const c = parseInt((hex || '#9E9E9E').replace('#', ''), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  const r = f(c >> 16), g = f((c >> 8) & 255), b = f(c & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── Piezas comunes ───────────────────────────────────────────
const Wheel = ({ cx, cy, r, uid }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#15151A" />
    <circle cx={cx} cy={cy} r={r * 0.66} fill="#2C2C34" />
    <circle cx={cx} cy={cy} r={r * 0.52} fill={`url(#${uid}-rim)`} />
    <circle cx={cx} cy={cy} r={r * 0.16} fill="#3A3A42" />
    {[0, 60, 120, 180, 240, 300].map(a => (
      <rect key={a} x={cx - r * 0.06} y={cy - r * 0.48} width={r * 0.12} height={r * 0.34}
        rx={r * 0.06} fill="#8E9096" transform={`rotate(${a} ${cx} ${cy})`} />
    ))}
  </g>
);

const Shadow = ({ cx = 120, w = 96 }) => (
  <ellipse cx={cx} cy={132} rx={w} ry={8} fill="rgba(0,0,0,.20)" />
);

// Defs compartidos: degradado de carrocería + vidrio + rin.
const Defs = ({ uid, color }) => (
  <defs>
    <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={shade(color, 52)} />
      <stop offset="45%" stopColor={color} />
      <stop offset="100%" stopColor={shade(color, -42)} />
    </linearGradient>
    <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#3D4A58" />
      <stop offset="55%" stopColor="#1E2731" />
      <stop offset="100%" stopColor="#131A22" />
    </linearGradient>
    <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#E8EAEE" />
      <stop offset="100%" stopColor="#9A9EA8" />
    </linearGradient>
  </defs>
);

// Reflejo diagonal sobre el vidrio (venta el "3D").
const Gleam = ({ d }) => <path d={d} fill="rgba(255,255,255,.22)" />;

// ── Sedán (vehículo liviano) ─────────────────────────────────
const SedanArt = ({ uid, color }) => (
  <g>
    <Shadow />
    <path d={'M18 106 Q16 88 30 84 L52 80 Q78 52 108 50 L148 50 Q176 54 196 78 L214 82 Q226 86 224 100 L222 106 Q222 112 214 112 L198 112 A22 22 0 0 0 154 112 L92 112 A22 22 0 0 0 48 112 L28 112 Q18 112 18 106 Z'}
      fill={`url(#${uid}-body)`} />
    <path d="M60 79 Q80 56 107 54 L145 54 Q168 58 184 77 Z" fill={`url(#${uid}-glass)`} />
    <rect x="121" y="54" width="4" height="25" fill={shade(color, -30)} />
    <Gleam d="M70 77 Q88 58 108 56 L120 56 L98 77 Z" />
    <path d="M18 100 L224 96 L223 104 Q222 112 214 112 L198 112 A22 22 0 0 0 154 112 L92 112 A22 22 0 0 0 48 112 L28 112 Q18 112 18 100 Z"
      fill={shade(color, -58)} opacity=".55" />
    <rect x="212" y="84" width="12" height="7" rx="3.5" fill="#FFE9A8" />
    <rect x="18" y="86" width="9" height="7" rx="3.5" fill="#E53935" />
    <rect x="52" y="92" width="140" height="3.5" rx="1.75" fill={shade(color, 30)} opacity=".6" />
    <Wheel cx={70} cy={110} r={19} uid={uid} />
    <Wheel cx={176} cy={110} r={19} uid={uid} />
  </g>
);

// ── Picop (pickup) ───────────────────────────────────────────
const PickupArt = ({ uid, color }) => (
  <g>
    <Shadow />
    <path d={'M16 104 L16 74 Q16 68 24 68 L96 68 L96 46 Q96 40 104 40 L138 40 Q146 40 152 48 L168 68 L204 72 Q222 76 222 92 L222 104 Q222 110 214 110 L196 110 A21 21 0 0 0 154 110 L88 110 A21 21 0 0 0 46 110 L24 110 Q16 110 16 104 Z'}
      fill={`url(#${uid}-body)`} />
    <path d="M103 66 L103 46 L136 46 Q142 46 146 52 L158 66 Z" fill={`url(#${uid}-glass)`} />
    <Gleam d="M106 63 L106 48 L124 48 L112 63 Z" />
    <path d="M16 96 L222 94 L222 104 Q222 110 214 110 L196 110 A21 21 0 0 0 154 110 L88 110 A21 21 0 0 0 46 110 L24 110 Q16 110 16 96 Z"
      fill={shade(color, -58)} opacity=".55" />
    <rect x="16" y="70" width="80" height="4" fill={shade(color, -30)} />
    <rect x="210" y="78" width="12" height="7" rx="3.5" fill="#FFE9A8" />
    <rect x="16" y="80" width="8" height="7" rx="3.5" fill="#E53935" />
    <Wheel cx={67} cy={108} r={20} uid={uid} />
    <Wheel cx={175} cy={108} r={20} uid={uid} />
  </g>
);

// ── Camión (cabina + furgón) ─────────────────────────────────
const TruckArt = ({ uid, color }) => (
  <g>
    <Shadow w={102} />
    <rect x="14" y="30" width="118" height="74" rx="6" fill={`url(#${uid}-body)`} />
    <rect x="14" y="30" width="118" height="10" rx="5" fill={shade(color, 40)} opacity=".7" />
    <rect x="14" y="92" width="118" height="12" fill={shade(color, -58)} opacity=".55" />
    <path d={'M140 104 L140 56 Q140 50 148 50 L176 50 Q184 50 189 58 L202 76 L216 80 Q226 84 226 94 L226 104 Q226 110 218 110 L206 110 A19 19 0 0 0 170 110 L158 110 Q140 110 140 104 Z'}
      fill={`url(#${uid}-body)`} />
    <path d="M147 74 L147 56 L174 56 Q180 56 184 62 L193 74 Z" fill={`url(#${uid}-glass)`} />
    <Gleam d="M150 71 L150 58 L166 58 L156 71 Z" />
    <rect x="216" y="86" width="10" height="7" rx="3.5" fill="#FFE9A8" />
    <Wheel cx={52} cy={108} r={19} uid={uid} />
    <Wheel cx={96} cy={108} r={19} uid={uid} />
    <Wheel cx={185} cy={108} r={19} uid={uid} />
  </g>
);

// ── Camión ligero (panel / furgoneta) ────────────────────────
const VanArt = ({ uid, color }) => (
  <g>
    <Shadow />
    <path d={'M18 104 L18 46 Q18 38 28 38 L142 38 Q152 38 158 46 L188 74 L210 78 Q222 82 222 94 L222 104 Q222 110 214 110 L196 110 A20 20 0 0 0 156 110 L86 110 A20 20 0 0 0 46 110 L26 110 Q18 110 18 104 Z'}
      fill={`url(#${uid}-body)`} />
    <path d="M146 68 L146 46 L152 46 Q156 46 160 51 L178 68 Z" fill={`url(#${uid}-glass)`} />
    <rect x="26" y="46" width="112" height="22" rx="5" fill={shade(color, -26)} opacity=".35" />
    <Gleam d="M30 66 L58 44 L84 44 L50 66 Z" />
    <path d="M18 96 L222 94 L222 104 Q222 110 214 110 L196 110 A20 20 0 0 0 156 110 L86 110 A20 20 0 0 0 46 110 L26 110 Q18 110 18 96 Z"
      fill={shade(color, -58)} opacity=".55" />
    <rect x="210" y="82" width="12" height="7" rx="3.5" fill="#FFE9A8" />
    <rect x="18" y="60" width="7" height="8" rx="3.5" fill="#E53935" />
    <Wheel cx={64} cy={108} r={19} uid={uid} />
    <Wheel cx={174} cy={108} r={19} uid={uid} />
  </g>
);

// ── Micro bus ────────────────────────────────────────────────
const BusArt = ({ uid, color }) => (
  <g>
    <Shadow w={102} />
    <path d={'M16 104 L16 42 Q16 34 26 34 L200 34 Q214 34 218 46 L222 74 L222 104 Q222 110 214 110 L198 110 A20 20 0 0 0 158 110 L84 110 A20 20 0 0 0 44 110 L24 110 Q16 110 16 104 Z'}
      fill={`url(#${uid}-body)`} />
    {[30, 66, 102, 138].map(x => (
      <rect key={x} x={x} y="44" width="30" height="24" rx="5" fill={`url(#${uid}-glass)`} />
    ))}
    <path d="M176 68 L176 44 L200 44 Q210 44 212 52 L216 68 Z" fill={`url(#${uid}-glass)`} />
    <Gleam d="M34 66 L54 46 L74 46 L48 66 Z" />
    <path d="M16 92 L222 90 L222 104 Q222 110 214 110 L198 110 A20 20 0 0 0 158 110 L84 110 A20 20 0 0 0 44 110 L24 110 Q16 110 16 92 Z"
      fill={shade(color, -58)} opacity=".55" />
    <rect x="212" y="80" width="10" height="7" rx="3.5" fill="#FFE9A8" />
    <rect x="16" y="78" width="8" height="7" rx="3.5" fill="#E53935" />
    <Wheel cx={62} cy={108} r={19} uid={uid} />
    <Wheel cx={178} cy={108} r={19} uid={uid} />
  </g>
);

// ── Motocicleta ──────────────────────────────────────────────
const MotoArt = ({ uid, color }) => (
  <g>
    <Shadow w={82} />
    {/* horquilla + manubrio */}
    <path d="M186 52 L170 96" stroke="#3A3A42" strokeWidth="7" strokeLinecap="round" fill="none" />
    <path d="M174 46 Q186 44 194 52" stroke="#26262C" strokeWidth="7" strokeLinecap="round" fill="none" />
    {/* cuerpo/tanque + asiento + cola */}
    <path d="M78 72 Q96 60 122 62 L154 66 Q170 68 176 78 L166 92 L96 92 Q80 88 78 72 Z" fill={`url(#${uid}-body)`} />
    <path d="M60 66 Q76 60 88 64 L104 70 L84 84 Q64 82 60 66 Z" fill={shade(color, -30)} />
    <path d="M96 60 Q112 52 130 56 L124 66 Q108 64 96 60 Z" fill={`url(#${uid}-body)`} />
    <Gleam d="M100 66 Q116 60 132 63 L128 70 Q112 68 100 66 Z" />
    {/* escape */}
    <path d="M96 92 L160 92" stroke="#8E9096" strokeWidth="8" strokeLinecap="round" />
    {/* faro */}
    <circle cx="192" cy="58" r="6" fill="#FFE9A8" />
    <Wheel cx={64} cy={104} r={22} uid={uid} />
    <Wheel cx={176} cy={104} r={22} uid={uid} />
    <path d="M64 104 L122 78 L176 104" stroke="#2C2C34" strokeWidth="6" fill="none" strokeLinecap="round" />
  </g>
);

// ── Moto taxi (tres ruedas con capota) ───────────────────────
const MototaxiArt = ({ uid, color }) => (
  <g>
    <Shadow w={88} />
    {/* capota */}
    <path d="M52 44 Q120 28 190 44 L184 58 Q120 44 58 58 Z" fill={shade(color, -36)} />
    {/* postes */}
    <path d="M64 54 L70 84 M178 54 L172 84" stroke="#3A3A42" strokeWidth="5" strokeLinecap="round" />
    {/* cuerpo */}
    <path d={'M34 100 Q30 84 44 80 L64 76 Q94 62 128 62 L166 66 Q192 70 202 86 L206 96 Q208 106 198 106 L186 106 A19 19 0 0 0 150 106 L86 106 A19 19 0 0 0 50 106 L42 106 Q34 106 34 100 Z'}
      fill={`url(#${uid}-body)`} />
    <path d="M132 78 Q152 66 170 70 L188 80 L160 88 Z" fill={`url(#${uid}-glass)`} />
    <Gleam d="M138 76 Q152 68 164 70 L150 80 Z" />
    <path d="M34 96 L206 94 L206 98 Q208 106 198 106 L186 106 A19 19 0 0 0 150 106 L86 106 A19 19 0 0 0 50 106 L42 106 Q34 106 34 96 Z"
      fill={shade(color, -58)} opacity=".55" />
    <circle cx="202" cy="82" r="6" fill="#FFE9A8" />
    <Wheel cx={68} cy={106} r={18} uid={uid} />
    <Wheel cx={168} cy={106} r={18} uid={uid} />
  </g>
);

// ── Otros (silueta genérica hatchback) ───────────────────────
const OtherArt = ({ uid, color }) => (
  <g>
    <Shadow />
    <path d={'M20 104 Q18 88 32 84 L56 80 Q80 54 110 52 L138 52 Q150 52 160 62 L196 80 L212 84 Q224 88 222 100 L220 104 Q220 110 212 110 L196 110 A21 21 0 0 0 154 110 L90 110 A21 21 0 0 0 48 110 L30 110 Q20 110 20 104 Z'}
      fill={`url(#${uid}-body)`} />
    <path d="M64 79 Q84 58 109 56 L136 56 Q146 56 153 64 L168 77 Z" fill={`url(#${uid}-glass)`} />
    <Gleam d="M72 77 Q88 60 108 58 L120 58 L100 77 Z" />
    <path d="M20 98 L222 96 L221 102 Q220 110 212 110 L196 110 A21 21 0 0 0 154 110 L90 110 A21 21 0 0 0 48 110 L30 110 Q20 110 20 98 Z"
      fill={shade(color, -58)} opacity=".55" />
    <rect x="210" y="86" width="11" height="7" rx="3.5" fill="#FFE9A8" />
    <Wheel cx={70} cy={108} r={19} uid={uid} />
    <Wheel cx={174} cy={108} r={19} uid={uid} />
  </g>
);

const ART = {
  liviano: SedanArt,
  picop: PickupArt,
  camion: TruckArt,
  camion_ligero: VanArt,
  microbus: BusArt,
  moto: MotoArt,
  mototaxi: MototaxiArt,
  otro: OtherArt,
};

// Componente público: <VehicleArt type="liviano" color="#1565C0" width={280} />
export default function VehicleArt({ type = 'liviano', color = '#9E9E9E', width = 260, style }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const Art = ART[type] || OtherArt;
  return (
    <svg width={width} height={width * (150 / 240)} viewBox="0 0 240 150"
      aria-hidden style={{ display: 'block', ...style }}>
      <Defs uid={uid} color={color} />
      <Art uid={uid} color={color} />
    </svg>
  );
}
