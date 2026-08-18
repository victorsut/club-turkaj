// src/components/ui/NaviArt.jsx
// F6 E1.9 (18-ago-2026) — Honda Navi VECTORIZADA de la nueva referencia
// del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png; pidió:
// "ya no hace falta interpretar nada — mismas dimensiones y estructura,
// con profundidad estilo 3D y color cambiable"). CERO interpretación:
// la imagen se separó por CAPAS DE COLOR y cada capa se calcó con
// potrace (naviTrace.js, generado — ver comentario ahí); este
// componente solo asigna rellenos y añade la capa de PROFUNDIDAD:
// degradados verticales por material, rines detallados, aro del CVT y
// brillos suaves. Recolorear = capas red/darkred usan el degradado
// `-body` del padre y shade(); el RESORTE y la CALAVERA quedan rojos
// FIJOS (capas propias), ámbar y lentes no cambian.
import { shade } from './vehicleArtUtils.js';
import { NAVI_TRACE as T } from './naviTrace.js';

export default function NaviArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={96} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(25.2 0.1) scale(0.2446)">
        <defs>
          <linearGradient id={`${uid}-nsofa`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A3B42" />
            <stop offset="45%" stopColor="#26272C" />
            <stop offset="100%" stopColor="#191A1E" />
          </linearGradient>
          <linearGradient id={`${uid}-ngray`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4E4F57" />
            <stop offset="100%" stopColor="#34353C" />
          </linearGradient>
        </defs>

        {/* ── capas calcadas de la referencia (orden de pintado) ── */}
        <path d={T.black} fill={`url(#${uid}-nsofa)`} />
        <path d={T.darkgray} fill="#3A3B41" />
        <path d={T.midgray} fill={`url(#${uid}-ngray)`} />
        <path d={T.darkred} fill={shade(color, -34)} />
        <path d={T.red} fill={`url(#${uid}-body)`} />
        <path d={T.spring} fill="#E02A28" />
        <path d={T.taillight} fill="#D02427" />
        <path d={T.white} fill="#F2F2EF" />
        <path d={T.amber} fill="#F49C1F" />

        {/* ── PROFUNDIDAD: rines "power", CVT y brillos (encima) ── */}
        {[[170, 407], [630, 407]].map(([cx, cy]) => (
          <g key={cx}>
            <circle cx={cx} cy={cy} r={58} fill="#2A2B31" />
            <path d={`M ${cx} ${cy - 41} A 41 41 0 1 0 ${cx} ${cy - 40.99}`} fill="none"
              stroke="#45464C" strokeWidth="8" strokeDasharray="193 65" strokeDashoffset="-32"
              strokeLinecap="round" />
            <path d={`M${cx} ${cy - 52} L${cx} ${cy - 27}`} stroke="#45464C" strokeWidth="8" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={16} fill="#17181B" />
            <circle cx={cx} cy={cy} r={6} fill="#3A3B41" />
            <path d={`M ${cx - 68} ${cy - 52} A 88 88 0 0 1 ${cx + 22} ${cy - 84}`}
              stroke="rgba(255,255,255,.07)" strokeWidth="9" fill="none" strokeLinecap="round" />
          </g>
        ))}
        <circle cx={320} cy={374} r={44} fill="none" stroke="#3A3B41" strokeWidth="7" />
        <circle cx={320} cy={374} r={15} fill="#1A1B1E" />
        {/* brillos suaves: tanque, asiento y guardafango delantero */}
        <path d="M382 162 Q 442 150 496 162" stroke="rgba(255,255,255,.20)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M118 152 Q 212 146 280 160" stroke="rgba(255,255,255,.10)" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M566 322 Q 622 294 682 316" stroke="rgba(255,255,255,.08)" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* destello del lente del faro */}
        <path d="M652 172 Q 652 164 660 166 L 662 208" stroke="rgba(255,255,255,.85)" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}
