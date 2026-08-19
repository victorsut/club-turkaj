// src/components/ui/DrArt.jsx
// F6 E1.11 (19-ago-2026) — SUZUKI, DR VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/SUZUKI, DR.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { DR_TRACE as T } from './drTrace.js';

export default function DrArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(18.8 -0.9) scale(0.1339)">
        <path d={T.black} fill="#32363A" fillRule="evenodd" />
        <path d={T.char} fill="#424648" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.silver2} fill="#BAC6C8" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCED0" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#F2F3F3" fillRule="evenodd" />
      </g>
    </g>
  );
}
