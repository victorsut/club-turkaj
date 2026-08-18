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

// ── Hatchback (Yaris, Swift, March...) — cola corta y portón alto ──
const HatchArt = ({ uid, color }) => (
  <g>
    <Shadow w={88} />
    <path d={'M28 106 Q26 88 40 84 L60 80 Q84 54 114 52 L142 52 Q158 52 166 60 L176 70 Q188 74 194 84 L196 100 Q196 110 186 110 L178 110 A21 21 0 0 0 136 110 L86 110 A21 21 0 0 0 44 110 L38 110 Q28 110 28 106 Z'}
      fill={`url(#${uid}-body)`} />
    <path d="M68 79 Q88 58 113 56 L138 56 Q150 56 157 64 L170 78 Z" fill={`url(#${uid}-glass)`} />
    <rect x="116" y="56" width="4" height="23" fill={shade(color, -30)} />
    <Gleam d="M76 77 Q92 60 112 58 L124 58 L102 77 Z" />
    <path d="M28 98 L196 94 L196 100 Q196 110 186 110 L178 110 A21 21 0 0 0 136 110 L86 110 A21 21 0 0 0 44 110 L38 110 Q28 110 28 98 Z"
      fill={shade(color, -58)} opacity=".55" />
    <rect x="186" y="82" width="10" height="7" rx="3.5" fill="#FFE9A8" />
    <rect x="28" y="86" width="8" height="8" rx="4" fill="#E53935" />
    <Wheel cx={74} cy={108} r={19} uid={uid} />
    <Wheel cx={158} cy={108} r={19} uid={uid} />
  </g>
);

// ── SUV (RAV4, Fortuner, Tucson...) — alto, rieles de techo ──
const SuvArt = ({ uid, color }) => (
  <g>
    <Shadow />
    {/* rieles de techo */}
    <rect x="66" y="36" width="98" height="4" rx="2" fill="#3A3A42" />
    <path d={'M20 100 Q18 80 34 76 L52 72 Q64 44 96 42 L152 42 Q176 44 188 64 L206 72 Q222 76 222 90 L222 98 Q222 106 212 106 L198 106 A22 22 0 0 0 154 106 L92 106 A22 22 0 0 0 48 106 L30 106 Q20 106 20 100 Z'}
      fill={`url(#${uid}-body)`} />
    <path d="M60 71 Q72 48 98 46 L148 46 Q168 48 180 65 L182 71 Z" fill={`url(#${uid}-glass)`} />
    <rect x="118" y="46" width="4" height="25" fill={shade(color, -30)} />
    <Gleam d="M68 69 Q80 50 100 48 L114 48 L92 69 Z" />
    <path d="M20 92 L222 88 L222 98 Q222 106 212 106 L198 106 A22 22 0 0 0 154 106 L92 106 A22 22 0 0 0 48 106 L30 106 Q20 106 20 92 Z"
      fill={shade(color, -58)} opacity=".55" />
    <rect x="210" y="76" width="12" height="8" rx="4" fill="#FFE9A8" />
    <rect x="20" y="78" width="9" height="9" rx="4" fill="#E53935" />
    <Wheel cx={70} cy={106} r={21} uid={uid} />
    <Wheel cx={176} cy={106} r={21} uid={uid} />
  </g>
);

