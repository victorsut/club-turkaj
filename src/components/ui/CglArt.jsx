// src/components/ui/CglArt.jsx
// F6 E1.11 (19-ago-2026) — HONDA, CGL VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, CGL.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { CGL_TRACE as T } from './cglTrace.js';

export default function CglArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(27.5 14) scale(0.1185)">
        <path d={T.tire} fill="#242628" fillRule="evenodd" />
        <path d={T.black} fill="#343638" fillRule="evenodd" />
        <path d={T.darkgray} fill="#505255" fillRule="evenodd" />
        <path d={T.gray} fill="#98999C" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.silver2} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCDD0" fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -40)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.taillight} fill="#C0272B" fillRule="evenodd" />
        <path d={T.amber} fill="#F49C1F" fillRule="evenodd" />
      </g>
    </g>
  );
}
