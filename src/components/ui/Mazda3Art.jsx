// src/components/ui/Mazda3Art.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/MAZDA, MAZDA 3.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { MAZDA3_TRACE as T } from './mazda3Trace.js';

export default function Mazda3Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.3 23.7) scale(0.1226)">
        <path d={T.black} fill={"#313335"} fillRule="evenodd" />
        <path d={T.dark} fill={"#3F4041"} fillRule="evenodd" />
        <path d={T.gray} fill={"#969696"} fillRule="evenodd" />
        <path d={T.glass} fill={"#CBCBCB"} fillRule="evenodd" />
        <path d={T.silver} fill={"#D4D4D4"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#F9F9F9"} fillRule="evenodd" />
      </g>
    </g>
  );
}
