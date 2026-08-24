// src/components/ui/XbArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/SCION, XB.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { XB_TRACE as T } from './xbTrace.js';

export default function XbArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.2 15.2) scale(0.1282)">
        <path d={T.black} fill={"#1D1D1D"} fillRule="evenodd" />
        <path d={T.dark} fill={"#2D2D2C"} fillRule="evenodd" />
        <path d={T.silver} fill={"#B9B8B8"} fillRule="evenodd" />
        <path d={T.lightgray} fill={"#C8C8C8"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -40)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -16)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#F2F2F2"} fillRule="evenodd" />
      </g>
    </g>
  );
}