// ── Picop DOBLE CABINA (Hilux, D-Max, L200...) ───────────────
const Pickup2Art = ({ uid, color }) => (
  <g>
    <Shadow />
    <path d={'M14 104 L14 74 Q14 68 22 68 L74 68 L74 46 Q74 40 82 40 L148 40 Q156 40 162 48 L176 68 L206 72 Q224 76 224 92 L224 104 Q224 110 216 110 L198 110 A21 21 0 0 0 156 110 L84 110 A21 21 0 0 0 42 110 L22 110 Q14 110 14 104 Z'}
      fill={`url(#${uid}-body)`} />
    {/* dos ventanas = doble cabina */}
    <path d="M81 66 L81 46 L112 46 L112 66 Z" fill={`url(#${uid}-glass)`} />
    <path d="M118 66 L118 46 L146 46 Q152 46 156 52 L166 66 Z" fill={`url(#${uid}-glass)`} />
    <Gleam d="M84 63 L84 48 L100 48 L90 63 Z" />
    <path d="M14 96 L224 94 L224 104 Q224 110 216 110 L198 110 A21 21 0 0 0 156 110 L84 110 A21 21 0 0 0 42 110 L22 110 Q14 110 14 96 Z"
      fill={shade(color, -58)} opacity=".55" />
    <rect x="14" y="70" width="60" height="4" fill={shade(color, -30)} />
    <rect x="212" y="78" width="12" height="7" rx="3.5" fill="#FFE9A8" />
    <rect x="14" y="80" width="8" height="7" rx="3.5" fill="#E53935" />
    <Wheel cx={63} cy={108} r={20} uid={uid} />
    <Wheel cx={177} cy={108} r={20} uid={uid} />
  </g>
);

// ── Moto de trabajo / cub (Boxer, AT110, Wave...) ────────────
const MotoCubArt = ({ uid, color }) => (
  <g>
    <Shadow w={78} />
    {/* horquilla + manubrio alto */}
    <path d="M178 50 L166 98" stroke="#3A3A42" strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M166 46 Q178 42 188 48" stroke="#26262C" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* escudo de piernas + chasis paso bajo */}
    <path d="M152 58 Q166 60 168 76 L156 92 L140 84 Q144 66 152 58 Z" fill={`url(#${uid}-body)`} />
    <path d="M84 88 Q112 82 140 84 L156 92 L96 98 Q86 96 84 88 Z" fill={shade(color, -24)} />
    {/* tanque/cuerpo + asiento largo plano */}
    <path d="M74 74 Q98 66 128 70 L146 76 L142 88 L84 88 Q74 84 74 74 Z" fill={`url(#${uid}-body)`} />
    <rect x="62" y="64" width="64" height="10" rx="5" fill="#26262C" />
    <Gleam d="M84 74 Q100 69 118 71 L114 78 Q98 76 84 74 Z" />
    {/* parrilla trasera */}
    <path d="M52 62 L72 62 M56 62 L60 74 M68 62 L66 74" stroke="#3A3A42" strokeWidth="4" strokeLinecap="round" />
    {/* escape bajo */}
    <path d="M92 98 L152 96" stroke="#8E9096" strokeWidth="7" strokeLinecap="round" />
    <circle cx="184" cy="54" r="5.5" fill="#FFE9A8" />
    <Wheel cx={66} cy={104} r={19} uid={uid} />
    <Wheel cx={170} cy={104} r={19} uid={uid} />
    <path d="M66 104 L118 84 L170 104" stroke="#2C2C34" strokeWidth="5" fill="none" strokeLinecap="round" />
  </g>
);

// ── MODELO ESPECÍFICO: Honda Navi (alta fidelidad) ───────────
// Nivel "casi el original con detalles menores distintos" (pedido del
// dueño 15-ago; sin logos ni marcas = sin problema de licencias).
// Rasgos del real: ruedas pequeñas con rin de acero, guardafangos y
// carenado del manubrio en el COLOR del cuerpo, faro cuadrado, faux
// tank chunky con crease lateral, CAVIDAD portaobjetos abierta bajo
// el asiento, asiento plano largo con costura y asa trasera, tren
// CVT de scooter hacia la rueda trasera y escape lateral visible.
const NaviWheel = ({ cx, cy, r }) => (
  <g>
    {/* llanta GORDA + rin de acero NEGRO con 8 ranuras OVALADAS (foto) */}
    <circle cx={cx} cy={cy} r={r} fill="#141418" />
    <circle cx={cx} cy={cy} r={r * 0.93} fill="none" stroke="#1F1F24" strokeWidth={r * 0.1} />
    <circle cx={cx} cy={cy} r={r * 0.62} fill="#1E1E23" />
    <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke="#3A3C42" strokeWidth="1.5" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
      <ellipse key={a} cx={cx} cy={cy - r * 0.4} rx={r * 0.085} ry={r * 0.15} fill="#0B0B0D"
        transform={`rotate(${a} ${cx} ${cy})`} />
    ))}
    {[22, 142, 262].map(a => (
      <circle key={a} cx={cx} cy={cy - r * 0.19} r={r * 0.045} fill="#9A9EA8"
        transform={`rotate(${a} ${cx} ${cy})`} />
    ))}
    <circle cx={cx} cy={cy} r={r * 0.13} fill="#3A3A42" />
    <circle cx={cx} cy={cy} r={r * 0.05} fill="#55575E" />
    <path d={`M ${cx - r * 0.8} ${cy - r * 0.5} A ${r * 0.95} ${r * 0.95} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.92}`}
      stroke="rgba(255,255,255,.08)" strokeWidth="3" fill="none" />
  </g>
);

