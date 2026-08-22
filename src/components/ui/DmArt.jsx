// src/components/ui/DmArt.jsx
// F6 E1.13 (22-ago-2026) — ITALIKA, DM recalcada con las
// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/ITALIKA, DM.png):
// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox
// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y
// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la
// capa de color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { DM_TRACE as T } from './dmTrace.js';

export default function DmArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.7 4.5) scale(0.1292)">
        <path d={T.dark} fill="#24282C" fillRule="evenodd" />
        <path d={T.black} fill="#343638" fillRule="evenodd" />
        <path d={T.silver} fill="#AAABAD" fillRule="evenodd" />
        <path d={T.silver15} fill="#B2B3B5" fillRule="evenodd" />
        <path d={T.silver2} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.xlight} fill="#DBDCDE" fillRule="evenodd" />
        <path d={T.darkorange} fill={shade(color, -22)} fillRule="evenodd" />
        <path d={T.orange} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.tailred} fill="#D73232" fillRule="evenodd" />
      </g>
    </g>
  );
}
