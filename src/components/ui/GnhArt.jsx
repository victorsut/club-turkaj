// src/components/ui/GnhArt.jsx
// F6 E1.11 (19-ago-2026) — HONDA, GN VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, GN.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { GNH_TRACE as T } from './gnhTrace.js';

export default function GnhArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(30.8 -13.5) scale(0.1403)">
        <path d={T.tire} fill="#1C1E20" fillRule="evenodd" />
        <path d={T.black} fill="#343638" fillRule="evenodd" />
        <path d={T.darkgray} fill="#545659" fillRule="evenodd" />
        <path d={T.gray} fill="#98999C" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.silver2} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.lightgray} fill="#D0D1D4" fillRule="evenodd" />
        <path d={T.xlight} fill="#DEDFE1" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.taillight} fill="#C0272B" fillRule="evenodd" />
        <path d={T.amber} fill="#F49C1F" fillRule="evenodd" />
      </g>
    </g>
  );
}
