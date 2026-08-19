// src/components/ui/BoxerArt.jsx
// F6 E1.11 (19-ago-2026) — BAJAJ, BOXER VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/BAJAJ, BOXER.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { BOXER_TRACE as T } from './boxerTrace.js';

export default function BoxerArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(18.5 7.9) scale(0.1289)">
        <path d={T.tire} fill="#1E2125" fillRule="evenodd" />
        <path d={T.black} fill="#343638" fillRule="evenodd" />
        <path d={T.gray} fill="#98999C" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.silver2} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCDD0" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.taillight} fill="#D02427" fillRule="evenodd" />
        <path d={T.spring} fill="#E02A28" fillRule="evenodd" />
        <path d={T.amber} fill="#F49C1F" fillRule="evenodd" />
      </g>
    </g>
  );
}
