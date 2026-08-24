// src/components/ui/Cx5Art.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/MAZDA, CX-5.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { CX5_TRACE as T } from './cx5Trace.js';

export default function Cx5Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.9 23) scale(0.1214)">
        <path d={T.deep} fill={"#151513"} fillRule="evenodd" />
        <path d={T.char} fill={"#2A2A29"} fillRule="evenodd" />
        <path d={T.gray2} fill={"#3D3D3D"} fillRule="evenodd" />
        <path d={T.trim} fill={"#4F4F4E"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BEBDBD"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -25)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
