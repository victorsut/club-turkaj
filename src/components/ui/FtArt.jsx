// src/components/ui/FtArt.jsx
// F6 E1.13 (22-ago-2026) — ITALIKA, FT recalcada con las
// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/ITALIKA, FT.png):
// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox
// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y
// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la
// capa de color recolorea vía el degradado -body del padre.
import { FT_TRACE as T } from './ftTrace.js';

export default function FtArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(20.1 5.8) scale(0.1327)">
        <path d={T.f1} fill="#2B3237" fillRule="evenodd" />
        <path d={T.f2} fill="#373D42" fillRule="evenodd" />
        <path d={T.f3} fill="#43494D" fillRule="evenodd" />
        <path d={T.gray} fill="#8C8D8E" fillRule="evenodd" />
        <path d={T.silver} fill="#AAABAC" fillRule="evenodd" />
        <path d={T.orange} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.tailred} fill="#D22D32" fillRule="evenodd" />
      </g>
    </g>
  );
}
