// src/components/ui/EnArt.jsx
// F6 E1.11 (19-ago-2026) — SUZUKI, EN VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/SUZUKI, EN.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { EN_TRACE as T } from './enTrace.js';

export default function EnArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(20.3 5.1) scale(0.1298)">
        <path d={T.dark} fill="#242C30" fillRule="evenodd" />
        <path d={T.black} fill="#323538" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCED0" fillRule="evenodd" />
        <path d={T.xlight} fill="#DBDCDE" fillRule="evenodd" />
        <path d={T.blue} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.tailred} fill="#D22830" fillRule="evenodd" />
        <path d={T.amber} fill="#F0A028" fillRule="evenodd" />
      </g>
    </g>
  );
}
