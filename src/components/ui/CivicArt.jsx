// src/components/ui/CivicArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/HONDA, CIVIC.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { CIVIC_TRACE as T } from './civicTrace.js';

export default function CivicArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(25 22.8) scale(0.124)">
        <path d={T.black} fill={"#333537"} fillRule="evenodd" />
        <path d={T.dark} fill={"#3F4041"} fillRule="evenodd" />
        <path d={T.gray} fill={"#969696"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C0C0C0"} fillRule="evenodd" />
        <path d={T.glass} fill={"#D4D4D4"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -26)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#FBFAFA"} fillRule="evenodd" />
      </g>
    </g>
  );
}
