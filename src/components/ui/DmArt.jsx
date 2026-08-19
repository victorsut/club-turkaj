// src/components/ui/DmArt.jsx
// F6 E1.11 (19-ago-2026) — ITALIKA, DM VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/ITALIKA, DM.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { DM_TRACE as T } from './dmTrace.js';

export default function DmArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.7 4.5) scale(0.1292)">
        <path d={T.dark} fill="#24282C" fillRule="evenodd" />
        <path d={T.black} fill="#343638" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.silver2} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.xlight} fill="#DBDCDE" fillRule="evenodd" />
        <path d={T.orange} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#F2F3F3" fillRule="evenodd" />
        <path d={T.tailred} fill="#D73232" fillRule="evenodd" />
      </g>
    </g>
  );
}
