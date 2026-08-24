// src/components/ui/RioArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/KIA, RIO.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { RIO_TRACE as T } from './rioTrace.js';

export default function RioArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.7 21.8) scale(0.1234)">
        <path d={T.deep} fill={"#1E1E1D"} fillRule="evenodd" />
        <path d={T.dark} fill={"#323232"} fillRule="evenodd" />
        <path d={T.gray} fill={"#828181"} fillRule="evenodd" />
        <path d={T.glass} fill={"#B0B0B0"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C9C8C8"} fillRule="evenodd" />
        <path d={T.lightgray} fill={"#D5D5D5"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -13)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#F9F8F8"} fillRule="evenodd" />
      </g>
    </g>
  );
}
