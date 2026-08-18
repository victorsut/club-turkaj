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
      {/* ty 6.6 asienta las llantas (fondo real y≈952) sobre la sombra */}
      <g transform="translate(25.2 6.6) scale(0.1223)">
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

        {/* ── PROFUNDIDAD: rines "power", CVT y brillos (encima) ──
            centros MEDIDOS del bitmap (wheels.js): trasera (283,780),
            delantera (1306,785), r≈169 — antes iban a ojo y quedaban
            descentrados (POR CORREGIR/img2.png) */}
        {[[283, 780], [1306, 785]].map(([cx, cy]) => (
          <g key={cx}>
            <circle cx={cx} cy={cy} r={103} fill="#2A2B31" />
            <path d={`M ${cx} ${cy - 73} A 73 73 0 1 0 ${cx} ${cy - 72.98}`} fill="none"
              stroke="#45464C" strokeWidth="15" strokeDasharray="344 115" strokeDashoffset="-57"
              strokeLinecap="round" />
            <path d={`M${cx} ${cy - 92} L${cx} ${cy - 46}`} stroke="#45464C" strokeWidth="15" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={28} fill="#17181B" />
            <circle cx={cx} cy={cy} r={11} fill="#3A3B41" />
            <path d={`M ${cx - 124} ${cy - 95} A 157 157 0 0 1 ${cx + 40} ${cy - 150}`}
              stroke="rgba(255,255,255,.07)" strokeWidth="16" fill="none" strokeLinecap="round" />
          </g>
        ))}
        {/* tapas del motor MEDIDAS (dbg-cvt.js): CVT (741,732) y cárter (562,756) */}
        <circle cx={741} cy={732} r={92} fill="none" stroke="#3E3F46" strokeWidth="13" />
        <circle cx={741} cy={732} r={30} fill="#1A1B1E" />
        <circle cx={562} cy={756} r={70} fill="none" stroke="#393A41" strokeWidth="11" opacity=".9" />
        <circle cx={562} cy={756} r={22} fill="#1A1B1E" />
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
