// src/components/ui/XdArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/SCION, XD.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { XD_TRACE as T } from './xdTrace.js';

export default function XdArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.9 18.8) scale(0.1239)">
        <path d={T.black} fill={"#131313"} fillRule="evenodd" />
        <path d={T.char} fill={"#282828"} fillRule="evenodd" />
        <path d={T.silver} fill={"#B9B8B8"} fillRule="evenodd" />
        <path d={T.lightgray} fill={"#DEDDDD"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -36)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
