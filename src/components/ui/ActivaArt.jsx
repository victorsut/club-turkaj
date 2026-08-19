// src/components/ui/ActivaArt.jsx
// F6 E1.11 (19-ago-2026) — HONDA, ACTIVA VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, ACTIVA.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { ACTIVA_TRACE as T } from './activaTrace.js';

export default function ActivaArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(15.4 1) scale(0.1326)">
        <path d={T.tire} fill="#242628" fillRule="evenodd" />
        <path d={T.black} fill="#36383A" fillRule="evenodd" />
        <path d={T.darkgray} fill="#444649" fillRule="evenodd" />
        <path d={T.gray} fill="#96989C" fillRule="evenodd" />
        <path d={T.silver} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCDD0" fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -16)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.amber} fill="#F49C1F" fillRule="evenodd" />
      </g>
    </g>
  );
}