// Redibujada CONTRA LA FOTO de referencia del dueño, 2ª ronda con la
// foto ampliada por zonas (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png):
// rines de acero negros con 8 ranuras ovaladas, MOFLE = caja rectangular
// grande con placa atornillada, RESORTE ROJO en espiral casi vertical,
// caja portaequipaje FACETADA, cuña en color que llega en punta hasta
// debajo de la cola, disco con ARO gris + viga del bastidor con ranura,
// asiento GRUESO con asa en color bajo la cola, guardafangos negros
// concéntricos a la llanta, máscara con cresta en V y faro GRANDE,
// espejo de gota en color en alto + espejo espejado bajo. Sin logos.
const NaviArt = ({ uid, color }) => (
  <g>
    <Shadow cx={120} w={92} />

    {/* ── tren trasero (eje en 68,97 — moto CORTA, llantas grandes) ── */}
    <NaviWheel cx={68} cy={97} r={27} />
    {/* guardafango/faldón trasero negro entre llanta, motor y caja */}
    <path d="M46 82 A 30 30 0 0 1 98 76 L104 88 L96 92 A 22 22 0 0 0 52 88 Z" fill="#1C1C20" />

    {/* MOFLE compacto a la altura del eje: caja con costilla superior y
        placa oscura atornillada; apenas rebasa la llanta (foto) */}
    <rect x="36" y="84" width="40" height="21" rx="6" fill="#2A2C31" />
    <rect x="36" y="84" width="40" height="6.5" rx="3.25" fill="#35373D" />
    <path d="M43 87 L69 87" stroke="#1D1F24" strokeWidth="2" strokeDasharray="4.5 3.5" />
    <rect x="40" y="92" width="32" height="10" rx="3.5" fill="#1B1D21" />
    <circle cx="44.5" cy="97" r="1.5" fill="#8E9096" />
    <circle cx="67.5" cy="97" r="1.5" fill="#8E9096" />

    {/* motor: masa oscura + tapa CVT con aletas RADIALES (foto) */}
    <path d="M80 78 Q76 100 100 102 L116 100 L116 78 Z" fill="#26262C" />
    <circle cx="94" cy="91" r="10.5" fill="#2E3036" stroke="#1D1D22" strokeWidth="1.4" />
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => (
      <path key={a} d="M94 82 L94 85" stroke="#1D1D22" strokeWidth="1.4"
        transform={`rotate(${a} 94 91)`} />
    ))}
    <circle cx="94" cy="91" r="3.8" fill="#46484F" />

    {/* AMORTIGUADOR sobre el eje trasero: barra + RESORTE ROJO (foto) */}
    <path d="M79 52 L72 82" stroke="#202024" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M72 58 L80 60.5 L71 63 L79 65.5 L70 68 L78 70.5 L69 73 L77 75.5"
      stroke="#D23B34" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

    {/* caja portaequipaje FACETADA gris oscuro con emboss (foto) */}
    <path d="M116 56 L144 59 L150 72 L146 88 L122 91 L112 80 Z"
      fill="#26262C" stroke="#17171B" strokeWidth="1.4" />
    <path d="M120 61 L141 63 L145 73 L124 77 L117 70 Z" fill="#2E3036" />
    <path d="M124 77 L145 73 L143 85 L126 87 Z" fill="#212126" />
    <rect x="129" y="79" width="12" height="4" rx="2" fill="#33353B" />

    {/* carenado de piso negro hacia el frente + posapiés */}
    <path d="M112 80 L122 91 Q140 94 154 90 L162 95 Q140 102 118 98 Q108 95 106 84 Z" fill="#1B1B1F" />
    <rect x="146" y="94" width="15" height="4.5" rx="2.25" fill="#33353B" />

    {/* CUÑA en color (foto): tanque con joroba al frente, banda diagonal
        bajo el asiento que TERMINA EN PUNTA bajo la cola, y panza que
        baja hasta el disco */}
    <path d="M56 34 Q76 39 106 43 Q122 45.5 136 47 L143 38 Q149 33 157 34 Q166 36 166 44 L164 53 Q159 58 151 59 L132 62.5 Q120 65 113 68 Q102 62 96 59 Q86 56 78 58 Q68 60 64 56 Q58 48 56 36 Z"
      fill={`url(#${uid}-body)`} stroke={shade(color, -52)} strokeWidth="1.2" />
    <path d="M144 39 Q152 35 160 37" stroke={shade(color, 48)} strokeWidth="1.8" opacity=".8" fill="none" />
    <Gleam d="M120 47 Q138 49 146 42 L152 37 L146 36 Q140 44 122 44 Z" />
    {/* scallop hundido que recorre la banda en diagonal */}
    <path d="M84 46 Q104 52 122 57 L116 61 Q98 55 80 48 Z" fill={shade(color, -34)} />

    {/* viga GRIS del bastidor con ranura, del disco hacia el frente (foto) */}
    <path d="M110 71 L146 63 L151 71 L117 81 Z" fill="#4A4C53" />
    <rect x="124" y="68" width="14" height="4" rx="2" fill="#2E3036" transform="rotate(-13 131 70)" />

    {/* DISCO con ARO gris grueso en la panza de la cuña (foto) */}
    <circle cx="108" cy="70" r="10.5" fill="#3A3C42" />
    <circle cx="108" cy="70" r="7.2" fill={`url(#${uid}-body)`} stroke={shade(color, -44)} strokeWidth="1.4" />
    <circle cx="108" cy="70" r="3" fill={shade(color, -24)} />

    {/* ASIENTO: pad negro GRUESO que sube suave; la cola apenas rebasa
        la llanta trasera (foto) */}
    <path d="M138 48 Q114 43 88 39 Q70 36 60 33 Q52 30 51 36 Q50 41 58 43 Q88 51 118 54 Q131 55.5 138 55 Z"
      fill="#1B1B1F" />
    <path d="M60 37 Q96 44 132 49" stroke="rgba(255,255,255,.14)" strokeWidth="1.2" strokeDasharray="3.5 2.8" fill="none" />
    <path d="M58 33 Q94 41 134 48" stroke="#2E3036" strokeWidth="1.4" fill="none" />
    {/* ASA/riel en color bajo la cola (rasgo llamativo de la foto) */}
    <path d="M56 38 Q66 42 80 45" stroke={shade(color, -4)} strokeWidth="4" strokeLinecap="round" fill="none" />
    {/* cola: cowl negro + calavera + soporte con direccional ámbar */}
    <path d="M58 32 Q49 33 49 41 L53 48 L62 45 L60 34 Z" fill="#17171B" />
    <rect x="47" y="37" width="5" height="8" rx="2" fill="#C62E2A" />
    <path d="M54 48 L52 55" stroke="#17171B" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="51" cy="58" r="3" fill="#F9A825" />

    {/* ── tren delantero (eje en 172,97) ── */}
    <NaviWheel cx={172} cy={97} r={27} />
    {/* guardafango delantero NEGRO pegado a la llanta + labio */}
    <path d="M144 87 A 30 30 0 0 1 198 83 L200 92 L193 93 L192.5 87 A 23.5 23.5 0 0 0 150 91 Z" fill="#1E1E22" />
    <path d="M152 79 Q170 68 190 76" stroke="#34343A" strokeWidth="2" fill="none" />

    {/* horquilla NEGRA gruesa casi vertical + fuelle inferior */}
    <path d="M173 34 L174 64" stroke="#1E1E22" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M174 64 L172 96" stroke="#17171B" strokeWidth="8.5" strokeLinecap="round" fill="none" />
    <path d="M175.5 36 L176 62" stroke="#3A3A42" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M170 66 L178 68 M170 71 L178 73 M170 76 L178 78" stroke="#0E0E10" strokeWidth="2.2" strokeLinecap="round" />

    {/* máscara: pod negro angular + CRESTA en V en color + faro GRANDE */}
    <path d="M160 24 L186 17 Q199 21 200 36 L196 53 Q181 45 161 44 Z" fill="#1E1E22" />
    <path d="M162 26 L184 19 Q193 23 194 34 L190 43 Q177 31 163 36 Z"
      fill={`url(#${uid}-body)`} stroke={shade(color, -50)} strokeWidth="1" />
    <path d="M173 21.5 L180 40" stroke="#1E1E22" strokeWidth="3" />
    <circle cx="188" cy="44" r="7.5" fill="#EFEDE4" stroke="#26262C" strokeWidth="2" />
    <path d="M184 40.5 A 6 6 0 0 1 191 38.5" stroke="rgba(255,255,255,.85)" strokeWidth="1.6" fill="none" />
    <path d="M192 52 L195 59 L190 60 Z" fill="#F9A825" />

    {/* manubrio negro alto con puño, palanca y cables */}
    <path d="M172 24 L170 14" stroke="#1E1E22" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    <path d="M170 14 L152 18" stroke="#1E1E22" strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M154 17.5 L146 19.5" stroke="#0F0F12" strokeWidth="6.5" strokeLinecap="round" fill="none" />
    <path d="M150 18 L141 14" stroke="#33353B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <path d="M156 19 Q150 30 154 42" stroke="#26262C" strokeWidth="1.5" fill="none" />
    <path d="M160 20 Q156 31 159 42" stroke="#26262C" strokeWidth="1.2" fill="none" />
    {/* espejo de GOTA en color en alto (firma de la foto) + espejo bajo */}
    <path d="M165 15 L159 4" stroke="#26262C" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    <path d="M159 4.5 Q152 0 156 -2.5 Q162 -4.5 164 1 Q164 3.5 159 4.5 Z"
      fill={shade(color, -4)} stroke={shade(color, -46)} strokeWidth="1.2" />
    <path d="M159 16 L150 8" stroke="#26262C" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <ellipse cx="148" cy="7" rx="5.2" ry="3.8" fill="#1E1E22" transform="rotate(-24 148 7)" />
    <ellipse cx="148" cy="7" rx="3.2" ry="2.1" fill="#D7DAE0" transform="rotate(-24 148 7)" />
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
  // por ESTILO de carrocería (E1.1: bodyFor(vtype, model) del catálogo)
  sedan: SedanArt, hatch: HatchArt, suv: SuvArt,
  pickup: PickupArt, pickup2: Pickup2Art,
  truck: TruckArt, van: VanArt, bus: BusArt,
  moto_sport: MotoArt, moto_cub: MotoCubArt,
  mototaxi: MototaxiArt, other: OtherArt,
  // modelos ESPECÍFICOS con arte propio (capa 1 de bodyFor)
  m_navi: NaviArt,
  // compatibilidad: claves por TIPO (llamadas con solo type=)
  liviano: SedanArt, picop: PickupArt, camion: TruckArt,
  camion_ligero: VanArt, microbus: BusArt, moto: MotoArt, otro: OtherArt,
};

// Componente público:
//   <VehicleArt body={bodyFor(vtype, model)} color="#1565C0" width={280} />
// `body` (estilo de carrocería) manda; sin él cae al default del `type`.
export default function VehicleArt({ type = 'liviano', body = null, color = '#9E9E9E', width = 260, style }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const Art = ART[body] || ART[type] || OtherArt;
  return (
    <svg width={width} height={width * (150 / 240)} viewBox="0 0 240 150"
      aria-hidden style={{ display: 'block', ...style }}>
      <Defs uid={uid} color={color} />
      <Art uid={uid} color={color} />
    </svg>
  );
}
