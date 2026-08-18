// src/components/ui/NaviArt.jsx
// F6 E1.9 (18-ago-2026) — Honda Navi VECTORIZADA de la nueva referencia
// del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png; pidió:
// "ya no hace falta interpretar nada — mismas dimensiones y estructura,
// con profundidad estilo 3D y color cambiable"). CERO interpretación:
// la imagen se separó por CAPAS DE COLOR y cada capa se calcó con
// potrace (naviTrace.js, generado — ver comentario ahí; E1.9b: a
// resolución COMPLETA con filtro de mayoría 5×5 y DILATACIÓN 2px por
// capa — sin bordes rasgados ni piezas flotantes); este
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
      <g transform="translate(25.2 0.1) scale(0.1223)">
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
        {[[340, 815], [1260, 815]].map(([cx, cy]) => (
          <g key={cx}>
            <circle cx={cx} cy={cy} r={116} fill="#2A2B31" />
            <path d={`M ${cx} ${cy - 82} A 82 82 0 1 0 ${cx} ${cy - 81.98}`} fill="none"
              stroke="#45464C" strokeWidth="16" strokeDasharray="386 130" strokeDashoffset="-64"
              strokeLinecap="round" />
            <path d={`M${cx} ${cy - 104} L${cx} ${cy - 54}`} stroke="#45464C" strokeWidth="16" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={32} fill="#17181B" />
            <circle cx={cx} cy={cy} r={12} fill="#3A3B41" />
            <path d={`M ${cx - 136} ${cy - 104} A 176 176 0 0 1 ${cx + 44} ${cy - 168}`}
              stroke="rgba(255,255,255,.07)" strokeWidth="18" fill="none" strokeLinecap="round" />
          </g>
        ))}
        <circle cx={640} cy={748} r={88} fill="none" stroke="#3A3B41" strokeWidth="14" />
        <circle cx={640} cy={748} r={30} fill="#1A1B1E" />
        {/* brillos suaves: tanque, asiento y guardafango delantero */}
        <path d="M764 324 Q 884 300 992 324" stroke="rgba(255,255,255,.20)" strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M236 304 Q 424 292 560 320" stroke="rgba(255,255,255,.10)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M1132 644 Q 1244 588 1364 632" stroke="rgba(255,255,255,.08)" strokeWidth="14" fill="none" strokeLinecap="round" />
        {/* destello del lente del faro */}
        <path d="M1304 344 Q 1304 328 1320 332 L 1324 416" stroke="rgba(255,255,255,.85)" strokeWidth="12" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}
