// src/components/ui/FtArt.jsx
// F6 E1.11 (19-ago-2026) — ITALIKA, FT VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/ITALIKA, FT.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { FT_TRACE as T } from './ftTrace.js';

export default function FtArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(20.2 6.2) scale(0.1323)">
        <path d={T.dark} fill="#263036" fillRule="evenodd" />
        <path d={T.char} fill="#343842" fillRule="evenodd" />
        <path d={T.char2} fill="#42464A" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.xlight} fill="#DBDCDE" fillRule="evenodd" />
        <path d={T.orange} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.tailred} fill="#D22D32" fillRule="evenodd" />
        <path d={T.amber} fill="#F0A028" fillRule="evenodd" />
      </g>
    </g>
  );
}
